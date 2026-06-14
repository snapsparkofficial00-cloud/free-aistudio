// ============================================================
// NEUROTUBE AI — HIGGSFIELD INTEGRATION MODULE
// Real API: Higgsfield CLI / REST API for Video, Image, 3D Generation
// Models: Veo 3.1, Kling v3.0, Seedance 2.0, Wan 2.7, Nano Banana Pro, FLUX.2
// Features: Text-to-Video, Image-to-Video, Text-to-Image, Virality Predictor,
//           Soul ID (character training), Draw-to-Video, Reframe, 3D Generation
// ============================================================

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// ============================================================
// HIGGSFIELD CONFIGURATION
// ============================================================
const HIGGSFIELD_CONFIG = {
    // API Mode: 'cli' (local Higgsfield CLI) or 'rest' (Higgsfield Cloud API)
    mode: process.env.HIGGSFIELD_MODE || 'cli',

    // CLI Configuration
    cli: {
        binary: process.env.HIGGSFIELD_CLI_PATH || 'higgsfield', // or 'hf'
        timeout: 600000, // 10 minutes for video generation
    },

    // REST API Configuration (if using cloud API directly)
    rest: {
        baseUrl: process.env.HIGGSFIELD_API_URL || 'https://api.higgsfield.ai',
        apiKey: process.env.HIGGSFIELD_API_KEY,
        timeout: 300000,
    },

    // Model mappings
    models: {
        // Video Models
        video: {
            veo3_1: 'veo3_1',           // Google Veo 3.1 — best quality
            veo3_1_lite: 'veo3_1_lite', // Google Veo 3.1 Lite — faster
            kling3_0: 'kling3_0',       // Kling v3.0 — cinematic
            seedance_2_0: 'seedance_2_0', // Seedance 2.0 — ByteDance
            wan2_7: 'wan2_7',           // Wan 2.7 — open source
            wan2_6: 'wan2_6',           // Wan 2.6
            minimax_hailuo: 'minimax_hailuo', // MiniMax Hailuo
            cinematic_studio_3_0: 'cinematic_studio_3_0', // Cinematic Studio
            soul_cast: 'soul_cast',     // Soul Cast — character videos
        },
        // Image Models
        image: {
            nano_banana_2: 'nano_banana_2',     // Nano Banana Pro — best
            nano_banana_flash: 'nano_banana_flash', // Nano Banana 2 — fast
            flux_2: 'flux_2',                   // FLUX.2
            gpt_image_2: 'gpt_image_2',         // GPT Image 2
            text2image_soul_v2: 'text2image_soul_v2', // Soul V2 characters
            seedream_v4_5: 'seedream_v4_5',       // Seedream 4.5
            recraft_v4_1: 'recraft_v4_1',         // Recraft V4.1
            cinematic_studio_2_5: 'cinematic_studio_2_5', // Cinematic
        },
        // Analysis Models
        analysis: {
            brain_activity: 'brain_activity', // Virality Predictor
        },
        // 3D Models
        three_d: {
            multi_image_to_3d: 'multi_image_to_3d',
        }
    },

    // Default settings
    defaults: {
        video: {
            duration: 5,        // seconds: 5, 10, 15
            resolution: '1080p', // 720p, 1080p, 2k, 4k
            aspectRatio: '16:9', // 16:9, 9:16, 4:3, 3:4, 1:1
            mode: 'std',      // std, pro
            sound: 'off',     // off, on
        },
        image: {
            resolution: '2k',   // 1k, 2k, 4k
            aspectRatio: '16:9',
            quality: 'high',  // basic, high
        }
    },

    // Uploads directory for generated assets
    uploadsDir: path.join(__dirname, '..', 'uploads', 'higgsfield')
};

// Ensure uploads directory exists
if (!fs.existsSync(HIGGSFIELD_CONFIG.uploadsDir)) {
    fs.mkdirSync(HIGGSFIELD_CONFIG.uploadsDir, { recursive: true });
}

// ============================================================
// HIGGSFIELD API CLIENT CLASS
// ============================================================
class HiggsfieldClient {
    constructor() {
        this.mode = HIGGSFIELD_CONFIG.mode;
        this.isAuthenticated = false;
        this.checkAuthentication();
    }

