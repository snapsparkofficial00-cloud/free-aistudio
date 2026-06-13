# 🧠 NEUROTUBE AI — FULLY WORKING SYSTEM

## Real API Integrations | Self-Learning | Auto-Upgrade

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

### 4. Start the System
```bash
npm start
```

System will start at: **http://localhost:3000**

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────┐
│           FRONTEND (public/index.html)      │
│     Real-time dashboard with API calls      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           BACKEND (server.js)               │
│  • Express.js server                        │
│  • OpenRouter AI integration                │
│  • ElevenLabs voice synthesis               │
│  • YouTube Data API upload                  │
│  • Self-learning database                   │
│  • Auto-improvement scheduler               │
└──────────────────┬──────────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│OpenRouter│  │ElevenLabs│  │ YouTube  │
│   AI    │  │  Voice   │  │  Upload  │
└─────────┘  └──────────┘  └──────────┘
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

---

## 🧠 SELF-LEARNING SYSTEM

The system automatically:

1. **Tracks Performance** — Every script, video, and trend is stored in JSON databases
2. **Analyzes Patterns** — Identifies what content performs best
3. **Improves Prompts** — Uses past data to optimize future AI generations
4. **Auto-Upgrades** — Runs every 24 hours via `/api/system/self-improve`
5. **Evolves Templates** — Learns from successful content to improve templates

Database files stored in `/data/`:
- `learning_db.json` — Optimization rules & patterns
- `performance_db.json` — Content performance tracking
- `prompt_evolution.json` — Prompt template improvements
- `trend_history.json` — Trend detection history
- `competitor_db.json` — Competitor analysis data
- `system_state.json` — System metrics & errors

---

## 📡 API ENDPOINTS

### AI Agents
```
POST /api/agents/script      → Generate script (OpenRouter)
POST /api/agents/thumbnail   → Generate thumbnail concepts
POST /api/agents/voice       → Generate voice (ElevenLabs)
GET  /api/agents/voices      → List available voices
POST /api/agents/trends      → Analyze trends
POST /api/agents/competitor  → Competitor analysis
POST /api/agents/growth      → SEO optimization
POST /api/agents/music       → Music generation prompts
```

### Pipeline
```
POST /api/pipeline/generate  → Full video pipeline (all agents)
```

### YouTube
```
GET  /auth/youtube           → Connect YouTube account
GET  /auth/youtube/callback  → OAuth callback
POST /api/youtube/upload     → Upload video
GET  /api/youtube/analytics  → Get analytics
GET  /api/youtube/channel    → Get channel info
```

### System
```
GET  /api/system/status      → System status & metrics
GET  /api/system/health      → Health check
POST /api/system/self-improve → Trigger self-improvement
GET  /api/analytics/dashboard → Dashboard analytics
```

---

## 🔒 SECURITY NOTES

- **NEVER commit `.env` to Git** — it contains your API keys
- **OpenRouter key** — Keep it secret. If exposed, revoke immediately at openrouter.ai
- **YouTube OAuth** — Refresh token is sensitive. Store securely
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
pm2 start server.js --name "neurotube"
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
YOUR_SITE_URL=https://yourdomain.com
```

---

## 📝 WHAT THIS SYSTEM DOES

1. **Generate Scripts** — AI writes complete YouTube scripts with timestamps, B-roll cues, and emotional direction in Hindi, English, or Hinglish
2. **Generate Voice** — Converts script to professional voiceover using ElevenLabs
3. **Create Thumbnails** — Generates viral thumbnail concepts with CTR predictions
4. **Analyze Trends** — Detects what's trending and predicts viral potential
5. **Competitor Intel** — Tracks competitors and identifies content gaps
6. **SEO Optimize** — Optimizes titles, descriptions, tags, and hashtags
7. **Upload to YouTube** — Direct upload with metadata optimization
8. **Self-Improve** — Automatically learns from performance and improves over time

---

## 🎯 NEXT STEPS TO MAKE IT COMPLETE

To add real video generation, integrate:
- **Runway ML** (https://runwayml.com) — AI video generation
- **Pika Labs** (https://pika.art) — Text-to-video
- **Suno AI** (https://suno.ai) — AI music generation (use AudioWeaver prompts)
- **DALL-E 3 / Midjourney** — Image generation for thumbnails

---

Built with ❤️ by NeuroTube AI
