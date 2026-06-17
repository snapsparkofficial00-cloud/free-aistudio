
// ============================================================
// ZINGROLL ENDPOINTS - YouTube Shorts / Reels / TikTok
// ============================================================

const { 
    generateZingRoll, 
    generateViralPackageHermes, 
    getTrendingShortsTopics 
} = require('./zingroll');

/**
 * POST /api/zingroll/generate
 * Generate complete vertical video with viral package
 */
app.post('/api/zingroll/generate', async (req, res) => {
    try {
        const { 
            topic, 
            platform = 'shorts',
            duration = 30,
            style = 'cinematic',
            voice = 'hi-IN-MadhurNeural',
            language = 'english'
        } = req.body;

        if (!topic) {
            return res.status(400).json({
                success: false,
                error: 'Topic is required',
                code: 'MISSING_TOPIC'
            });
        }

        console.log(`[ZingRoll API] Generating ${platform} video: "${topic}"`);

        const result = await generateZingRoll(topic, {
            platform,
            duration: Math.min(duration, 60), // max 60s for Shorts
            style,
            voice,
            outputDir: uploadsDir,
            language,
            generateViralPackage: true
        });

        if (!result.success) {
            throw new Error(result.error || 'ZingRoll generation failed');
        }

        // Save to database
        const videos = readDB('videos');
        videos.unshift({
            id: Date.now(),
            type: 'zingroll',
            topic,
            platform,
            duration: result.video.duration,
            videoUrl: result.video.videoUrl,
            thumbnailUrl: result.files.thumbnail?.url,
            viralPackage: result.viralPackage,
            script: result.script,
            sizeMB: result.video.sizeMB,
            createdAt: new Date().toISOString()
        });
        writeDB('videos', videos.slice(0, 50));

        res.json({
            success: true,
            message: `ZingRoll ${platform} video created!`,
            video: result.video,
            viralPackage: result.viralPackage,
            script: result.script,
            files: result.files,
            suggestions: {
                title: result.viralPackage?.title,
                description: result.viralPackage?.description,
                tags: result.viralPackage?.tags,
                hashtags: result.viralPackage?.hashtags,
                thumbnailText: result.viralPackage?.thumbnailText,
                bestTime: result.viralPackage?.bestPostingTime,
                cta: result.viralPackage?.cta,
                captions: result.viralPackage?.captions
            }
        });

    } catch (error) {
        console.error('[ZingRoll API] Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'ZINGROLL_ERROR',
            suggestion: 'Try with a different topic or shorter duration'
        });
    }
});

/**
 * POST /api/zingroll/viral-package
 * Generate only viral metadata (no video)
 */
app.post('/api/zingroll/viral-package', async (req, res) => {
    try {
        const { topic, platform = 'shorts', language = 'english' } = req.body;

        if (!topic) {
            return res.status(400).json({ success: false, error: 'Topic required' });
        }

        const viralPackage = await generateViralPackageHermes(topic, platform, language);

        res.json({
            success: true,
            topic,
            platform,
            viralPackage
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/zingroll/trending
 * Get trending topics for Shorts/Reels
 */
app.get('/api/zingroll/trending', async (req, res) => {
    try {
        const { region = 'US', category = 'general', limit = 10 } = req.query;
        const topics = await getTrendingShortsTopics(region, category);

        res.json({
            success: true,
            topics: topics.slice(0, parseInt(limit)),
            region,
            category,
            updatedAt: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/zingroll/quick
 * Quick generate with trending topic
 */
app.post('/api/zingroll/quick', async (req, res) => {
    try {
        const { trendingIndex = 0, platform = 'shorts' } = req.body;
        const topics = await getTrendingShortsTopics();

        if (!topics[trendingIndex]) {
            return res.status(400).json({ success: false, error: 'Invalid trending index' });
        }

        const topic = topics[trendingIndex].topic;
        const result = await generateZingRoll(topic, { platform, outputDir: uploadsDir });

        res.json({
            success: result.success,
            topic,
            video: result.video,
            viralPackage: result.viralPackage,
            trendingScore: topics[trendingIndex].score
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