    // Check if Higgsfield CLI is installed and authenticated
    checkAuthentication() {
        try {
            if (this.mode === 'cli') {
                const result = execSync(`${HIGGSFIELD_CONFIG.cli.binary} auth token`, { 
                    encoding: 'utf8',
                    timeout: 10000 
                });
                this.isAuthenticated = result.includes('token') || !result.includes('Not authenticated');
            } else {
                this.isAuthenticated = !!HIGGSFIELD_CONFIG.rest.apiKey;
            }
        } catch (error) {
            console.warn('⚠️ Higgsfield not authenticated. Run: higgsfield auth login');
            this.isAuthenticated = false;
        }
    }

    // ============================================================
    // VIDEO GENERATION
    // ============================================================

    /**
     * Generate video from text prompt (Text-to-Video)
     * @param {string} prompt - Text description of the video
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} - Generated video result
     */
    async generateVideo(prompt, options = {}) {
        const {
            model = HIGGSFIELD_CONFIG.models.video.veo3_1,
            duration = HIGGSFIELD_CONFIG.defaults.video.duration,
            resolution = HIGGSFIELD_CONFIG.defaults.video.resolution,
            aspectRatio = HIGGSFIELD_CONFIG.defaults.video.aspectRatio,
            mode = HIGGSFIELD_CONFIG.defaults.video.mode,
            sound = HIGGSFIELD_CONFIG.defaults.video.sound,
            genre,
            negativePrompt,
            wait = true,
        } = options;

        console.log(`🎬 Higgsfield: Generating video with ${model}`);
        console.log(`   Prompt: ${prompt.substring(0, 80)}...`);
        console.log(`   Duration: ${duration}s | Resolution: ${resolution} | Aspect: ${aspectRatio}`);

        try {
            if (this.mode === 'cli') {
                return await this._generateVideoCLI(prompt, {
                    model, duration, resolution, aspectRatio, mode, sound, genre, negativePrompt, wait
                });
            } else {
                return await this._generateVideoREST(prompt, {
                    model, duration, resolution, aspectRatio, mode, sound, genre, negativePrompt, wait
                });
            }
        } catch (error) {
            console.error('❌ Higgsfield video generation failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate video from image (Image-to-Video)
     * @param {string} imagePath - Path to start frame image
     * @param {string} prompt - Text prompt for animation
     * @param {Object} options - Generation options
     */
    async generateVideoFromImage(imagePath, prompt, options = {}) {
        const {
            model = HIGGSFIELD_CONFIG.models.video.kling3_0,
            duration = 5,
            resolution = '1080p',
            aspectRatio = '16:9',
            mode = 'std',
            sound = 'off',
            wait = true,
        } = options;

        console.log(`🎬 Higgsfield: Generating video from image with ${model}`);

        try {
            if (this.mode === 'cli') {
                const args = [
                    'generate', 'create', model,
                    '--prompt', prompt,
                    '--start-image', imagePath,
                    '--duration', String(duration),
                    '--resolution', resolution,
                    '--aspect-ratio', aspectRatio,
                    '--mode', mode,
                    '--sound', sound,
                ];
                if (wait) args.push('--wait');

                return await this._execCLI(args, HIGGSFIELD_CONFIG.cli.timeout);
            } else {
                // First upload the image
                const uploadResult = await this.uploadFile(imagePath);

                const response = await axios.post(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/generations`,
                    {
                        model,
                        prompt,
                        start_image_url: uploadResult.url,
                        duration,
                        resolution,
                        aspect_ratio: aspectRatio,
                        mode,
                        sound,
                    },
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: HIGGSFIELD_CONFIG.rest.timeout,
                    }
                );

                if (wait && response.data.job_id) {
                    return await this._waitForJob(response.data.job_id);
                }

                return response.data;
            }
        } catch (error) {
            console.error('❌ Higgsfield image-to-video failed:', error.message);
            throw error;
        }
    }

    /**
     * CLI implementation for video generation
     */
    async _generateVideoCLI(prompt, params) {
        const args = [
            'generate', 'create', params.model,
            '--prompt', prompt,
            '--duration', String(params.duration),
            '--resolution', params.resolution,
            '--aspect-ratio', params.aspectRatio,
            '--mode', params.mode,
            '--sound', params.sound,
        ];

        if (params.genre) args.push('--genre', params.genre);
        if (params.negativePrompt) args.push('--negative-prompt', params.negativePrompt);
        if (params.wait) args.push('--wait');

        return await this._execCLI(args, HIGGSFIELD_CONFIG.cli.timeout);
    }

    /**
     * REST API implementation for video generation
     */
    async _generateVideoREST(prompt, params) {
        const response = await axios.post(
            `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/generations`,
            {
                model: params.model,
                prompt,
                duration: params.duration,
                resolution: params.resolution,
                aspect_ratio: params.aspectRatio,
                mode: params.mode,
                sound: params.sound,
                genre: params.genre,
                negative_prompt: params.negativePrompt,
            },
            {
                headers: { 
                    'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: HIGGSFIELD_CONFIG.rest.timeout,
            }
        );

        if (params.wait && response.data.job_id) {
            return await this._waitForJob(response.data.job_id);
        }

        return response.data;
    }

    // ============================================================
    // IMAGE GENERATION
    // ============================================================

    /**
     * Generate image from text prompt (Text-to-Image)
     * @param {string} prompt - Text description
     * @param {Object} options - Generation options
     */
    async generateImage(prompt, options = {}) {
        const {
            model = HIGGSFIELD_CONFIG.models.image.nano_banana_2,
            resolution = HIGGSFIELD_CONFIG.defaults.image.resolution,
            aspectRatio = HIGGSFIELD_CONFIG.defaults.image.aspectRatio,
            quality = HIGGSFIELD_CONFIG.defaults.image.quality,
            wait = true,
        } = options;

        console.log(`🎨 Higgsfield: Generating image with ${model}`);
        console.log(`   Prompt: ${prompt.substring(0, 80)}...`);

        try {
            if (this.mode === 'cli') {
                const args = [
                    'generate', 'create', model,
                    '--prompt', prompt,
                    '--resolution', resolution,
                    '--aspect-ratio', aspectRatio,
                    '--quality', quality,
                ];
                if (wait) args.push('--wait');

                return await this._execCLI(args, HIGGSFIELD_CONFIG.cli.timeout);
            } else {
                const response = await axios.post(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/generations`,
                    {
                        model,
                        prompt,
                        resolution,
                        aspect_ratio: aspectRatio,
                        quality,
                    },
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: HIGGSFIELD_CONFIG.rest.timeout,
                    }
                );

                if (wait && response.data.job_id) {
                    return await this._waitForJob(response.data.job_id);
                }

                return response.data;
            }
        } catch (error) {
            console.error('❌ Higgsfield image generation failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate image from reference image (Image-to-Image)
     * @param {string} imagePath - Reference image path
     * @param {string} prompt - Edit prompt
     * @param {Object} options - Generation options
     */
    async generateImageFromImage(imagePath, prompt, options = {}) {
        const {
            model = 'nano_banana_2_edit',
            resolution = '2k',
            aspectRatio = '16:9',
            quality = 'high',
            wait = true,
        } = options;

        console.log(`🎨 Higgsfield: Editing image with ${model}`);

        try {
            if (this.mode === 'cli') {
                const args = [
                    'generate', 'create', model,
                    '--prompt', prompt,
                    '--image', imagePath,
                    '--resolution', resolution,
                    '--aspect-ratio', aspectRatio,
                    '--quality', quality,
                ];
                if (wait) args.push('--wait');

                return await this._execCLI(args, HIGGSFIELD_CONFIG.cli.timeout);
            } else {
                const uploadResult = await this.uploadFile(imagePath);

                const response = await axios.post(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/generations`,
                    {
                        model,
                        prompt,
                        image_url: uploadResult.url,
                        resolution,
                        aspect_ratio: aspectRatio,
                        quality,
                    },
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: HIGGSFIELD_CONFIG.rest.timeout,
                    }
                );

                if (wait && response.data.job_id) {
                    return await this._waitForJob(response.data.job_id);
                }

                return response.data;
            }
        } catch (error) {
            console.error('❌ Higgsfield image-to-image failed:', error.message);
            throw error;
        }
    }

    // ============================================================
    // VIRALITY PREDICTOR (Brain Activity)
    // ============================================================

    /**
     * Analyze a finished video for viral potential
     * @param {string} videoPath - Path to video file
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} - Virality scores and insights
     */
    async analyzeVirality(videoPath, options = {}) {
        const { wait = true } = options;

        console.log(`🧠 Higgsfield: Analyzing video virality...`);

        try {
            if (this.mode === 'cli') {
                const args = [
                    'generate', 'create', 'brain_activity',
                    '--video', videoPath,
                ];
                if (wait) args.push('--wait');

                return await this._execCLI(args, HIGGSFIELD_CONFIG.cli.timeout);
            } else {
                const uploadResult = await this.uploadFile(videoPath);

                const response = await axios.post(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/generations`,
                    {
                        model: 'brain_activity',
                        video_url: uploadResult.url,
                    },
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: HIGGSFIELD_CONFIG.rest.timeout,
                    }
                );

                if (wait && response.data.job_id) {
                    return await this._waitForJob(response.data.job_id);
                }

                return response.data;
            }
        } catch (error) {
            console.error('❌ Higgsfield virality analysis failed:', error.message);
            throw error;
        }
    }

    // ============================================================
    // WORKFLOWS
    // ============================================================

    /**
     * Draw-to-Video: Edit video from a source clip + edited sketch frame
     * @param {string} videoPath - Source video
     * @param {string} sketchPath - Edited sketch frame
     * @param {number} timestamp - Timestamp in seconds for the sketch frame
     * @param {string} prompt - Edit prompt
     */
    async drawToVideo(videoPath, sketchPath, timestamp, prompt, options = {}) {
        const { wait = true } = options;

        console.log(`✏️ Higgsfield: Draw-to-Video workflow`);

        try {
            if (this.mode === 'cli') {
                const args = [
                    'generate', 'workflow', 'draw_to_video',
                    '--video', videoPath,
                    '--sketch', sketchPath,
                    '--timestamp', String(timestamp),
                    '--prompt', prompt,
                ];
                if (wait) args.push('--wait');

                return await this._execCLI(args, HIGGSFIELD_CONFIG.cli.timeout);
            } else {
                const [videoUpload, sketchUpload] = await Promise.all([
                    this.uploadFile(videoPath),
                    this.uploadFile(sketchPath),
                ]);

                const response = await axios.post(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/workflows/draw_to_video`,
                    {
                        video_url: videoUpload.url,
                        sketch_url: sketchUpload.url,
                        timestamp,
                        prompt,
                    },
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: HIGGSFIELD_CONFIG.rest.timeout,
                    }
                );

                if (wait && response.data.job_id) {
                    return await this._waitForJob(response.data.job_id);
                }

                return response.data;
            }
        } catch (error) {
            console.error('❌ Higgsfield draw-to-video failed:', error.message);
            throw error;
        }
    }

    /**
     * Reframe: Change video aspect ratio
     * @param {string} videoPath - Source video
     * @param {string} aspectRatio - Target aspect ratio (9:16, 16:9, etc.)
     * @param {string} resolution - Target resolution
     */
    async reframeVideo(videoPath, aspectRatio = '9:16', resolution = '720p', options = {}) {
        const { wait = true } = options;

        console.log(`🔄 Higgsfield: Reframing video to ${aspectRatio}`);

        try {
            if (this.mode === 'cli') {
                const args = [
                    'generate', 'workflow', 'reframe',
                    '--video', videoPath,
                    '--aspect-ratio', aspectRatio,
                    '--resolution', resolution,
                ];
                if (wait) args.push('--wait');

                return await this._execCLI(args, HIGGSFIELD_CONFIG.cli.timeout);
            } else {
                const uploadResult = await this.uploadFile(videoPath);

                const response = await axios.post(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/workflows/reframe`,
                    {
                        video_url: uploadResult.url,
                        aspect_ratio: aspectRatio,
                        resolution,
                    },
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: HIGGSFIELD_CONFIG.rest.timeout,
                    }
                );

                if (wait && response.data.job_id) {
                    return await this._waitForJob(response.data.job_id);
                }

                return response.data;
            }
        } catch (error) {
            console.error('❌ Higgsfield reframe failed:', error.message);
            throw error;
        }
    }

    // ============================================================
    // SOUL ID (Character Training)
    // ============================================================

    /**
     * Train a Soul ID character from reference images
     * @param {string} name - Character name
     * @param {string[]} imagePaths - Array of image paths (3+ recommended)
     * @param {Object} options - Training options
     */
    async trainSoulId(name, imagePaths, options = {}) {
        const { soulV2 = true, wait = true } = options;

        console.log(`👤 Higgsfield: Training Soul ID "${name}" with ${imagePaths.length} images`);

        try {
            if (this.mode === 'cli') {
                const args = [
                    'soul-id', 'create',
                    '--name', name,
                ];
                if (soulV2) args.push('--soul-2');
                imagePaths.forEach(img => args.push('--image', img));

                if (wait) args.push('--wait');

                return await this._execCLI(args, HIGGSFIELD_CONFIG.cli.timeout);
            } else {
                // Upload all images
                const uploads = await Promise.all(imagePaths.map(p => this.uploadFile(p)));

                const response = await axios.post(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/soul-ids`,
                    {
                        name,
                        soul_v2: soulV2,
                        images: uploads.map(u => u.url),
                    },
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: HIGGSFIELD_CONFIG.rest.timeout,
                    }
                );

                if (wait && response.data.soul_id) {
                    return await this._waitForSoulId(response.data.soul_id);
                }

                return response.data;
            }
        } catch (error) {
            console.error('❌ Higgsfield Soul ID training failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate image using a trained Soul ID
     * @param {string} soulId - Soul ID identifier
     * @param {string} prompt - Generation prompt
     * @param {Object} options - Generation options
     */
    async generateWithSoulId(soulId, prompt, options = {}) {
        const {
            model = 'text2image_soul_v2',
            resolution = '2k',
            aspectRatio = '16:9',
            wait = true,
        } = options;

        console.log(`👤 Higgsfield: Generating with Soul ID ${soulId}`);

        try {
            if (this.mode === 'cli') {
                const args = [
                    'generate', 'create', model,
                    '--prompt', prompt,
                    '--soul-id', soulId,
                    '--resolution', resolution,
                    '--aspect-ratio', aspectRatio,
                ];
                if (wait) args.push('--wait');

                return await this._execCLI(args, HIGGSFIELD_CONFIG.cli.timeout);
            } else {
                const response = await axios.post(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/generations`,
                    {
                        model,
                        prompt,
                        soul_id: soulId,
                        resolution,
                        aspect_ratio: aspectRatio,
                    },
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: HIGGSFIELD_CONFIG.rest.timeout,
                    }
                );

                if (wait && response.data.job_id) {
                    return await this._waitForJob(response.data.job_id);
                }

                return response.data;
            }
        } catch (error) {
            console.error('❌ Higgsfield Soul ID generation failed:', error.message);
            throw error;
        }
    }

    // ============================================================
    // 3D GENERATION
    // ============================================================

    /**
     * Generate 3D model from multiple images
     * @param {string[]} imagePaths - Array of image paths
     * @param {Object} options - Generation options
     */
    async generate3D(imagePaths, options = {}) {
        const { wait = true } = options;

        console.log(`🧊 Higgsfield: Generating 3D from ${imagePaths.length} images`);

        try {
            if (this.mode === 'cli') {
                const args = [
                    'generate', 'create', 'multi_image_to_3d',
                ];
                imagePaths.forEach(img => args.push('--image', img));
                if (wait) args.push('--wait');

                return await this._execCLI(args, HIGGSFIELD_CONFIG.cli.timeout);
            } else {
                const uploads = await Promise.all(imagePaths.map(p => this.uploadFile(p)));

                const response = await axios.post(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/generations`,
                    {
                        model: 'multi_image_to_3d',
                        images: uploads.map(u => u.url),
                    },
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: HIGGSFIELD_CONFIG.rest.timeout,
                    }
                );

                if (wait && response.data.job_id) {
                    return await this._waitForJob(response.data.job_id);
                }

                return response.data;
            }
        } catch (error) {
            console.error('❌ Higgsfield 3D generation failed:', error.message);
            throw error;
        }
    }

    // ============================================================
    // FILE UPLOAD
    // ============================================================

    /**
     * Upload a file to Higgsfield
     * @param {string} filePath - Path to file
     * @returns {Promise<Object>} - Upload result with URL
     */
    async uploadFile(filePath) {
        console.log(`📤 Higgsfield: Uploading ${path.basename(filePath)}`);

        try {
            if (this.mode === 'cli') {
                const result = await this._execCLI([
                    'upload', filePath,
                    '--json'
                ], 60000);
                return JSON.parse(result);
            } else {
                const form = new FormData();
                form.append('file', fs.createReadStream(filePath));

                const response = await axios.post(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/upload_file`,
                    form,
                    {
                        headers: { 
                            ...form.getHeaders(),
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                        },
                        timeout: 120000,
                    }
                );

                return response.data;
            }
        } catch (error) {
            console.error('❌ Higgsfield upload failed:', error.message);
            throw error;
        }
    }

    // ============================================================
    // JOB MANAGEMENT
    // ============================================================

    /**
     * Wait for a job to complete
     * @param {string} jobId - Job identifier
     * @param {number} timeout - Max wait time in ms
     * @param {number} interval - Poll interval in ms
     */
    async _waitForJob(jobId, timeout = 600000, interval = 3000) {
        console.log(`⏳ Waiting for job ${jobId}...`);
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                let status;

                if (this.mode === 'cli') {
                    const result = await this._execCLI([
                        'generate', 'get', jobId,
                        '--json'
                    ], 30000);
                    status = JSON.parse(result);
                } else {
                    const response = await axios.get(
                        `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/predictions/${jobId}/result`,
                        {
                            headers: { 
                                'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            },
                            timeout: 30000,
                        }
                    );
                    status = response.data;
                }

                if (status.status === 'completed') {
                    console.log(`✅ Job ${jobId} completed!`);
                    return status;
                } else if (status.status === 'failed') {
                    throw new Error(`Job ${jobId} failed: ${status.error || 'Unknown error'}`);
                }

                console.log(`   Status: ${status.status}... (${Math.round((Date.now() - startTime) / 1000)}s)`);
                await new Promise(r => setTimeout(r, interval));

            } catch (error) {
                if (error.message.includes('failed')) throw error;
                console.warn(`   Poll error: ${error.message}`);
                await new Promise(r => setTimeout(r, interval));
            }
        }

        throw new Error(`Job ${jobId} timed out after ${timeout / 1000}s`);
    }

    async _waitForSoulId(soulId, timeout = 300000, interval = 5000) {
        console.log(`⏳ Waiting for Soul ID ${soulId} training...`);
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                let status;

                if (this.mode === 'cli') {
                    const result = await this._execCLI([
                        'soul-id', 'get', soulId,
                        '--json'
                    ], 30000);
                    status = JSON.parse(result);
                } else {
                    const response = await axios.get(
                        `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/soul-ids/${soulId}`,
                        {
                            headers: { 
                                'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            },
                            timeout: 30000,
                        }
                    );
                    status = response.data;
                }

                if (status.status === 'ready') {
                    console.log(`✅ Soul ID ${soulId} ready!`);
                    return status;
                } else if (status.status === 'failed') {
                    throw new Error(`Soul ID ${soulId} training failed`);
                }

                console.log(`   Status: ${status.status}...`);
                await new Promise(r => setTimeout(r, interval));

            } catch (error) {
                if (error.message.includes('failed')) throw error;
                await new Promise(r => setTimeout(r, interval));
            }
        }

        throw new Error(`Soul ID ${soulId} training timed out`);
    }

