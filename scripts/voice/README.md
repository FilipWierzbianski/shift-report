# Agent voice

The agent's scripted lines are pre-recorded with neural voices, so the prototype speaks with no API key and no cost.

1. `node --experimental-strip-types --no-warnings scripts/voice/lines.mts` collects every line the agent says (EN, and PL through `src/lib/pl.json`) into `lines.json`.
2. `python -m venv .venv && .venv/bin/pip install edge-tts && .venv/bin/python scripts/voice/gen.py` writes `public/voice/*.mp3` and `manifest.json` (en-GB-SoniaNeural, pl-PL-ZofiaNeural).

edge-tts uses Microsoft's free read-aloud voices: fine for a prototype; a product would use a licensed TTS (ElevenLabs is wired in `src/app/api/tts` for lines without a recording).
