const fs = require('fs');
const originalMatch = String.prototype.match;
String.prototype.match = function (regexp) {
  if (typeof regexp === 'string') regexp = regexp.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  return originalMatch.call(this, regexp);
};
eval(fs.readFileSync(require('path').resolve(__dirname,'vendor/chanakya2Unicode.cjs'), 'utf8'));
// Retain the exact inherited replacement table; replace only its broken
// prebase-i and single-character reph positioning loops with cluster rules.
let source=chanakyaToUnicode.toString().replace(/_0xbb6f\[(\d+)\]/g,(_,n)=>JSON.stringify(_0xbb6f[+n]));
const cut=source.indexOf('for(var _0xc67ex8=');
if(cut<0) throw new Error('Inherited positioning-loop signature changed');
source=source.slice(0,cut).replace('function chanakyaToUnicode(', 'function chanakyaClusterDecode(')+String.raw`
 _0xc67ex5=_0xc67ex5.replace(/Z/g,'üं');
 // PDF pad992 stores prebase-i, spacing, reph, then base: rendered देवर्षि.
 _0xc67ex5=_0xc67ex5.replace(/ç[ \t]*ü([क-ह]़?(?:्[क-ह]़?)*)/g,'र्$1ि');
 _0xc67ex5=_0xc67ex5.replace(/ç([क-ह]़?(?:्[क-ह]़?)*)/g,'$1ि');
 _0xc67ex5=_0xc67ex5.replace(/([क-ह]़?(?:्[क-ह]़?)*[ािीुूृॄॅॆेैॉॊोौॢॣंःँ]*)ü/g,'र्$1');
 return _0xc67ex5;
}`;
eval(source);

const records = JSON.parse(fs.readFileSync(0, 'utf8'));
for (const record of records) {
 const input=record.converterInput || record.legacy;
 record.decodedInherited=chanakyaToUnicode(input);
 record.decoded=chanakyaClusterDecode(input);
}
process.stdout.write(JSON.stringify(records));