    // ============================================================
    // CLI EXECUTION HELPER
    // ============================================================

    _execCLI(args, timeout) {
        return new Promise((resolve, reject) => {
            const cmd = HIGGSFIELD_CONFIG.cli.binary;
            const fullArgs = [...args, '--json'];

            console.log(`   CLI: ${cmd} ${fullArgs.join(' ')}`);

            const child = spawn(cmd, fullArgs, {
                timeout,
                env: { ...process.env, FORCE_COLOR: '0' },
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Higgsfield CLI exited with code ${code}: ${stderr || stdout}`));
                } else {
                    resolve(stdout.trim());
                }
            });

            child.on('error', (error) => {
                if (error.code === 'ENOENT') {
                    reject(new Error(
                        `Higgsfield CLI not found. Install it first:
` +
                        `  npm install -g @higgsfield/cli
` +
                        `  higgsfield auth login`
                    ));
                } else {
                    reject(error);
                }
            });
        });
    }

    // ============================================================
    // UTILITY METHODS
    // ============================================================

    /**
     * List available models
     */
    async listModels(type = null) {
        try {
            if (this.mode === 'cli') {
                const args = ['model', 'list'];
                if (type) args.push(`--${type}`);

                const result = await this._execCLI(args, 30000);
                return JSON.parse(result);
            } else {
                const response = await axios.get(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/models`,
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                        },
                        timeout: 30000,
                    }
                );
                return response.data;
            }
        } catch (error) {
            console.error('❌ Failed to list models:', error.message);
            throw error;
        }
    }

    /**
     * Get account info (credits, etc.)
     */
    async getAccountInfo() {
        try {
            if (this.mode === 'cli') {
                const result = await this._execCLI(['account', '--json'], 30000);
                return JSON.parse(result);
            } else {
                const response = await axios.get(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/account`,
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                        },
                        timeout: 30000,
                    }
                );
                return response.data;
            }
        } catch (error) {
            console.error('❌ Failed to get account info:', error.message);
            throw error;
        }
    }

    /**
     * Estimate generation cost
     */
    async estimateCost(model, params = {}) {
        try {
            if (this.mode === 'cli') {
                const args = ['generate', 'cost', model];

                if (params.duration) args.push('--duration', String(params.duration));
                if (params.resolution) args.push('--resolution', params.resolution);
                if (params.aspectRatio) args.push('--aspect-ratio', params.aspectRatio);

                const result = await this._execCLI(args, 30000);
                return JSON.parse(result);
            } else {
                const response = await axios.post(
                    `${HIGGSFIELD_CONFIG.rest.baseUrl}/api/v1/estimate-cost`,
                    { model, ...params },
                    {
                        headers: { 
                            'Authorization': `Bearer ${HIGGSFIELD_CONFIG.rest.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000,
                    }
                );
                return response.data;
            }
        } catch (error) {
            console.error('❌ Failed to estimate cost:', error.message);
            throw error;
        }
    }
}

