/**
 * Gemini Image Generation Module
 * Uses Google Gemini API for FREE image generation
 * Fallback: Pollinations AI (100% free, no key needed)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Use gemini-2.0-flash-exp-image-generation (confirmed working free model)
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp';

/**
 * Generate images using Gemini API or Pollinations fallback
 * @param {string} prompt - Image generation prompt
 * @param {Object} options - Options
 * @param {number} options.count - Number of images (1-4)
 * @param {string} options.aspectRatio - Aspect ratio (1:1, 16:9, 9:16)
 * @param {string} options.outputDir - Output directory
 * @returns {Promise<{success: boolean, images: Array}>}
 */
async function generateImages(prompt, options = {}) {
    const {
        count = 4,
        aspectRatio = '16:9',
        outputDir = path.join(__dirname, 'uploads')
    } = options;

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // If Gemini key available, try Gemini first
    if (GEMINI_API_KEY) {
        try {
            return await generateWithGemini(prompt, { count, aspectRatio, outputDir });
        } catch (err) {
            console.log('Gemini failed, falling back to Pollinations:', err.message);
        }
    }

    // Fallback to Pollinations AI (completely free, no key)
    return await generateWithPollinations(prompt, { count, aspectRatio, outputDir });
}

/**
 * Generate with Gemini API
 */
async function generateWithGemini(prompt, options) {
    const { count, aspectRatio, outputDir } = options;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: GEMINI_IMAGE_MODEL,
    });

    const images = [];
    const actualCount = Math.min(Math.max(count, 1), 4);

    for (let i = 0; i < actualCount; i++) {
        try {
            console.log(`  [Gemini] Generating image ${i + 1}/${actualCount}...`);

            const enhancedPrompt = `${prompt}. High quality, professional, cinematic lighting, detailed, ${aspectRatio} aspect ratio. Image ${i + 1} of ${actualCount} with slight variation.`;

            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: enhancedPrompt }]
                }],
                generationConfig: {
                    responseModalities: ['Text', 'Image']
                }
            });

            const response = result.response;
            let imageData = null;
            let imageText = '';

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    imageData = part.inlineData.data;
                }
                if (part.text) {
                    imageText += part.text;
                }
            }

            if (imageData) {
                const filename = `image_${Date.now()}_${i}.png`;
                const filepath = path.join(outputDir, filename);
                fs.writeFileSync(filepath, Buffer.from(imageData, 'base64'));

                images.push({
                    url: '/uploads/' + filename,
                    filepath,
                    prompt: enhancedPrompt,
                    text: imageText,
                    index: i
                });

                console.log(`     Image ${i + 1} saved: ${filename}`);
            }
        } catch (error) {
            console.error(`     Image ${i + 1} failed:`, error.message);
        }
    }

    if (images.length === 0) {
        throw new Error('Gemini returned no images');
    }

    return {
        success: true,
        images,
        count: images.length,
        prompt,
        source: 'gemini'
    };
}

/**
 * Generate with Pollinations AI (FREE, no API key)
 * https://pollinations.ai
 */
async function generateWithPollinations(prompt, options) {
    const { count, aspectRatio, outputDir } = options;
    const images = [];

    const [width, height] = aspectRatio === '16:9' ? [1280, 720] :
                           aspectRatio === '9:16' ? [720, 1280] : [1024, 1024];

    for (let i = 0; i < count; i++) {
        try {
            console.log(`  [Pollinations] Generating image ${i + 1}/${count}...`);

            const seed = Date.now() + i;
            const enhancedPrompt = encodeURIComponent(
                `${prompt}, high quality, professional, cinematic lighting, detailed, ${aspectRatio}`
            );
            const url = `https://gen.pollinations.ai/image/${enhancedPrompt}?seed=${seed}&width=${width}&height=${height}&nologo=true&noWatermark=true`;

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            const filename = `image_${Date.now()}_${i}.png`;
            const filepath = path.join(outputDir, filename);
            fs.writeFileSync(filepath, Buffer.from(response.data));

            images.push({
                url: '/uploads/' + filename,
                filepath,
                prompt: prompt,
                index: i,
                source: 'pollinations'
            });

            console.log(`     Image ${i + 1} saved: ${filename}`);

            // Small delay between requests
            if (i < count - 1) await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error(`     Image ${i + 1} failed:`, error.message);
        }
    }

    if (images.length === 0) {
        throw new Error('Pollinations returned no images');
    }

    return {
        success: true,
        images,
        count: images.length,
        prompt,
        source: 'pollinations'
    };
}

/**
 * Generate a sequence of images for video (storyboard style)
 * Creates 30 images for a 30-35 second video
 * @param {string} script - Video script
 * @param {Object} options
 * @returns {Promise<{success: boolean, frames: Array}>}
 */
async function generateVideoFrames(script, options = {}) {
    const {
        frameCount = 30,
        outputDir = path.join(__dirname, 'uploads'),
        style = 'cinematic'
    } = options;

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Parse script into segments for each frame
    const segments = parseScriptIntoSegments(script, frameCount);
    const frames = [];

    console.log(`[Video Frames] Generating ${frameCount} frames from script...`);

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const framePrompt = `Scene ${i + 1}/${frameCount}: ${segment}. ${style} style, cinematic composition, professional photography, high detail, 16:9.`;

        try {
            const result = await generateImages(framePrompt, {
                count: 1,
                aspectRatio: '16:9',
                outputDir
            });

            if (result.images.length > 0) {
                frames.push({
                    index: i,
                    segment,
                    imageUrl: result.images[0].url,
                    filepath: result.images[0].filepath,
                    duration: 1
                });
            }

            // Delay to avoid rate limiting
            if (i < segments.length - 1) await new Promise(r => setTimeout(r, 800));

        } catch (error) {
            console.error(`   Frame ${i + 1} failed:`, error.message);
        }
    }

    return {
        success: frames.length > 0,
        frames,
        frameCount: frames.length,
        estimatedDuration: frames.length
    };
}

/**
 * Parse script into visual segments for frames
 */
function parseScriptIntoSegments(script, frameCount) {
    const cleanScript = script
        .replace(/\[.*?\]/gi, '')
        .replace(/\d{1,2}:\d{2}[-\u2013]\d{1,2}:\d{2}/g, '')
        .trim();

    const sentences = cleanScript
        .split(/[.!?\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);

    const segmentsPerFrame = Math.ceil(sentences.length / frameCount) || 1;
    const segments = [];

    for (let i = 0; i < frameCount; i++) {
        const start = i * segmentsPerFrame;
        const end = Math.min(start + segmentsPerFrame, sentences.length);
        const segmentText = sentences.slice(start, end).join('. ');

        if (segmentText) {
            segments.push(segmentText);
        }
    }

    while (segments.length < frameCount) {
        segments.push(`Visual continuation of: ${segments[segments.length - 1] || 'the scene'}`);
    }

    return segments.slice(0, frameCount);
}

/**
 * Generate thumbnail using Gemini or Pollinations
 */
async function generateThumbnail(title, options = {}) {
    const {
        style = 'viral youtube thumbnail',
        outputDir = path.join(__dirname, 'uploads')
    } = options;

    const prompt = `YouTube thumbnail for video titled: "${title}". ${style}. High contrast, bold colors, eye-catching, professional design, 16:9. No text in image.`;

    return generateImages(prompt, { count: 3, aspectRatio: '16:9', outputDir });
}

module.exports = {
    generateImages,
    generateVideoFrames,
    generateThumbnail,
    parseScriptIntoSegments
};
