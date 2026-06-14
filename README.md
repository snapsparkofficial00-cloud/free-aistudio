# 🧠 NEUROTUBE AI v2.0 — FULLY WORKING SYSTEM

## Real API Integrations | Higgsfield AI Video Generation | Self-Learning | Auto-Upgrade

---

## ⚡ QUICK START

### 1. Install Dependencies
```bash
cd neurotube-backend
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your real API keys
```

### 3. Get Your API Keys

**OpenRouter (REQUIRED for AI)**
- Go to: https://openrouter.ai/keys
- Create account → Generate key
- Paste in .env: `OPENROUTER_API_KEY=sk-or-v1-...`

**ElevenLabs (REQUIRED for Voice)**
- Go to: https://elevenlabs.io/app/settings/api-keys
- Sign up → Copy API key
- Paste in .env: `ELEVENLABS_API_KEY=...`

**YouTube Data API (OPTIONAL for Upload)**
- Go to: https://console.cloud.google.com
- Create project → Enable "YouTube Data API v3"
- Create OAuth 2.0 credentials
- Set redirect URI: `http://localhost:3000/auth/youtube/callback`
- Paste client ID/secret in .env
- Run server, visit `/auth/youtube` to connect

**Higgsfield AI (NEW — Video/Image/3D Generation)**
```bash
# Install Higgsfield CLI globally
npm install -g @higgsfield/cli

# Authenticate
higgsfield auth login

# Verify connection
higgsfield auth token
```
- Higgsfield uses CLI authentication (no API key needed in .env)
- Supports 30+ models including Veo 3.1, Kling v3.0, FLUX.2, Nano Banana Pro
- Alternatively, set `HIGGSFIELD_MODE=rest` and add `HIGGSFIELD_API_KEY`

### 4. Start the System
```bash
npm start
```

System will start at: **http://localhost:3000**

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────┐
│           FRONTEND (public/index-v2.html)   │
│     Real-time dashboard with API calls      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           BACKEND (server-v2.js)            │
│  • Express.js server                        │
│  • OpenRouter AI integration                │
│  • ElevenLabs voice synthesis               │
│  • YouTube Data API upload                  │
│  • Higgsfield AI video/image generation     │
│  • Self-learning database                   │
│  • Auto-improvement scheduler               │
└──────────────────┬──────────────────────────┘
                   │
     ┌─────────────┼─────────────┬──────────────┐
     ▼             ▼             ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│OpenRouter│  │ElevenLabs│  │ YouTube  │  │Higgsfield│
│   AI    │  │  Voice   │  │  Upload  │  │   AI     │
└─────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## 🤖 AI AGENTS (All Working with Real APIs)

| Agent | API | Function |
|-------|-----|----------|
| **ScriptMaster Pro** | OpenRouter | Generates viral scripts in Hindi/English/Hinglish |
| **VisualForge AI** | OpenRouter | Creates thumbnail concepts & title optimization |
| **VoiceSynth Pro** | ElevenLabs | Text-to-speech in multiple languages |
| **AudioWeaver** | OpenRouter | Generates music prompts for Suno/Udio |
| **CinemaAI 4K** | Pipeline | Orchestrates full video creation |
| **TrendOracle** | OpenRouter | Detects viral trends & predicts performance |
| **CompetitorSpy** | OpenRouter | Analyzes competitor strategies |
| **GrowthEngine** | OpenRouter | SEO optimization & keyword research |
| **🆕 CinemaForge AI** | Higgsfield | Text-to-Video (Veo 3.1, Kling v3.0, Wan 2.7) |
| **🆕 VisualSynth AI** | Higgsfield | Text-to-Image (FLUX.2, Nano Banana Pro) |
| **🆕 ViralPredictor** | Higgsfield | Brain Activity virality analysis |
| **🆕 ShortsForge AI** | Higgsfield | Auto-reframe to Shorts + virality check |

---

## 🎬 HIGGSFIELD AI INTEGRATION

### What Higgsfield Adds

1. **AI Video Generation** — Create professional videos from text prompts
   - Models: Google Veo 3.1, Kling v3.0, Seedance 2.0, Wan 2.7, MiniMax Hailuo
   - Durations: 5s, 10s, 15s
   - Resolutions: 720p, 1080p, 2K, 4K
   - Aspect Ratios: 16:9, 9:16, 4:3, 3:4, 1:1

2. **AI Image Generation** — Create thumbnails, banners, avatars
   - Models: Nano Banana Pro, FLUX.2, GPT Image 2, Recraft V4.1
   - Resolutions: 1K, 2K, 4K
   - Quality: Basic, High

3. **Virality Predictor** — Analyze finished videos for viral potential
   - Brain Activity model scans video content
   - Scores: Hook strength, attention, retention, viral potential
   - Actionable improvement suggestions