// ============================================================
// NEUROTUBE INTEGRATION FUNCTIONS
// ============================================================

/**
 * Generate B-roll footage for a script segment
 * Uses AI to create contextually relevant video clips
 */
async function generateBRoll(segmentDescription, options = {}) {
    const hf = new HiggsfieldClient();

    if (!hf.isAuthenticated) {
        throw new Error('Higgsfield not authenticated. Run: higgsfield auth login');
    }

    const {
        duration = 3,
        style = 'cinematic',
        aspectRatio = '16:9',
    } = options;

    // Enhance prompt for B-roll quality
    const enhancedPrompt = `${segmentDescription}, ${style} style, smooth camera movement, ` +
        `professional lighting, high quality footage, seamless loop`;

    const result = await hf.generateVideo(enhancedPrompt, {
        model: 'kling3_0',
        duration,
        resolution: '1080p',
        aspectRatio,
        mode: 'pro',
        sound: 'off',
    });

    // Download the result to local storage
    const videoUrl = result.result_url || result.url;
    const localPath = await downloadAsset(videoUrl, 'broll', 'mp4');

    return {
        originalPrompt: segmentDescription,
        enhancedPrompt,
        videoUrl,
        localPath,
        duration,
        style,
    };
}

/**
 * Generate thumbnail image for a video
 * Creates high-CTR thumbnail with face/expression focus
 */
