# Shodash audio

The supplied SG.zip contains 18 original MP3s, totalling 86,599,795 bytes (about 89 minutes). Audio bytes are unchanged. `src/data/shodash-audio.json` records each original filename, duration, byte count and SHA-256. Local assets are in `public/audio/shodash/`.

The user-confirmed mapping is 00 → Vandana, 01–15 → songs 1–15, 17 → song 16, and 18 → Pushpika (route index 17). There is no missing recording.

## Playback

The transport occupies the right side of the bottom navigation. Play downloads an uncached recording before playing; a small download badge on the same button becomes a percentage ring during transfer. Pause preserves position. The divider seeks, with elapsed time at the left and total duration at the right, below the bar in the beige footer; times appear after playback starts, and the dot stays hidden during ordinary playback and appears with a time bubble while seeking. The seek control suppresses touch highlights and long-press callouts while retaining keyboard focus feedback. Control positions remain fixed while local availability is checked.

While playing, changing Shodash pages loads and plays the new recording. While paused, changing pages stays paused. End-of-track uses the reader’s slide transition and advances until Pushpika, then stops without wrapping. Leaving the reader or the Shodash collection stops audio. Background/lock-screen playback is disabled: native activity state and document visibility pause playback and cancel pending transfers. Returning to the foreground requires an explicit Play tap.

`src/lib/audio/lifecycle.js` binds native and browser visibility with stale-state protection and listener cleanup. `src/lib/audio/controller.js` owns playback intent and cancels obsolete downloads. `AudioTransport` alone subscribes to time events, avoiding whole-reader renders. Download size and SHA-256 are verified before saving. Failed downloads and blocked browser autoplay show a retry message.

## Hosting and offline storage

The web build serves `/audio/shodash/*.mp3`. These files are intentionally excluded from the service-worker precache: installing the reader does not download 87 MB of audio. Browser recordings are retained in a dedicated Cache Storage cache and requested as persistent storage where supported. Browsers may still evict storage or the user may clear it; a recording can then be downloaded again.

Native recordings are fetched from `https://raw.githubusercontent.com/yashashwi-s/padratnakar/main/public/audio/shodash/` and saved in application data, not the temporary cache. Public audio CORS headers are configured in `vercel.json`. **Push the verified audio assets to the public repository before distributing a native build that uses them.** Local testing does not publish these URLs.

`npm run native:sync` builds with `--mode native`, excludes the audio directory from the native payload, then synchronizes Capacitor. Do not use a normal web build followed by `cap sync` for this release: it would bundle the recordings. The ordinary web build retains the recordings for hosting.

## Verification

`tests/audio.test.mjs` verifies file identity and numbering, bookmark identity, play/pause/navigation, obsolete download races, retry, seeking, and the final stop. Run `npm run check`. Native builds still need Android/iPhone device checks for filesystem persistence, playback policies, interruptions and seeking.

Android checks media volume when Play is tapped and uses a quiet toast if it is at or below 20%. Browser and iOS system volume are not inferred. Long-press copy also uses a short visible toast. The audio controls remain outside the reading-page floral frame.

Availability for all 18 recordings is indexed using local file metadata. Cache checks are silent; playback intent keeps the pause icon stable between cached tracks. A progress ring appears only for an actual download, with no transient preparation notice.

Download progress updates are limited to whole percentages and identical controller states do not notify React. Availability changes are published only when they change. Downloads use one size-bounded receive buffer rather than retaining all chunks alongside a second combined copy.
