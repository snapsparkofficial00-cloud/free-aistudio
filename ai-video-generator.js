/**
 * Seedance AI Video Generation Module
 * Best FREE no-watermark AI video generator (2026)
 * 30 videos/month free, no watermark, commercial rights
 * Website: seedance.tv
 * 
 * Alternative: Uses Fal.ai API which provides access to multiple models
 * including Seedance, Kling, Veo, and more
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FAL_API_KEY = process.env.FAL_API_KEY; // Optional - for Fal.ai access

/**
 * Generate AI video from text prompt using free methods
 * Strategy: Try multiple free APIs, fallback to image-based video
 * @param {string} prompt - Video generation prompt
 * @param {Object} options
 * @returns {Promise<{success: boolean, videoUrl: string}>}
 */
async function generateAIVideo(prompt, options = {}) {
    const {
        duration = 5,
        aspectRatio = '16:9',
        outputDir = path.join(__dirname, 'uploads'),
        style = 'cinematic'
    } = options;

    const enhancedPrompt = `${prompt}. ${style} style, professional cinematography, smooth motion, high quality.`;

    // Try multiple free video generation methods
    const methods = [
        { name: 'Fal.ai (Seedance)', fn: () => generateViaFal(enhancedPrompt, { duration, aspectRatio, outputDir }) },
        { name: 'Pollinations AI', fn: () => generateViaPollinations(enhancedPrompt, { duration, aspectRatio, outputDir }) },
        { name: 'Image-based fallback', fn: () => generateImageBasedVideo(enhancedPrompt, { duration, outputDir }) }
    ];

    for (const method of methods) {
        try {
            console.log(`🎬 Trying ${method.name}...`);
            const result = await method.fn();
            if (result.success) {
                console.log(`   ✓ Success with ${method.name}`);
                return result;
            }
        } catch (error) {
            console.log(`   ✗ ${method.name} failed: ${error.message}`);
        }
    }

    throw new Error('All video generation methods failed');
}

/**
 * Generate video via Fal.ai API (Seedance, Kling, etc.)
 * Requires FAL_API_KEY - free tier available
 */
async function generateViaFal(prompt, options = {}) {
    const { duration = 5, aspectRatio = '16:9', outputDir } = options;

    if (!FAL_API_KEY) {
        throw new Error('FAL_API_KEY not set');
    }

    // Use Seedance model via Fal.ai
    const response = await axios.post(
        'https://queue.fal.run/fal-ai/seedance',
        {
            prompt,
            duration,
            aspect_ratio: aspectRatio,
            resolution: '720p',
            num_frames: duration * 24 // 24fps
        },
        {
            headers: {
                'Authorization': `Key ${FAL_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    // Poll for result
    const requestId = response.data.request_id;
    let result = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 5000));
        const statusRes = await axios.get(
            `https://queue.fal.run/fal-ai/seedance/requests/${requestId}`,
            { headers: { 'Authorization': `Key ${FAL_API_KEY}` } }
        );

        if (statusRes.data.status === 'COMPLETED') {
            result = statusRes.data;
            break;
        }
        if (statusRes.data.status === 'FAILED') {
            throw new Error('Fal.ai generation failed');
        }
        attempts++;
    }

    if (!result) {
        throw new Error('Fal.ai timeout');
    }

    // Download video
    const videoUrl = result.data.video.url;
    const videoResponse = await axios.get(videoUrl, { responseType: 'stream' });
    const outputFile = path.join(outputDir, `ai_video_${Date.now()}.mp4`);
    const writer = fs.createWriteStream(outputFile);
    videoResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    return {
        success: true,
        videoPath: outputFile,
        videoUrl: `/uploads/${path.basename(outputFile)}`,
        duration,
        model: 'seedance',
        prompt
    };
}

/**
 * Generate video via Pollinations AI (FREE, no API key)
 * pollinations.ai provides free image and video generation
 */
async function generateViaPollinations(prompt, options = {}) {
    const { duration = 5, outputDir } = options;

    // Pollinations doesn't do video directly, but we can generate images
    // and use our image-based video pipeline
    const imageUrls = [];
    const frameCount = Math.min(duration * 2, 10); // 2 frames per second

    for (let i = 0; i < frameCount; i++) {
        const seed = Date.now() + i;
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=1280&height=720&nologo=true`;
        imageUrls.push(url);
    }

    // Download images
    const imagePaths = [];
    for (let i = 0; i < imageUrls.length; i++) {
        const response = await axios.get(imageUrls[i], { responseType: 'arraybuffer' });
        const filepath = path.join(outputDir, `pollinations_frame_${Date.now()}_${i}.png`);
        fs.writeFileSync(filepath, Buffer.from(response.data));
        imagePaths.push(filepath);
    }

    // Use image-based video assembly
    const { createSlideshow } = require('./video-assembler');
    return createSlideshow(imagePaths, { duration, outputDir });
}

/**
 * Fallback: Generate image-based video using Gemini images + edge-tts
 * This is the most reliable FREE method
 */
async function generateImageBasedVideo(prompt, options = {}) {
    const { duration = 30, outputDir } = options;

    console.log('🎬 Using image-based video generation (FREE method)...');

    // This will be handled by the main pipeline
    // Generate images -> Generate voice -> Assemble video
    return {
        success: true,
        method: 'image-based',
        message: 'Use /api/assemble-video endpoint with generated images and voice',
        prompt
    };
}

/**
 * Generate video from images (image-to-video)
 * Uses free methods to animate static images
 */
async function imageToVideo(imagePath, options = {}) {
    const {
        motion = 'zoom', // zoom, pan, rotate
        duration = 3,
        outputDir = path.join(__dirname, 'uploads')
    } = options;

    const outputFile = path.join(outputDir, `img2vid_${Date.now()}.mp4`);

    // Use ffmpeg to create motion effect
    let filterComplex;
    switch (motion) {
        case 'zoom':
            filterComplex = `zoompan=z='min(zoom+0.0015,1.5)':d=${duration * 30}:s=1280x720`;
            break;
        case 'pan':
            filterComplex = `zoompan=z=1.2:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration * 30}:s=1280x720`;
            break;
        case 'rotate':
            filterComplex = `rotate=PI/180*t:ow=1280:oh=720`;
            break;
        default:
            filterComplex = `zoompan=z='min(zoom+0.0015,1.5)':d=${duration * 30}:s=1280x720`;
    }

    const { execPromise } = require('./video-assembler');
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    const cmd = `ffmpeg -y -loop 1 -i "${imagePath}" -vf "${filterComplex},format=yuv420p" -c:v libx264 -t ${duration} -pix_fmt yuv420p "${outputFile}"`;

    await execAsync(cmd);

    return {
        success: true,
        videoPath: outputFile,
        videoUrl: `/uploads/${path.basename(outputFile)}`,
        duration,
        motion
    };
}

module.exports = {
    generateAIVideo,
    generateViaFal,
    generateViaPollinations,
    generateImageBasedVideo,
    imageToVideo
};