async function generateThumbnail(videoTopic, options = {}) {
    const hf = new HiggsfieldClient();

    if (!hf.isAuthenticated) {
        throw new Error('Higgsfield not authenticated');
    }

    const {
        style = 'viral youtube thumbnail',
        aspectRatio = '16:9',
        resolution = '2k',
    } = options;

    const prompt = `YouTube thumbnail: ${videoTopic}, ${style}, ` +
        `high contrast, readable text overlay, emotional face expression, ` +
        `bright colors, clickbait style, professional photography`;

    const result = await hf.generateImage(prompt, {
        model: 'nano_banana_2',
        resolution,
        aspectRatio,
        quality: 'high',
    });

    const imageUrl = result.result_url || result.url;
    const localPath = await downloadAsset(imageUrl, 'thumbnail', 'png');

    return {
        topic: videoTopic,
        prompt,
        imageUrl,
        localPath,
    };
}

/**
 * Generate channel avatar/banner using Soul ID
 * Creates consistent character for channel branding
 */
async function generateChannelAvatar(characterDescription, imagePaths, options = {}) {
    const hf = new HiggsfieldClient();

    if (!hf.isAuthenticated) {
        throw new Error('Higgsfield not authenticated');
    }

    // Train Soul ID if images provided
    let soulId = options.soulId;
    if (!soulId && imagePaths && imagePaths.length > 0) {
        const trainResult = await hf.trainSoulId('channel_host', imagePaths, { soulV2: true });
        soulId = trainResult.soul_id;
    }

    // Generate avatar
    const avatarPrompt = `Professional YouTube channel avatar, ${characterDescription}, ` +
        `clean background, portrait style, friendly expression, high quality`;

    const result = await hf.generateWithSoulId(soulId, avatarPrompt, {
        model: 'text2image_soul_v2',
        resolution: '2k',
        aspectRatio: '1:1',
    });

    const imageUrl = result.result_url || result.url;
    const localPath = await downloadAsset(imageUrl, 'avatar', 'png');

    return {
        soulId,
        prompt: avatarPrompt,
        imageUrl,
        localPath,
    };
}

