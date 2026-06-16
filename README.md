# NeuroTube AI v3.0 — Fully Working YouTube Automation

## 🚀 What’s New in v3.0
- **Removed**: Higgsfield, ElevenLabs (paid APIs)
- **Added**: Edge-TTS (FREE, no API key), Gemini Image Gen (FREE), OpenRouter FREE model
- **New**: Full pipeline — Script → Images → Voice → Video in one click
- **New**: AI Video tab with free video generation tools comparison

## 📦 Installation

```bash
# 1. Clone and enter directory
cd neurotube

# 2. Install Node.js dependencies
npm install

# 3. Install Python edge-tts (REQUIRED for voice)
pip install edge-tts

# 4. Install ffmpeg (REQUIRED for video assembly)
# Ubuntu/Debian:
sudo apt-get install ffmpeg
# Mac:
brew install ffmpeg
# Windows: download from ffmpeg.org

# 5. Add API keys to .env
# OpenRouter: https://openrouter.ai/keys (FREE)
# Gemini: https://aistudio.google.com/app/apikey (FREE)

# 6. Start server
npm start

# 7. Open browser
# http://localhost:3000
```

## 🔑 API Keys Required

| Service | Cost | Key Location | Purpose |
|---------|------|--------------|---------|
| **OpenRouter** | FREE | openrouter.ai/keys | Script generation |
| **Gemini** | FREE | aistudio.google.com | Image generation |
| **Edge-TTS** | FREE FOREVER | No key needed! | Voice generation |
| **ffmpeg** | FREE | Install locally | Video assembly |

## 🎯 Features

### 1. Create Video (Full Pipeline)
- Enter topic → Generate script (OpenRouter)
- Generate 30 images (Gemini)
- Generate voice (Edge-TTS hi-IN-MadhurNeural)
- Assemble video (ffmpeg)
- Download MP4

### 2. Script AI
- Generate scripts in Hindi, English, Hinglish
- Templates: Hook-Story-CTA, Listicle, Before-After, Myth-Buster
- Copy, download, or use in pipeline

### 3. Image Generator
- Generate up to 4 images per call
- Types: Standalone, Video Frames, Thumbnail
- Powered by Gemini 2.0 Flash

### 4. Voice Generator
- **hi-IN-MadhurNeural** (Hindi Male) — DEFAULT
- hi-IN-SwaraNeural (Hindi Female)
- en-US-GuyNeural (English Male)
- en-US-JennyNeural (English Female)
- Adjust rate, volume, pitch
- **100% FREE, no API key**

### 5. AI Video
- Direct AI video from text
- Uses Seedance, Pollinations (free tiers)
- Comparison table of free tools

### 6. Analytics & Library
- Track all generated content
- Download any file

## 🎬 Video Creation Methods

### Method 1: Image-Based Video (RECOMMENDED — 100% Free)
1. Generate script
2. Generate 30 images from script
3. Generate voice with Edge-TTS
4. ffmpeg assembles images + voice = video
5. Result: 30-35 second video

### Method 2: AI Video (Free Tier)
- Seedance: 30 videos/month, no watermark
- Pollinations: Unlimited, no watermark
- Veo 3: Limited credits

## 🛠️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/generate-script` | Script generation |
| `POST /api/generate-images` | Image generation |
| `POST /api/generate-voice` | Voice generation |
| `POST /api/assemble-video` | Video assembly |
| `POST /api/upload-youtube` | YouTube upload |
| `POST /api/generate-ai-video` | Direct AI video |
| `POST /api/generate-thumbnail` | Thumbnail generation |
| `POST /api/generate-seo` | SEO metadata |
| `GET /api/system/health` | Health check |
| `GET /api/system/status` | System status |
| `GET /api/voices` | Voice list |
| `GET /api/scripts` | All scripts |
| `GET /api/videos` | All videos |

## 📝 .env Configuration

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key
GEMINI_API_KEY=your-gemini-key

# Optional (for YouTube upload)
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=

# Server
PORT=3000
```

## 🎤 Edge-TTS Voices (FREE)

| Voice ID | Language | Gender |
|----------|----------|--------|
| `hi-IN-MadhurNeural` | Hindi | Male ⭐ DEFAULT |
| `hi-IN-SwaraNeural` | Hindi | Female |
| `en-US-GuyNeural` | English US | Male |
| `en-US-JennyNeural` | English US | Female |
| `en-GB-RyanNeural` | English UK | Male |
| `en-IN-PrabhatNeural` | English India | Male |

## 🖼️ Gemini Image Generation

- Model: `gemini-2.0-flash-exp-image-generation`
- Free tier: Generous daily limits
- Supports: PNG output, multiple images per call
- No watermark

## ⚡ Quick Start

```bash
# 1. Install everything
npm install
pip install edge-tts

# 2. Add keys to .env
# OPENROUTER_API_KEY=...
# GEMINI_API_KEY=...

# 3. Start
npm start

# 4. Open http://localhost:3000
# 5. Click "Create Video" tab
# 6. Enter topic, click GENERATE COMPLETE VIDEO
# 7. Wait 2-3 minutes
# 8. Download your video!
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "edge-tts not found" | Run `pip install edge-tts` |
| "ffmpeg not found" | Install ffmpeg on your system |
| "OpenRouter error" | Check your API key in .env |
| "Gemini error" | Check your API key in .env |
| Images not generating | Gemini API may be rate-limited, wait and retry |

## 📄 License
MIT — Free to use, modify, distribute.

## 🙏 Credits
- OpenRouter for free LLM access
- Google Gemini for free image generation
- Microsoft for Edge-TTS (free voice synthesis)
- ffmpeg team for video processing
