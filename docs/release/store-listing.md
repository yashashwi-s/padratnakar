# Store listing files

Current copy is maintained in `release-assets/listing/hi-IN/` and `release-assets/listing/en-US/`. Each language has `title.txt`, `short-description.txt`, and `full-description.txt`. Hindi is the proposed default language; English is an additional localized listing. Text covers all four collections and native sharing behavior.

Limits checked by `scripts/release/prepare-play.py`: title ≤30 characters, short description ≤80, full description ≤4,000. Console remains the final validator.

## Graphics

- Icon: `release-assets/play-icon-512.png`, 512×512 PNG, under 1 MB.
- Feature graphic: `release-assets/feature-graphic-1024x500.png`, 1024×500.
- `release-assets/screenshots/` are historical web-renderer captures, not current native phone evidence. The preparation script separates these as reference-only; do not upload them as the finished 1.0.7 screenshot set.
- Capture at least two current phone screenshots; four are preferred for this handoff: Pad Ratnakar opening pad, new search results, collection menu, Kallolini reader. Suggested 1080×1920, portrait, no debug overlays or fabricated device frames. Include the actual current app, not mockups.

Official specifications: https://support.google.com/googleplay/android-developer/answer/9866151

## Screenshot captions / alt descriptions

1. पद रत्नाकर का पद, स्पष्ट देवनागरी पाठ और पढ़ने के विकल्प।
2. संग्रह के अनुसार हिन्दी और अंग्रेज़ी अक्षरों में खोज के परिणाम।
3. पद रत्नाकर, षोडशगीत, भाईजी जयन्ती और महाभाव-कल्लोलिनी संग्रह।
4. महाभाव-कल्लोलिनी का पाठ और विषय नेविगेशन।

Review feature artwork for outdated text before upload. Do not add ratings, rankings, unsupported claims, endorsements or download badges.