/**
 * Analyze video for viral potential before publishing
 * Provides scores and actionable improvements
 */
async function predictVirality(videoPath) {
    const hf = new HiggsfieldClient();

    if (!hf.isAuthenticated) {
        throw new Error('Higgsfield not authenticated');
    }

    const result = await hf.analyzeVirality(videoPath);

    // Parse and structure the analysis
    const analysis = {
        overallScore: result.overall_score || result.viral_score || 0,
        hookStrength: result.hook_strength || 0,
        attentionScore: result.attention || 0,
        retentionPrediction: result.retention || 0,
        viralPotential: result.viral_potential || 0,
        reportUrl: result.report_url || result.open_report_url,
        raw: result,
    };

    // Generate improvement suggestions
    const suggestions = [];
    if (analysis.hookStrength < 7) {
        suggestions.push('First 3 seconds need stronger hook — add curiosity gap or shocking fact');
    }
    if (analysis.retentionPrediction < 6) {
        suggestions.push('Predicted retention drop — add pattern interrupts every 30 seconds');
    }
    if (analysis.viralPotential < 7) {
        suggestions.push('Viral potential moderate — consider adding emotional peak or controversy');
    }

    return {
        ...analysis,
        suggestions,
        shouldPublish: analysis.overallScore >= 7,
    };
}

