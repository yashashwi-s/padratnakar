#!/usr/bin/env python3
"""Sign built Android artifacts. Secrets remain local; never print their contents.
Usage: python3 scripts/release/sign.py --private-dir /secure/path --output /release/path [--create-key]
Requires JAVA_HOME and ANDROID_HOME; create-key is explicit and never overwrites keys.
"""
import argparse, hashlib, os, secrets, shutil, subprocess
from pathlib import Path
p = argparse.ArgumentParser()
p.add_argument('--private-dir', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--create-key', action='store_true')
a = p.parse_args()
private = a.private_dir.resolve(); out = a.output.resolve()
root = Path(__file__).resolve().parents[2]
if private.is_relative_to(root): raise SystemExit('Keep signing material outside the repository.')
private.mkdir(parents=True, exist_ok=True, mode=0o700); private.chmod(0o700)
out.mkdir(parents=True, exist_ok=True)
key = private/'release.p12'; password = private/'password.txt'
env = os.environ.copy()
java = Path(env['JAVA_HOME'])/'bin'
tools = sorted((Path(env['ANDROID_HOME'])/'build-tools').iterdir(), key=lambda p:tuple(int(x) for x in p.name.split('.') if x.isdigit()))[-1]
def run(args): subprocess.run([str(x) for x in args], check=True, env=env, stdout=subprocess.DEVNULL)
if a.create_key:
    if key.exists() or password.exists(): raise SystemExit('Refusing to replace existing signing material.')
    with password.open('x') as f: f.write(secrets.token_urlsafe(48))
    password.chmod(0o600)
    env['PAD_SIGN_PASSWORD'] = password.read_text()
    run([java/'keytool','-genkeypair','-keystore',key,'-storetype','PKCS12','-alias','padratnakar','-keyalg','RSA','-keysize','4096','-validity','10000','-dname','CN=Pad Ratnakar','-storepass:env','PAD_SIGN_PASSWORD','-keypass:env','PAD_SIGN_PASSWORD'])
    key.chmod(0o600)
else:
    if not key.exists() or not password.exists(): raise SystemExit('Signing material missing; explicit --create-key required for first release.')
    env['PAD_SIGN_PASSWORD'] = password.read_text()
apk = out/'pad-ratnakar-1.0.0.apk'; bundle = out/'pad-ratnakar-1.0.0.aab'
unsigned = root/'android/app/build/outputs/apk/release/app-release-unsigned.apk'
run([tools/'zipalign','-f','-p','4',unsigned,apk])
run([tools/'apksigner','sign','--ks',key,'--ks-key-alias','padratnakar','--ks-pass','env:PAD_SIGN_PASSWORD','--key-pass','env:PAD_SIGN_PASSWORD',apk])
shutil.copy2(root/'android/app/build/outputs/bundle/release/app-release.aab',bundle)
run([java/'jarsigner','-keystore',key,'-storepass:env','PAD_SIGN_PASSWORD','-keypass:env','PAD_SIGN_PASSWORD','-sigalg','SHA256withRSA','-digestalg','SHA-256',bundle,'padratnakar'])
run([tools/'apksigner','verify',apk]); run([java/'jarsigner','-verify',bundle])
run([java/'keytool','-exportcert','-rfc','-keystore',key,'-alias','padratnakar','-storepass:env','PAD_SIGN_PASSWORD','-file',out/'signing-certificate.pem'])
(out/'SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256(f.read_bytes()).hexdigest()}  {f.name}\n' for f in (apk,bundle)))
print('Signed and verified APK/AAB. Private key and password are outside the release package.')