4. **YouTube Shorts Creation** — Auto-convert long videos to Shorts
   - Reframe from 16:9 to 9:16
   - AI-enhanced vertical video
   - Virality analysis on shorts version

5. **Soul ID (Character Training)** — Train consistent AI characters
   - Upload 3+ reference images
   - Generate consistent character across videos/images
   - Perfect for channel hosts, mascots, avatars

6. **Advanced Workflows**
   - Draw-to-Video: Edit video from sketch frames
   - Reframe: Change aspect ratio of existing videos
   - 3D Generation: Create 3D models from images

### Higgsfield API Endpoints

```
GET  /api/higgsfield/status              → Check Higgsfield connection
GET  /api/higgsfield/models              → List available models

POST /api/higgsfield/video/generate      → Text-to-Video
POST /api/higgsfield/video/image-to-video → Image-to-Video

POST /api/higgsfield/image/generate      → Text-to-Image
POST /api/higgsfield/image/edit          → Image-to-Image

POST /api/higgsfield/analyze/virality    → Virality analysis

POST /api/higgsfield/workflow/reframe    → Reframe video
POST /api/higgsfield/workflow/draw-to-video → Draw-to-video

POST /api/higgsfield/soul-id/train       → Train character
POST /api/higgsfield/soul-id/generate    → Generate with Soul ID

POST /api/higgsfield/3d/generate         → 3D from images

POST /api/higgsfield/broll               → Generate B-roll
POST /api/higgsfield/thumbnail           → Generate thumbnail
POST /api/higgsfield/shorts              → Create Shorts
POST /api/higgsfield/intro               → Generate intro
POST /api/higgsfield/avatar              → Generate avatar
POST /api/higgsfield/predict-virality    → Predict virality

POST /api/higgsfield/cost                → Estimate cost
GET  /api/higgsfield/jobs/:jobId         → Check job status
```

### Higgsfield Agent Endpoints (Integrated into AI Fleet)

```
POST /api/agents/cinemaforge     → Generate AI video
POST /api/agents/visualsynth     → Generate AI image
POST /api/agents/viralpredictor  → Analyze video virality (requires upload)
POST /api/agents/shortsforge     → Create Shorts (requires upload)
```

---

## 🧠 SELF-LEARNING SYSTEM

The system automatically:

1. **Tracks Performance** — Every script, video, and trend is stored in JSON databases
2. **Analyzes Patterns** — Identifies what content performs best
3. **Improves Prompts** — Uses past data to optimize future AI generations
4. **Auto-Upgrades** — Runs every 24 hours via `/api/system/self-improve`
5. **Evolves Templates** — Learns from successful content to improve templates
6. **Higgsfield Optimization** — Tracks best models/settings for video generation

Database files stored in `/data/`:
- `learning_db.json` — Optimization rules & patterns
- `performance_db.json` — Content performance tracking
- `prompt_evolution.json` — Prompt template improvements
- `trend_history.json` — Trend detection history
- `competitor_db.json` — Competitor analysis data
- `system_state.json` — System metrics & errors
- `higgsfield_db.json` — Higgsfield generation history

---

## 📡 API ENDPOINTS

### AI Agents
```
POST /api/agents/script          → Generate script (OpenRouter)
POST /api/agents/thumbnail       → Generate thumbnail concepts
POST /api/agents/voice           → Generate voice (ElevenLabs)
GET  /api/agents/voices          → List available voices
POST /api/agents/trends          → Analyze trends
POST /api/agents/competitor      → Competitor analysis
POST /api/agents/growth          → SEO optimization
POST /api/agents/music           → Music generation prompts
POST /api/agents/cinemaforge     → Generate AI video (Higgsfield) 🆕
POST /api/agents/visualsynth     → Generate AI image (Higgsfield) 🆕
POST /api/agents/viralpredictor  → Analyze virality (Higgsfield) 🆕
POST /api/agents/shortsforge     → Create Shorts (Higgsfield) 🆕
```

### Pipeline
```
POST /api/pipeline/generate      → Full video pipeline (all agents)
```
*Now includes optional Higgsfield AI video generation when `generateVideo: true`*

### YouTube
```
GET  /auth/youtube               → Connect YouTube account
GET  /auth/youtube/callback      → OAuth callback
POST /api/youtube/upload         → Upload video
GET  /api/youtube/analytics      → Get analytics
GET  /api/youtube/channel        → Get channel info
```