/**
 * Convert long-form video to YouTube Shorts
 * Uses Reframe workflow to change aspect ratio + AI enhancement
 */
async function createShorts(longVideoPath, options = {}) {
    const hf = new HiggsfieldClient();

    if (!hf.isAuthenticated) {
        throw new Error('Higgsfield not authenticated');
    }

    const {
        targetDuration = 60,
        highlightTimestamp = null,
    } = options;

    // Step 1: Extract best segment (if timestamp provided, use it; else use AI)
    let segmentPath = longVideoPath;
    if (highlightTimestamp) {
        // TODO: Use ffmpeg to extract segment
        console.log(`📌 Using highlight at ${highlightTimestamp}s`);
    }

    // Step 2: Reframe to 9:16
    console.log('🔄 Reframing to 9:16 for Shorts...');
    const reframedResult = await hf.reframeVideo(segmentPath, '9:16', '720p');
    const reframedUrl = reframedResult.result_url || reframedResult.url;
    const reframedPath = await downloadAsset(reframedUrl, 'shorts_reframed', 'mp4');

    // Step 3: Analyze virality of the shorts version
    console.log('🧠 Analyzing Shorts virality...');
    const virality = await predictVirality(reframedPath);

    return {
        originalVideo: longVideoPath,
        shortsPath: reframedPath,
        shortsUrl: reframedUrl,
        virality,
        duration: targetDuration,
    };
}

