
# ⚡ ZingRoll Quick Reference

## One-Line Deploy (Render/Vercel)
```bash
# 1. Add files
curl -o zingroll.js YOUR_CDN/zingroll.js
curl -o error-agent.js YOUR_CDN/error-agent.js

# 2. Patch server.js (add requires + endpoints)
# 3. Patch index.html (add nav button + tab content + JS)
# 4. Restart
```

## Environment Variables
```
OPENROUTER_API_KEY=sk-or-v1-xxx    # For Hermes AI (free)
YOUTUBE_API_KEY=xxx                 # For trending (optional)
GEMINI_API_KEY=xxx                  # For images (optional, fallback to Pollinations)
```

## Hermes Model
```javascript
const HERMES_MODEL = 'nousresearch/hermes-3-llama-3.1-405b';
```

## ZingRoll Options
```javascript
{
    platform: 'shorts',      // shorts | reels | tiktok
    duration: 30,            // 15-60 seconds
    style: 'cinematic',      // cinematic | viral | minimal | trending
    voice: 'hi-IN-MadhurNeural',
    language: 'english'
}
```

## Viral Package Output
```javascript
{
    hook: "POV: You discovered...",
    title: "SHOCKING: ...",
    titles: ["5 options"],
    description: "SEO optimized...",
    tags: ["15 tags"],
    hashtags: ["15 hashtags"],
    thumbnailText: "BOLD TEXT",
    thumbnailPrompt: "AI image prompt...",
    viralScore: 85,
    bestPostingTime: "3:00 PM EST",
    cta: "Comment YES for Part 2!",
    captions: ["3 variations"]
}
```
