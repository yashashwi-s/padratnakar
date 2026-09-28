# Focused text review

Start `python3 tools/text-review/server.py --port 8767`, then open http://127.0.0.1:8767.

The curated `data/collections/mahabhav-kallolini/human-questions.json` contains only readings unresolved after visual inspection. Never import the raw OCR disagreement queue here: proofreading belongs to the assistant.

One correction box, debounced autosave, explicit accept/unsure actions, Ctrl/Cmd+Enter to accept and advance, Alt+arrows to move. Navigation waits for successful save. Answers persist in `.review/text-decisions.sqlite3` outside tracked corpus. `/api/export` exports questions and decisions. Production text changes require reconciliation of these decisions with their source lines; the tool does not silently rewrite it.

Run `python3 tools/text-review/test_server.py` to verify insert/update persistence and unknown-item rejection against a temporary database. No user answers are altered by tests.