/**
 * Generate intro sequence for channel
 * Creates branded animated intro with logo
 */
async function generateIntro(channelName, brandColors, options = {}) {
    const hf = new HiggsfieldClient();

    if (!hf.isAuthenticated) {
        throw new Error('Higgsfield not authenticated');
    }

    const {
        duration = 5,
        style = 'modern minimal',
    } = options;

    const prompt = `YouTube channel intro animation, "${channelName}", ` +
        `brand colors ${brandColors.join(' and ')}, ${style}, ` +
        `smooth text reveal, subtle particle effects, professional motion graphics, ` +
        `clean typography, high-end feel, 4K quality`;

    const result = await hf.generateVideo(prompt, {
        model: 'cinematic_studio_3_0',
        duration,
        resolution: '1080p',
        aspectRatio: '16:9',
        mode: 'pro',
        sound: 'off',
    });

    const videoUrl = result.result_url || result.url;
    const localPath = await downloadAsset(videoUrl, 'intro', 'mp4');

    return {
        channelName,
        prompt,
        videoUrl,
        localPath,
        duration,
    };
}

/**
 * Download asset from URL to local storage
 */
async function downloadAsset(url, prefix, ext) {
    const filename = `${prefix}_${Date.now()}.${ext}`;
    const localPath = path.join(HIGGSFIELD_CONFIG.uploadsDir, filename);

    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 120000,
        });

        const writer = fs.createWriteStream(localPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log(`💾 Downloaded: ${localPath}`);
        return localPath;

    } catch (error) {
        console.error('❌ Download failed:', error.message);
        throw error;
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    HiggsfieldClient,
    HIGGSFIELD_CONFIG,
    generateBRoll,
    generateThumbnail,
    generateChannelAvatar,
    predictVirality,
    createShorts,
    generateIntro,
    downloadAsset,
};
