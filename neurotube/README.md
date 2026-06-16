# Neurotube Minimal Free Pipeline

This project provides a minimal, fully offline, free pipeline to generate a simple script, create placeholder images, synthesize voice, and assemble a video using `ffmpeg`.

It is intended as a free replacement prototype you can later swap for Groq/Gemini/Edge integrations.

Usage:

1. Install dependencies:

```bash
python -m pip install -r requirements.txt
# Install ffmpeg (Linux): sudo apt install ffmpeg
```

2. Run a test (offline):

```bash
python -m neurotube.pipeline --topic "How to grow mango" --skip-upload
```

Outputs are saved under `outputs/`.
