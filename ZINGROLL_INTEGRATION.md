# 🔥 ZingRoll + Hermes AI Integration Guide
# For NeuroTube AI PRO v4.0

## Step 1: Add ZingRoll Navigation Button

In `index.html`, add this button to the sidebar nav (after the AI Video button):

```html
<button onclick="switchTab('zingroll')" data-tab="zingroll" class="nav-btn w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3 text-gray-400 hover:text-white">
<i class="fas fa-bolt w-5"></i> ZingRoll
</button>
```

## Step 2: Add ZingRoll Tab Content

Copy the HTML from `zingroll-frontend.html` and paste it inside the main content div,
after the last tab-content div (after `tab-settings`).

## Step 3: Add ZingRoll JavaScript

Copy the JavaScript from `zingroll-frontend.html` and paste it before the closing
`</script>` tag in `index.html`.

## Step 4: Add Server Endpoints

Copy the contents of `zingroll-endpoints.js` and paste into `server.js` before the
system endpoints section.

## Step 5: Add ZingRoll Module

1. Copy `zingroll.js` to your project root
2. Add this require at the top of `server.js`:
```javascript
const { generateZingRoll, generateViralPackageHermes, getTrendingShortsTopics } = require('./zingroll');
```

## Step 6: Update tabTitles Object

In `index.html`, add to the `tabTitles` object:
```javascript
'zingroll': ['ZINGROLL', 'Hermes AI - Viral Shorts, Reels, TikTok'],
```

## Step 7: Update API_BASE Check (Optional)

If your API_BASE detection needs updating, ensure it works for your deployment.

## Step 8: Deploy

```bash
# Restart your server
pm2 restart server.js
# or
node server.js
```

## Hermes AI Configuration

Hermes uses OpenRouter. Make sure your `.env` has:
```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
```

Get free key at: https://openrouter.ai/keys

Hermes model on OpenRouter: `nousresearch/hermes-3-llama-3.1-405b`

If Hermes fails, it automatically falls back to rule-based generation (no API needed).

## What You Get

| Feature | Description |
|---------|-------------|
| 9:16 Vertical Video | 720x1280 optimized for Shorts/Reels/TikTok |
| Hermes AI Viral Package | Title, Description, Tags, Hashtags, Thumbnail text |
| Viral Score | 0-100 prediction by Hermes AI |
| Trending Topics | Real-time viral topic suggestions |
| Zoom/Pan Effects | Ken Burns style motion for engagement |
| Multi-Platform | YouTube Shorts, Instagram Reels, TikTok |
| One-Click Upload | Direct to YouTube Upload tab |

## API Endpoints Added

```
POST /api/zingroll/generate       - Full video + viral package
POST /api/zingroll/viral-package  - Metadata only (Hermes AI)
GET  /api/zingroll/trending       - Trending topics for Shorts
POST /api/zingroll/quick          - Quick generate from trending
```

## File Structure After Integration

```
project/
├── server.js                    (patched with ZingRoll endpoints)
├── zingroll.js                  (NEW - ZingRoll module)
├── error-agent.js               (NEW - Error fixing agent)
├── gemini-image.js              (FIXED - format detection)
├── video-assembler.js           (FIXED - validation + concat)
├── index.html                   (patched with ZingRoll UI)
├── edge-tts-wrapper.js          (existing)
├── uploads/                     (generated files)
└── data/                        (JSON databases)
```

## Testing

1. Open dashboard → Click "ZingRoll" in sidebar
2. Enter topic: "AI predicts your future"
3. Select platform: "YouTube Shorts"
4. Click "GENERATE VIRAL SHORT"
5. Wait for Hermes AI to generate viral package + video
6. Check viral score, copy title/description/hashtags
7. Download video or upload directly to YouTube
