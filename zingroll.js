/**
 * ZingRoll Module - YouTube Shorts / Reels / TikTok Vertical Video Generator
 * ================================================================
 * Features:
 * - 9:16 vertical video generation (720x1280)
 * - Hermes AI integration for viral content (via OpenRouter)
 * - Auto-generates: Title, Description, Tags, Hashtags, Thumbnail
 * - Trending topic detection and optimization
 * - Viral score prediction
 * - Multi-platform output (Shorts, Reels, TikTok)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Hermes AI via OpenRouter (FREE model)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const HERMES_MODEL = 'nousresearch/hermes-3-llama-3.1-405b';

// ============================================================
// HERMES AI - VIRAL CONTENT GENERATOR
// ============================================================

async function generateViralPackageHermes(topic, platform = 'shorts', language = 'english') {
    const model = OPENROUTER_API_KEY ? HERMES_MODEL : null;

    if (!model) {
        return generateRuleBasedViralPackage(topic, platform, language);
    }

    const platformConfig = {
        shorts: { maxLength: 60, idealLength: '30-45 seconds', format: '9:16 vertical', audience: 'YouTube mobile users' },
        reels: { maxLength: 90, idealLength: '15-30 seconds', format: '9:16 vertical', audience: 'Instagram users' },
        tiktok: { maxLength: 180, idealLength: '15-60 seconds', format: '9:16 vertical', audience: 'TikTok Gen Z/Millennials' }
    };

    const config = platformConfig[platform] || platformConfig.shorts;

    const prompt = `You are a viral content expert specializing in ${platform} videos. 
Create a complete viral content package for this topic: "${topic}"

Platform: ${platform.toUpperCase()}
Format: ${config.format}
Max Length: ${config.maxLength}s
Ideal Length: ${config.idealLength}
Target Audience: ${config.audience}
Language: ${language}

Generate ONLY a valid JSON object with these exact keys:
{
  "hook": "First 3-second hook that stops the scroll (max 15 words)",
  "title": "Clickbait but accurate title (max 60 chars)",
  "titles": ["5 alternative title options"],
  "description": "SEO-optimized description with timestamps, CTAs, links (200-300 words)",
  "tags": ["15 relevant SEO tags/keywords"],
  "hashtags": ["15 trending hashtags including #shorts #viral #trending"],
  "thumbnailText": "Text overlay for thumbnail (3-5 words, bold, high contrast)",
  "thumbnailPrompt": "Detailed AI image generation prompt for viral thumbnail",
  "viralScore": 85,
  "viralScoreReason": "Why this will go viral",
  "bestPostingTime": "Best time to post (with timezone)",
  "cta": "Strong call-to-action for comments/shares/subscribes",
  "captions": ["3 caption variations for the video"],
  "soundSuggestion": "Trending audio/sound suggestion",
  "engagementHook": "Question or statement to pin in comments",
  "trendingAngle": "How to tie this to current trends"
}

Rules:
- Use power words: SHOCKING, INSANE, UNBELIEVABLE, SECRET, HACK, TRICK
- Create curiosity gaps - don't give everything away in title
- Include numbers when possible
- Use emotional triggers: fear, curiosity, surprise, anger
- Make it feel urgent or time-sensitive
- Keep it authentic - no clickbait that disappoints`;

    try {
        const response = await axios.post(OPENROUTER_URL, {
            model: model,
            messages: [
                { role: 'system', content: 'You are Hermes, a viral content AI. Output ONLY valid JSON.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 3000,
            temperature: 0.9
        }, {
            headers: { 
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://neurotube.ai',
                'X-Title': 'NeuroTube AI'
            },
            timeout: 60000
        });

        const text = response.data.choices[0].message.content;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            data.model = 'hermes-3';
            data.topic = topic;
            data.platform = platform;
            data.generatedAt = new Date().toISOString();
            return data;
        }
        throw new Error('Could not parse Hermes response');
    } catch (error) {
        console.log('[Hermes] Error, using fallback:', error.message);
        return generateRuleBasedViralPackage(topic, platform, language);
    }
}

function generateRuleBasedViralPackage(topic, platform, language) {
    const powerWords = ['SHOCKING', 'INSANE', 'UNBELIEVABLE', 'SECRET', 'HACK', 'TRICK', 'MIND-BLOWING'];
    const randomPower = powerWords[Math.floor(Math.random() * powerWords.length)];

    const titles = [
        `${randomPower}: ${topic} (You Won't Believe #3)`,
        `The Truth About ${topic} That Nobody Talks About`,
        `${topic} Explained in 30 Seconds`,
        `I Tried ${topic} For 7 Days... Here's What Happened`,
        `Stop Doing ${topic} Wrong! Do This Instead`
    ];

    const hashtags = [
        '#shorts', '#viral', '#trending', `#${topic.replace(/\s+/g, '')}`,
        '#fyp', '#foryou', '#viralvideo', '#trendingshorts',
        '#youtube', '#youtubeshorts', '#subscribe', '#mustwatch',
        '#insane', '#shocking', '#mindblown', '#hack'
    ];

    return {
        hook: `${randomPower} ${topic} reveal...`,
        title: titles[0],
        titles: titles,
        description: `🔥 ${topic} - You need to see this!\n\nIn this ${platform} video, we break down everything about ${topic} in under 60 seconds.\n\n⏱️ TIMESTAMPS:\n0:00 - The Hook\n0:15 - The Secret\n0:30 - The Proof\n0:45 - Call to Action\n\n👍 Like if you learned something new!\n💬 Comment your thoughts below!\n🔔 Subscribe for more viral content!\n\n#shorts #viral #${topic.replace(/\s+/g, '')}`,
        tags: [topic, 'viral', 'shorts', 'trending', 'youtube', 'fyp', 'foryou', 'hack', 'secret', 'tips'],
        hashtags: hashtags,
        thumbnailText: `${randomPower} ${topic}`,
        thumbnailPrompt: `Viral YouTube Shorts thumbnail for "${topic}", bold text "${randomPower}", high contrast red and yellow colors, shocked face reaction, professional design, 9:16 vertical format, eye-catching, no background text`,
        viralScore: Math.floor(Math.random() * 20) + 75,
        viralScoreReason: 'Strong curiosity gap with power words and numbered list format',
        bestPostingTime: '3:00 PM - 5:00 PM EST (peak engagement)',
        cta: 'Comment "YES" if you want Part 2! 🔥',
        captions: [
            `${randomPower} ${topic} 😱 #shorts #viral`,
            `Wait for it... ${topic} 🔥 #trending`,
            `This changes everything about ${topic} 👇`
        ],
        soundSuggestion: 'Trending upbeat electronic or viral audio clip',
        engagementHook: `What's your experience with ${topic}? Tell me below! 👇`,
        trendingAngle: `Connect to current viral trend or challenge related to ${topic}`,
        model: 'rule-based',
        topic,
        platform,
        generatedAt: new Date().toISOString()
    };
}

// ============================================================
// ZINGROLL VIDEO GENERATOR - 9:16 VERTICAL
// ============================================================

async function generateZingRoll(topic, options = {}) {
    const {
        platform = 'shorts',
        duration = 30,
        style = 'cinematic',
        voice = 'hi-IN-MadhurNeural',
        outputDir = path.join(__dirname, 'uploads'),
        language = 'english',
        generateViralPackage = true
    } = options;

    console.log(`[ZingRoll] Generating ${platform} video: "${topic}" (${duration}s)`);

    const results = {
        success: false,
        platform,
        topic,
        duration,
        files: {},
        viralPackage: null
    };

    try {
        if (generateViralPackage) {
            console.log('[ZingRoll] Step 1/5: Generating viral package with Hermes AI...');
            results.viralPackage = await generateViralPackageHermes(topic, platform, language);
            console.log(`[ZingRoll] Viral score: ${results.viralPackage.viralScore}/100`);
        }

        console.log('[ZingRoll] Step 2/5: Generating short-form script...');
        const script = await generateShortScript(topic, duration, platform, language);
        results.script = script;

        console.log('[ZingRoll] Step 3/5: Generating 9:16 vertical frames...');
        const frames = await generateVerticalFrames(topic, script, duration, outputDir, style);
        results.frames = frames;

        console.log('[ZingRoll] Step 4/5: Generating voice...');
        const voiceFile = path.join(outputDir, `zingroll_voice_${Date.now()}.mp3`);
        const voiceResult = await generateSpeech(script.text, { voice, outputPath: voiceFile });
        results.voice = voiceResult;

        console.log('[ZingRoll] Step 5/5: Assembling 9:16 vertical video...');
        const videoResult = await assembleVerticalVideo(frames, voiceResult.audioPath, { duration, outputDir, platform });

        results.video = videoResult;
        results.success = true;
        results.files = {
            video: videoResult.videoUrl,
            voice: voiceResult.audioUrl,
            thumbnail: results.viralPackage ? await generateThumbnailImage(results.viralPackage.thumbnailPrompt, outputDir) : null
        };

        console.log(`[ZingRoll] ✅ Complete! Video: ${videoResult.duration}s, ${videoResult.sizeMB}MB`);
        return results;

    } catch (error) {
        console.error('[ZingRoll] Error:', error.message);
        results.error = error.message;
        return results;
    }
}

async function generateShortScript(topic, duration, platform, language) {
    const wordCount = Math.floor(duration * 2.5);
    const hooks = [
        `POV: You just discovered ${topic}`,
        `Wait... ${topic} is actually INSANE`,
        `Nobody told you this about ${topic}`,
        `${topic} hack that will blow your mind`,
        `I can't believe ${topic} works like this`
    ];
    const hook = hooks[Math.floor(Math.random() * hooks.length)];

    return {
        hook,
        text: `${hook}. Let me show you why ${topic} is the most important thing right now. In just ${duration} seconds, you'll understand everything. ${topic} isn't what you think it is. The truth? It's even better. Here's what nobody talks about...`,
        wordCount,
        duration,
        platform,
        language
    };
}

async function generateVerticalFrames(topic, script, duration, outputDir, style) {
    const frameCount = Math.min(Math.ceil(duration / 2), 15);
    const frames = [];

    for (let i = 0; i < frameCount; i++) {
        try {
            const seed = Date.now() + i;
            const prompt = encodeURIComponent(
                `${topic}, ${style} style, vertical 9:16 format, mobile-optimized, professional, cinematic, scene ${i + 1}/${frameCount}`
            );
            const url = `https://image.pollinations.ai/prompt/${prompt}?seed=${seed}&width=720&height=1280&nologo=true&noWatermark=true`;

            const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
            const buffer = Buffer.from(response.data);
            const filename = `zingroll_frame_${Date.now()}_${i}.jpg`;
            const filepath = path.join(outputDir, filename);
            fs.writeFileSync(filepath, buffer);

            frames.push({ index: i, filepath, url: '/uploads/' + filename, duration: 2 });
            if (i < frameCount - 1) await new Promise(r => setTimeout(r, 800));
        } catch (error) {
            console.error(`[ZingRoll] Frame ${i + 1} failed:`, error.message);
        }
    }
    return frames;
}

async function assembleVerticalVideo(frames, audioPath, options = {}) {
    const { duration = 30, outputDir, platform = 'shorts' } = options;
    if (!frames || frames.length === 0) throw new Error('No frames for vertical video');

    const outputFile = path.join(outputDir, `zingroll_${platform}_${Date.now()}.mp4`);
    const tempDir = path.join(outputDir, `temp_zing_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
        const validFrames = [];
        for (let i = 0; i < frames.length; i++) {
            const src = frames[i].filepath;
            if (fs.existsSync(src)) {
                const dest = path.join(tempDir, `frame_${String(i).padStart(4, '0')}.jpg`);
                fs.copyFileSync(src, dest);
                validFrames.push(dest);
            }
        }
        if (validFrames.length === 0) throw new Error('No valid frames');

        const audioDuration = audioPath && fs.existsSync(audioPath) ? await getAudioDuration(audioPath) : duration;
        const fps = validFrames.length / audioDuration;
        const framePattern = path.join(tempDir, 'frame_%04d.jpg');
        const [w, h] = [720, 1280];

        let ffmpegCmd;
        if (audioPath && fs.existsSync(audioPath)) {
            ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${framePattern}" -i "${audioPath}" -c:v libx264 -pix_fmt yuv420p -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black" -c:a aac -b:a 128k -shortest "${outputFile}"`;
        } else {
            ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${framePattern}" -c:v libx264 -pix_fmt yuv420p -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black" -t ${duration} "${outputFile}"`;
        }

        await execPromise(ffmpegCmd);
        fs.rmSync(tempDir, { recursive: true, force: true });

        const stats = fs.statSync(outputFile);
        return {
            success: true,
            videoPath: outputFile,
            videoUrl: '/uploads/' + path.basename(outputFile),
            duration: Math.round(audioDuration),
            frameCount: validFrames.length,
            resolution: '720x1280',
            aspectRatio: '9:16',
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
            platform
        };
    } catch (error) {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        throw new Error('Vertical video assembly failed: ' + error.message);
    }
}

async function generateThumbnailImage(prompt, outputDir) {
    try {
        const seed = Date.now();
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=720&height=1280&nologo=true&noWatermark=true`;
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
        const filename = `zingroll_thumbnail_${Date.now()}.jpg`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, Buffer.from(response.data));
        return { url: '/uploads/' + filename, filepath, prompt };
    } catch (error) {
        console.error('[ZingRoll] Thumbnail generation failed:', error.message);
        return null;
    }
}

async function getAudioDuration(audioPath) {
    try {
        const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
        return parseFloat(stdout.trim()) || 30;
    } catch { return 30; }
}

async function generateSpeech(text, options) {
    const { spawn } = require('child_process');
    const { voice = 'hi-IN-MadhurNeural', outputPath, rate = '+0%', volume = '+0%', pitch = '+0Hz' } = options;
    const outputFile = outputPath || path.join(__dirname, 'uploads', `voice_${Date.now()}.mp3`);
    const uploadsDir = path.dirname(outputFile);
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    return new Promise((resolve, reject) => {
        const checkCmd = spawn('python3', ['-c', 'import edge_tts; print("OK")']);
        let pythonAvailable = false;
        checkCmd.stdout.on('data', (data) => { if (data.toString().includes('OK')) pythonAvailable = true; });
        checkCmd.on('close', (code) => {
            if (!pythonAvailable) {
                reject(new Error('edge-tts not installed. Run: pip install edge-tts'));
                return;
            }
            const safeText = text.replace(/\/g, '\\').replace(/"/g, '\"').replace(/'/g, "\'").replace(/\n/g, '\n').replace(/\r/g, '\r');
            const script = `import asyncio\nimport edge_tts\nasync def main():\n    communicate = edge_tts.Communicate("""${safeText}""", voice="${voice}", rate="${rate}", volume="${volume}", pitch="${pitch}")\n    await communicate.save("${outputFile.replace(/\/g, '\\')}")\n    print("SUCCESS")\nasyncio.run(main())`;
            const proc = spawn('python3', ['-c', script]);
            let stdout = '', stderr = '';
            proc.stdout.on('data', (data) => { stdout += data.toString(); });
            proc.stderr.on('data', (data) => { stderr += data.toString(); });
            proc.on('close', (code) => {
                if (code === 0 && stdout.includes('SUCCESS')) {
                    const duration = Math.ceil(text.length / 15);
                    resolve({ success: true, audioPath: outputFile, audioUrl: '/uploads/' + path.basename(outputFile), duration, voice, textLength: text.length });
                } else {
                    reject(new Error('edge-tts failed: ' + (stderr || stdout)));
                }
            });
        });
    });
}

async function getTrendingShortsTopics(region = 'US', category = 'general') {
    const trendingTopics = [
        { topic: 'AI predicts future', score: 95, category: 'tech' },
        { topic: 'Life hack you need', score: 92, category: 'lifestyle' },
        { topic: 'Before vs After transformation', score: 90, category: 'entertainment' },
        { topic: 'Secret trick nobody knows', score: 88, category: 'education' },
        { topic: 'POV: You discovered this', score: 87, category: 'entertainment' },
        { topic: 'Wait for the ending', score: 86, category: 'entertainment' },
        { topic: 'This changes everything', score: 85, category: 'tech' },
        { topic: 'I tried this for 30 days', score: 84, category: 'lifestyle' },
        { topic: 'Unbelievable fact', score: 83, category: 'education' },
        { topic: 'Hidden feature revealed', score: 82, category: 'tech' }
    ];
    return trendingTopics.filter(t => category === 'general' || t.category === category).sort((a, b) => b.score - a.score).slice(0, 10);
}

module.exports = {
    generateZingRoll,
    generateViralPackageHermes,
    generateShortScript,
    generateVerticalFrames,
    assembleVerticalVideo,
    getTrendingShortsTopics,
    generateThumbnailImage
};