### Higgsfield (Full API)
```
GET  /api/higgsfield/status
GET  /api/higgsfield/models
POST /api/higgsfield/video/generate
POST /api/higgsfield/video/image-to-video
POST /api/higgsfield/image/generate
POST /api/higgsfield/image/edit
POST /api/higgsfield/analyze/virality
POST /api/higgsfield/workflow/reframe
POST /api/higgsfield/workflow/draw-to-video
POST /api/higgsfield/soul-id/train
POST /api/higgsfield/soul-id/generate
POST /api/higgsfield/3d/generate
POST /api/higgsfield/broll
POST /api/higgsfield/thumbnail
POST /api/higgsfield/shorts
POST /api/higgsfield/intro
POST /api/higgsfield/avatar
POST /api/higgsfield/predict-virality
POST /api/higgsfield/cost
GET  /api/higgsfield/jobs/:jobId
```

### System
```
GET  /api/system/status          → System status & metrics
GET  /api/system/health          → Health check
POST /api/system/self-improve    → Trigger self-improvement
GET  /api/analytics/dashboard    → Dashboard analytics
```

---

## 🔒 SECURITY NOTES

- **NEVER commit `.env` to Git** — it contains your API keys
- **OpenRouter key** — Keep it secret. If exposed, revoke immediately at openrouter.ai
- **YouTube OAuth** — Refresh token is sensitive. Store securely
- **Higgsfield CLI** — Uses local auth token (stored in `~/.higgsfield/`). Never share this directory
- The backend validates all inputs and never exposes keys to frontend

---

## 🚀 DEPLOYMENT

### Local Development
```bash
npm run dev    # Uses nodemon for auto-restart
```

### Production (VPS/Cloud)
```bash
# Using PM2
npm install -g pm2
pm2 start server-v2.js --name "neurotube"
pm2 save
pm2 startup

# Using Docker (create Dockerfile)
docker build -t neurotube .
docker run -p 3000:3000 --env-file .env neurotube
```

### Environment Variables for Production
```env
PORT=3000
NODE_ENV=production
OPENROUTER_API_KEY=your-key
ELEVENLABS_API_KEY=your-key
YOUTUBE_CLIENT_ID=your-id
YOUTUBE_CLIENT_SECRET=your-secret
YOUTUBE_REFRESH_TOKEN=your-token
HIGGSFIELD_MODE=cli
YOUR_SITE_URL=https://yourdomain.com
```

---

## 📝 WHAT THIS SYSTEM DOES

1. **Generate Scripts** — AI writes complete YouTube scripts with timestamps, B-roll cues, and emotional direction in Hindi, English, or Hinglish
2. **Generate Voice** — Converts script to professional voiceover using ElevenLabs
3. **Create Thumbnails** — Generates viral thumbnail concepts with CTR predictions
4. **Generate AI Videos** — Creates professional videos from text using Higgsfield (Veo 3.1, Kling v3.0, etc.)
5. **Generate AI Images** — Creates thumbnails, banners, avatars using FLUX.2, Nano Banana Pro
6. **Analyze Trends** — Detects what's trending and predicts viral potential
7. **Competitor Intel** — Tracks competitors and identifies content gaps
8. **SEO Optimize** — Optimizes titles, descriptions, tags, and hashtags
9. **Predict Virality** — Analyzes finished videos for viral potential before publishing
10. **Create Shorts** — Auto-converts long videos to YouTube Shorts
11. **Upload to YouTube** — Direct upload with metadata optimization
12. **Self-Improve** — Automatically learns from performance and improves over time

---

## 🎯 HIGGSFIELD SETUP TROUBLESHOOTING

### "Higgsfield CLI not found"
```bash
npm install -g @higgsfield/cli
# Or if using npx:
npx @higgsfield/cli auth login
```

### "Not authenticated"
```bash
higgsfield auth login
# Follow the browser prompt to authenticate
higgsfield auth token  # Verify
```

### "Command not found" (Linux/Mac)
```bash
# Add to PATH if installed globally
export PATH="$PATH:$(npm root -g)/@higgsfield/cli/bin"
# Or use full path
/path/to/node_modules/.bin/higgsfield auth login
```

### Using REST API instead of CLI
```bash
# In .env:
HIGGSFIELD_MODE=rest
HIGGSFIELD_API_KEY=your-api-key-from-higgsfield.ai
```

---

## 📁 FILE STRUCTURE

```
neurotube-backend/
├── server-v2.js           # Main Express server (v2.0 with Higgsfield)
├── higgsfield.js          # Higgsfield client module
├── higgsfield-routes.js   # Higgsfield Express routes
├── package.json           # Dependencies
├── .env.example           # Environment template
├── .env                   # Your API keys (NEVER COMMIT)
├── public/
│   └── index-v2.html      # Frontend dashboard
├── uploads/               # Generated files
│   └── higgsfield/        # Higgsfield outputs
└── data/                  # Self-learning databases
    ├── learning_db.json
    ├── performance_db.json
    ├── prompt_evolution.json
    ├── trend_history.json
    ├── competitor_db.json
    ├── system_state.json
    └── higgsfield_db.json
```

---

Built with ❤️ by NeuroTube AI v2.0
