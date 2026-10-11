# Reader borders

All 25 original vector border studies were approved together by the owner on October 11, 2026. The production catalogue and SVG geometry live in `src/lib/reader-borders.js`; `FloralFrame.jsx` renders the chosen frame inside the positioned page SVG.

## Behaviour

- Every collection uses the same interleaved sequence of 25 designs, offset by collection identity. Each pad position has a stable design across navigation, reopening and sharing. Each complete block of 25 positions contains the full set.
- The 26-unit band has equal thickness on all four edges. Ornaments are clipped to that band; a fine inner rule and clear text margin separate artwork from the source-positioned lines.
- The frame moves with vertical scrolling and inner-page pinch zoom. Short pages extend the white interior and frame down to the footer without stretching verses or stanza spacing.
- The white circular share/bookmark controls stay in sticky screen chrome. Their positions and the footer icon baseline are consistent across collections; Shodash audio timestamps use the separate lane below its progress bar.
- Native PNG exports include the complete frame and text, excluding screen controls. Native idle image preparation and the two-picture cache remain in place. Web/PWA sharing still sends text and the canonical link.

## Performance and verification

The SVG uses local definitions for recurring flowers, leaves, birds and both edge strips. Four sides reuse two edge definitions. The React frame is memoized and rebuilds only when the design or page geometry changes. All artwork ships offline as code, with no downloaded images or new storage service.

`tests/reader-borders.test.mjs` checks balanced assignment and self-contained SVG references across all 25 designs, including long pages. Release verification exported all 25 borders and an actual reader page through the same PNG routine used by native sharing, and checked stationary controls while scrolling the longest pad.

## Visual references

The owner's supplied Satsang Sudha card informed the repeated pink floral frame. Additional contemporary references inspected were [Hita Ambrish's official home](https://www.hitaambrish.com/home), [Hita Ras Dhara discourse artwork](https://hitaras.hitaambrish.com/), [Radha Keli Kunj Vaani Path](https://radhakelikunj.com/vaani-path/) and its [official channel index](https://radhakelikunj.com/official-youtube-channels/).

The accepted catalogue includes roses, ivory flowers, climbing vines, stylised birds, peacock feathers, cut-paper-inspired ornament, ochre paisleys and garlands. These are original ornamental interpretations; flower/bird names do not establish botanical accuracy or historical provenance. The production gallery and temporary export-check page were removed after approval and verification.
