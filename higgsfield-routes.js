// ============================================================
// NEUROTUBE AI — HIGGSFIELD API ROUTES
// Express.js routes for Higgsfield video/image/3D generation
// ============================================================

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    HiggsfieldClient,
    HIGGSFIELD_CONFIG,
    generateBRoll,
    generateThumbnail,
    generateChannelAvatar,
    predictVirality,
    createShorts,
    generateIntro,
} = require('./higgsfield');

const router = express.Router();

// Multer config for file uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'higgsfield');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
    fileFilter: (req, file, cb) => {
        const allowed = /\.(mp4|mov|avi|png|jpg|jpeg|webp|gif)$/i;
        if (allowed.test(file.originalname)) cb(null, true);
        else cb(new Error('Only video and image files allowed'));
    }
});

// ============================================================
// HEALTH & STATUS
// ============================================================

// GET /api/higgsfield/status — Check Higgsfield connection
router.get('/status', async (req, res) => {
    try {
        const hf = new HiggsfieldClient();
        let accountInfo = null;

        if (hf.isAuthenticated) {
            try {
                accountInfo = await hf.getAccountInfo();
            } catch (e) {
                accountInfo = { error: e.message };
            }
        }

        res.json({
            success: true,
            authenticated: hf.isAuthenticated,
            mode: HIGGSFIELD_CONFIG.mode,
            models: {
                video: Object.keys(HIGGSFIELD_CONFIG.models.video).length,
                image: Object.keys(HIGGSFIELD_CONFIG.models.image).length,
                analysis: Object.keys(HIGGSFIELD_CONFIG.models.analysis).length,
                three_d: Object.keys(HIGGSFIELD_CONFIG.models.three_d).length,
            },
            account: accountInfo,
            uploadsDir,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/higgsfield/models — List available models
router.get('/models', async (req, res) => {
    try {
        const hf = new HiggsfieldClient();

        if (!hf.isAuthenticated) {
            // Return static model list if not authenticated
            return res.json({
                success: true,
                authenticated: false,
                models: HIGGSFIELD_CONFIG.models,
                note: 'Authenticate with Higgsfield to see live model catalog'
            });
        }

        const liveModels = await hf.listModels();

        res.json({
            success: true,
            authenticated: true,
            models: liveModels,
            staticModels: HIGGSFIELD_CONFIG.models,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// VIDEO GENERATION
// ============================================================

// POST /api/higgsfield/video/generate — Text-to-Video
router.post('/video/generate', async (req, res) => {
    try {
        const {
            prompt,
            model = 'veo3_1',
            duration = 5,
            resolution = '1080p',
            aspectRatio = '16:9',
            mode = 'std',
            sound = 'off',
            genre,
            negativePrompt,
        } = req.body;

        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        const hf = new HiggsfieldClient();
        if (!hf.isAuthenticated) {
            return res.status(503).json({ 
                success: false, 
                error: 'Higgsfield not authenticated. Run: higgsfield auth login or set HIGGSFIELD_API_KEY',
                setup: 'Install CLI: npm install -g @higgsfield/cli && higgsfield auth login'
            });
        }

        console.log('🎬 API: Generating video...');
        const result = await hf.generateVideo(prompt, {
            model,
            duration,
            resolution,
            aspectRatio,
            mode,
            sound,
            genre,
            negativePrompt,
            wait: true,
        });

        // Track in database
        if (global.DB && global.DB.performance) {
            global.DB.performance.videos.push({
                id: Date.now(),
                type: 'higgsfield_video',
                prompt,
                model,
                duration,
                resolution,
                result: result.result_url || result.url,
                timestamp: new Date().toISOString(),
                status: 'completed',
            });
            if (global.saveDB && global.DB_PATHS) {
                global.saveDB(global.DB_PATHS.performance, global.DB.performance);
            }
        }

        res.json({
            success: true,
            jobId: result.job_id,
            status: result.status,
            videoUrl: result.result_url || result.url,
            model,
            duration,
            resolution,
            aspectRatio,
            prompt,
            cost: result.cost,
            raw: result,
        });

    } catch (error) {
        console.error('❌ Video generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/higgsfield/video/image-to-video — Image-to-Video
router.post('/video/image-to-video', upload.single('image'), async (req, res) => {
    try {
        const {
            prompt,
            model = 'kling3_0',
            duration = 5,
            resolution = '1080p',
            aspectRatio = '16:9',
            mode = 'std',
            sound = 'off',
        } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Image file required' });
        }
        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        const hf = new HiggsfieldClient();
        if (!hf.isAuthenticated) {
            return res.status(503).json({ 
                success: false, 
                error: 'Higgsfield not authenticated',
                setup: 'Install CLI: npm install -g @higgsfield/cli && higgsfield auth login'
            });
        }

        console.log('🎬 API: Generating video from image...');
        const result = await hf.generateVideoFromImage(req.file.path, prompt, {
            model, duration, resolution, aspectRatio, mode, sound, wait: true,
        });

        res.json({
            success: true,
            jobId: result.job_id,
            videoUrl: result.result_url || result.url,
            model,
            prompt,
            sourceImage: req.file.filename,
            raw: result,
        });

    } catch (error) {
        console.error('❌ Image-to-video error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// IMAGE GENERATION
// ============================================================

// POST /api/higgsfield/image/generate — Text-to-Image
router.post('/image/generate', async (req, res) => {
    try {
        const {
            prompt,
            model = 'nano_banana_2',
            resolution = '2k',
            aspectRatio = '16:9',
            quality = 'high',
        } = req.body;

        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        const hf = new HiggsfieldClient();
        if (!hf.isAuthenticated) {
            return res.status(503).json({ 
                success: false, 
                error: 'Higgsfield not authenticated',
                setup: 'Install CLI: npm install -g @higgsfield/cli && higgsfield auth login'
            });
        }

        console.log('🎨 API: Generating image...');
        const result = await hf.generateImage(prompt, {
            model, resolution, aspectRatio, quality, wait: true,
        });

        res.json({
            success: true,
            jobId: result.job_id,
            imageUrl: result.result_url || result.url,
            model,
            resolution,
            aspectRatio,
            quality,
            prompt,
            raw: result,
        });

    } catch (error) {
        console.error('❌ Image generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/higgsfield/image/edit — Image-to-Image
router.post('/image/edit', upload.single('image'), async (req, res) => {
    try {
        const {
            prompt,
            model = 'nano_banana_2_edit',
            resolution = '2k',
            aspectRatio = '16:9',
            quality = 'high',
        } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Image file required' });
        }
        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        const hf = new HiggsfieldClient();
        if (!hf.isAuthenticated) {
            return res.status(503).json({ 
                success: false, 
                error: 'Higgsfield not authenticated',
                setup: 'Install CLI: npm install -g @higgsfield/cli && higgsfield auth login'
            });
        }

        console.log('🎨 API: Editing image...');
        const result = await hf.generateImageFromImage(req.file.path, prompt, {
            model, resolution, aspectRatio, quality, wait: true,
        });

        res.json({
            success: true,
            jobId: result.job_id,
            imageUrl: result.result_url || result.url,
            model,
            prompt,
            sourceImage: req.file.filename,
            raw: result,
        });

    } catch (error) {
        console.error('❌ Image edit error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// VIRALITY ANALYZER
// ============================================================

// POST /api/higgsfield/analyze/virality — Analyze video viral potential
router.post('/analyze/virality', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Video file required' });
        }

        const hf = new HiggsfieldClient();
        if (!hf.isAuthenticated) {
            return res.status(503).json({ 
                success: false, 
                error: 'Higgsfield not authenticated',
                setup: 'Install CLI: npm install -g @higgsfield/cli && higgsfield auth login'
            });
        }

        console.log('🧠 API: Analyzing virality...');
        const result = await hf.analyzeVirality(req.file.path, { wait: true });

        res.json({
            success: true,
            analysis: {
                overallScore: result.overall_score || result.viral_score || 0,
                hookStrength: result.hook_strength || 0,
                attentionScore: result.attention || 0,
                retentionPrediction: result.retention || 0,
                viralPotential: result.viral_potential || 0,
                reportUrl: result.report_url || result.open_report_url,
            },
            suggestions: generateSuggestions(result),
            shouldPublish: (result.overall_score || result.viral_score || 0) >= 7,
            raw: result,
        });

    } catch (error) {
        console.error('❌ Virality analysis error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

function generateSuggestions(result) {
    const suggestions = [];
    const scores = {
        hook: result.hook_strength || 0,
        attention: result.attention || 0,
        retention: result.retention || 0,
        viral: result.viral_potential || 0,
    };

    if (scores.hook < 7) suggestions.push('First 3 seconds need stronger hook — add curiosity gap or shocking fact');
    if (scores.attention < 6) suggestions.push('Attention drops predicted — add visual surprise in first 5s');
    if (scores.retention < 6) suggestions.push('Retention risk — add pattern interrupts every 30 seconds');
    if (scores.viral < 7) suggestions.push('Viral potential moderate — add emotional peak or shareable moment');
    if (scores.hook >= 8 && scores.viral >= 8) suggestions.push('Excellent viral potential! Consider posting during peak hours.');

    return suggestions;
}

// ============================================================
// WORKFLOWS
// ============================================================

// POST /api/higgsfield/workflow/reframe — Reframe video aspect ratio
router.post('/workflow/reframe', upload.single('video'), async (req, res) => {
    try {
        const {
            aspectRatio = '9:16',
            resolution = '720p',
        } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Video file required' });
        }

        const hf = new HiggsfieldClient();
        if (!hf.isAuthenticated) {
            return res.status(503).json({ 
                success: false, 
                error: 'Higgsfield not authenticated',
                setup: 'Install CLI: npm install -g @higgsfield/cli && higgsfield auth login'
            });
        }

        console.log(`🔄 API: Reframing video to ${aspectRatio}...`);
        const result = await hf.reframeVideo(req.file.path, aspectRatio, resolution, { wait: true });

        res.json({
            success: true,
            jobId: result.job_id,
            videoUrl: result.result_url || result.url,
            aspectRatio,
            resolution,
            sourceVideo: req.file.filename,
            raw: result,
        });

    } catch (error) {
        console.error('❌ Reframe error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/higgsfield/workflow/draw-to-video — Edit video from sketch
router.post('/workflow/draw-to-video', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'sketch', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            timestamp,
            prompt,
        } = req.body;

        if (!req.files?.video || !req.files?.sketch) {
            return res.status(400).json({ success: false, error: 'Both video and sketch files required' });
        }
        if (!timestamp || !prompt) {
            return res.status(400).json({ success: false, error: 'Timestamp and prompt required' });
        }

        const hf = new HiggsfieldClient();
        if (!hf.isAuthenticated) {
            return res.status(503).json({ 
                success: false, 
                error: 'Higgsfield not authenticated',
                setup: 'Install CLI: npm install -g @higgsfield/cli && higgsfield auth login'
            });
        }

        console.log('✏️ API: Draw-to-video workflow...');
        const result = await hf.drawToVideo(
            req.files.video[0].path,
            req.files.sketch[0].path,
            parseFloat(timestamp),
            prompt,
            { wait: true }
        );

        res.json({
            success: true,
            jobId: result.job_id,
            videoUrl: result.result_url || result.url,
            timestamp,
            prompt,
            raw: result,
        });

    } catch (error) {
        console.error('❌ Draw-to-video error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// SOUL ID (CHARACTER TRAINING)
// ============================================================

// POST /api/higgsfield/soul-id/train — Train Soul ID character
router.post('/soul-id/train', upload.array('images', 10), async (req, res) => {
    try {
        const {
            name,
            soulV2 = true,
        } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Character name required' });
        }
        if (!req.files || req.files.length < 3) {
            return res.status(400).json({ success: false, error: 'At least 3 reference images required' });
        }

        const hf = new HiggsfieldClient();
        if (!hf.isAuthenticated) {
            return res.status(503).json({ 
                success: false, 
                error: 'Higgsfield not authenticated',
                setup: 'Install CLI: npm install -g @higgsfield/cli && higgsfield auth login'
            });
        }

        console.log(`👤 API: Training Soul ID "${name}"...`);
        const imagePaths = req.files.map(f => f.path);
        const result = await hf.trainSoulId(name, imagePaths, { soulV2: soulV2 === 'true', wait: true });

        res.json({
            success: true,
            soulId: result.soul_id,
            name,
            status: result.status,
            imagesUsed: req.files.length,
            raw: result,
        });

    } catch (error) {
        console.error('❌ Soul ID training error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/higgsfield/soul-id/generate — Generate with Soul ID
router.post('/soul-id/generate', async (req, res) => {
    try {
        const {
            soulId,
            prompt,
            model = 'text2image_soul_v2',
            resolution = '2k',
            aspectRatio = '16:9',
        } = req.body;

        if (!soulId || !prompt) {
            return res.status(400).json({ success: false, error: 'soulId and prompt required' });
        }

        const hf = new HiggsfieldClient();
        if (!hf.isAuthenticated) {
            return res.status(503).json({ 
                success: false, 
                error: 'Higgsfield not authenticated',
                setup: 'Install CLI: npm install -g @higgsfield/cli && higgsfield auth login'
            });
        }

        console.log(`👤 API: Generating with Soul ID ${soulId}...`);
        const result = await hf.generateWithSoulId(soulId, prompt, {
            model, resolution, aspectRatio, wait: true,
        });

        res.json({
            success: true,
            jobId: result.job_id,
            imageUrl: result.result_url || result.url,
            soulId,
            prompt,
            raw: result,
        });

    } catch (error) {
        console.error('❌ Soul ID generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// 3D GENERATION
// ============================================================

// POST /api/higgsfield/3d/generate — Generate 3D from images
router.post('/3d/generate', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).json({ success: false, error: 'At least 2 images required for 3D generation' });
        }

        const hf = new HiggsfieldClient();
        if (!hf.isAuthenticated) {
            return res.status(503).json({ 
                success: false, 
                error: 'Higgsfield not authenticated',
                setup: 'Install CLI: npm install -g @higgsfield/cli && higgsfield auth login'
            });
        }

        console.log('🧊 API: Generating 3D model...');
        const imagePaths = req.files.map(f => f.path);
        const result = await hf.generate3D(imagePaths, { wait: true });

        res.json({
            success: true,
            jobId: result.job_id,
            modelUrl: result.result_url || result.url,
            imagesUsed: req.files.length,
            raw: result,
        });

    } catch (error) {
        console.error('❌ 3D generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// NEUROTUBE INTEGRATION — HIGH-LEVEL ENDPOINTS
// ============================================================

// POST /api/higgsfield/broll — Generate B-roll for script segment
router.post('/broll', async (req, res) => {
    try {
        const {
            description,
            duration = 3,
            style = 'cinematic',
            aspectRatio = '16:9',
        } = req.body;

        if (!description) {
            return res.status(400).json({ success: false, error: 'Description is required' });
        }

        const result = await generateBRoll(description, { duration, style, aspectRatio });

        res.json({
            success: true,
            broll: result,
        });

    } catch (error) {
        console.error('❌ B-roll generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/higgsfield/thumbnail — Generate YouTube thumbnail
router.post('/thumbnail', async (req, res) => {
    try {
        const {
            topic,
            style = 'viral youtube thumbnail',
            aspectRatio = '16:9',
            resolution = '2k',
        } = req.body;

        if (!topic) {
            return res.status(400).json({ success: false, error: 'Topic is required' });
        }

        const result = await generateThumbnail(topic, { style, aspectRatio, resolution });

        res.json({
            success: true,
            thumbnail: result,
        });

    } catch (error) {
        console.error('❌ Thumbnail generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/higgsfield/shorts — Convert video to YouTube Shorts
router.post('/shorts', upload.single('video'), async (req, res) => {
    try {
        const {
            targetDuration = 60,
            highlightTimestamp,
        } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Video file required' });
        }

        const result = await createShorts(req.file.path, {
            targetDuration: parseInt(targetDuration),
            highlightTimestamp: highlightTimestamp ? parseFloat(highlightTimestamp) : null,
        });

        res.json({
            success: true,
            shorts: result,
        });

    } catch (error) {
        console.error('❌ Shorts creation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/higgsfield/intro — Generate channel intro
router.post('/intro', async (req, res) => {
    try {
        const {
            channelName,
            brandColors = ['#00f3ff', '#bc13fe'],
            duration = 5,
            style = 'modern minimal',
        } = req.body;

        if (!channelName) {
            return res.status(400).json({ success: false, error: 'Channel name is required' });
        }

        const result = await generateIntro(channelName, brandColors, { duration, style });

        res.json({
            success: true,
            intro: result,
        });

    } catch (error) {
        console.error('❌ Intro generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/higgsfield/avatar — Generate channel avatar with Soul ID
router.post('/avatar', upload.array('images', 5), async (req, res) => {
    try {
        const {
            characterDescription,
            soulId,
        } = req.body;

        if (!characterDescription) {
            return res.status(400).json({ success: false, error: 'Character description is required' });
        }

        const imagePaths = req.files ? req.files.map(f => f.path) : [];

        const result = await generateChannelAvatar(characterDescription, imagePaths, { soulId });

        res.json({
            success: true,
            avatar: result,
        });

    } catch (error) {
        console.error('❌ Avatar generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/higgsfield/predict-virality — Predict video virality
router.post('/predict-virality', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Video file required' });
        }

        const result = await predictVirality(req.file.path);

        res.json({
            success: true,
            prediction: result,
        });

    } catch (error) {
        console.error('❌ Virality prediction error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// COST ESTIMATION
// ============================================================

// POST /api/higgsfield/cost — Estimate generation cost
router.post('/cost', async (req, res) => {
    try {
        const {
            model,
            duration,
            resolution,
            aspectRatio,
        } = req.body;

        if (!model) {
            return res.status(400).json({ success: false, error: 'Model is required' });
        }

        const hf = new HiggsfieldClient();
        const cost = await hf.estimateCost(model, { duration, resolution, aspectRatio });

        res.json({
            success: true,
            cost,
        });

    } catch (error) {
        console.error('❌ Cost estimation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// STREAMING / PROGRESS ENDPOINTS (WebSocket ready)
// ============================================================

// GET /api/higgsfield/jobs/:jobId — Check job status
router.get('/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;

        const hf = new HiggsfieldClient();
        if (!hf.isAuthenticated) {
            return res.status(503).json({ success: false, error: 'Higgsfield not authenticated' });
        }

        const result = await hf._waitForJob(jobId, 1000, 1000); // Quick poll

        res.json({
            success: true,
            jobId,
            status: result.status,
            result: result.status === 'completed' ? {
                url: result.result_url || result.url,
            } : null,
            raw: result,
        });

    } catch (error) {
        // If it's a timeout, job is still running
        if (error.message.includes('timed out')) {
            return res.json({
                success: true,
                jobId: req.params.jobId,
                status: 'processing',
                message: 'Job is still processing',
            });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
