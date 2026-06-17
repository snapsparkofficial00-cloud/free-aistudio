/**
 * Gemini Image Generation Module - FIXED v4.1
 * Fixes: JPEG/PNG format detection, retry logic, validation
 * Uses Google Gemini API for FREE image generation
 * Fallback: Pollinations AI (100% free, no key needed)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp-image-generation';

// ============================================================
// IMAGE FORMAT DETECTION (Fixes Bug #1)
// ============================================================

/**
 * Detect image format from buffer magic bytes
 * @param {Buffer} buffer
 * @returns {string} 'png', 'jpeg', 'webp', 'gif', or 'unknown'
 */
function detectImageFormat(buffer) {
    if (!buffer || buffer.length < 4) return 'unknown';

    const magic = buffer.toString('hex', 0, 8).toLowerCase();

    // PNG: 89 50 4E 47
    if (magic.startsWith('89504e47')) return 'png';
    // JPEG: FF D8 FF E0/E1/E8
    if (magic.startsWith('ffd8ff')) return 'jpeg';
    // WEBP: 52 49 46 46 ... 57 45 42 50
    if (magic.startsWith('52494646')) return 'webp';
    // GIF: 47 49 46 38
    if (magic.startsWith('47494638')) return 'gif';
    // BMP: 42 4D
    if (magic.startsWith('424d')) return 'bmp';

    return 'unknown';
}

/**
 * Validate image buffer is a valid image
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isValidImage(buffer) {
    const format = detectImageFormat(buffer);
    if (format === 'unknown') return false;

    // Minimum size check (1KB)
    if (buffer.length < 1024) return false;

    // Corruption check: ensure file isn't truncated
    if (format === 'png') {
        // PNG ends with IEND chunk: 49 45 4E 44 AE 42 60 82
        const endMagic = buffer.slice(-8).toString('hex').toLowerCase();
        return endMagic.includes('49454e44');
    }
    if (format === 'jpeg') {
        // JPEG ends with FF D9
        const endMagic = buffer.slice(-2).toString('hex').toLowerCase();
        return endMagic === 'ffd9';
    }

    return true;
}

/**
 * Save image with correct extension based on detected format
 * @param {Buffer} buffer
 * @param {string} outputDir
 * @param {string} baseName
 * @returns {string} filepath
 */
function saveImageWithCorrectFormat(buffer, outputDir, baseName) {
    const format = detectImageFormat(buffer);
    const ext = format === 'unknown' ? 'png' : format;
    const filename = `${baseName}.${ext}`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, buffer);
    return { filepath, filename, format, ext };
}

// ============================================================
// GENERATION FUNCTIONS
// ============================================================

async function generateImages(prompt, options = {}) {
    const {
        count = 4,
        aspectRatio = '16:9',
        outputDir = path.join(__dirname, 'uploads')
    } = options;

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    if (GEMINI_API_KEY) {
        try {
            return await generateWithGemini(prompt, { count, aspectRatio, outputDir });
        } catch (err) {
            console.log('Gemini failed, falling back to Pollinations:', err.message);
        }
    }

    return await generateWithPollinations(prompt, { count, aspectRatio, outputDir });
}

async function generateWithGemini(prompt, options) {
    const { count, aspectRatio, outputDir } = options;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_IMAGE_MODEL });
    const images = [];
    const actualCount = Math.min(Math.max(count, 1), 4);

    for (let i = 0; i < actualCount; i++) {
        try {
            console.log(`  [Gemini] Generating image ${i + 1}/${actualCount}...`);
            const enhancedPrompt = `${prompt}. High quality, professional, cinematic lighting, detailed, ${aspectRatio} aspect ratio. Image ${i + 1} of ${actualCount}.`;

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
                generationConfig: { responseModalities: ['Text', 'Image'] }
            });

            const response = result.response;
            let imageData = null;
            let imageText = '';

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) imageData = part.inlineData.data;
                if (part.text) imageText += part.text;
            }

            if (imageData) {
                const buffer = Buffer.from(imageData, 'base64');

                // FIX: Validate and save with correct format
                if (!isValidImage(buffer)) {
                    console.log(`     Image ${i + 1} invalid, retrying...`);
                    i--; continue; // retry this index
                }

                const { filepath, filename, format } = saveImageWithCorrectFormat(
                    buffer, outputDir, `image_${Date.now()}_${i}`
                );

                images.push({
                    url: '/uploads/' + filename,
                    filepath,
                    prompt: enhancedPrompt,
                    text: imageText,
                    index: i,
                    format,
                    size: buffer.length
                });
                console.log(`     Image ${i + 1} saved: ${filename} (${format}, ${(buffer.length/1024).toFixed(1)}KB)`);
            }
        } catch (error) {
            console.error(`     Image ${i + 1} failed:`, error.message);
        }
    }

    if (images.length === 0) throw new Error('Gemini returned no valid images');
    return { success: true, images, count: images.length, prompt, source: 'gemini' };
}

/**
 * FIXED Pollinations generator with retry, format detection, validation
 */
async function generateWithPollinations(prompt, options) {
    const { count, aspectRatio, outputDir } = options;
    const images = [];
    const [width, height] = aspectRatio === '16:9' ? [1280, 720] :
                           aspectRatio === '9:16' ? [720, 1280] : [1024, 1024];

    for (let i = 0; i < count; i++) {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                console.log(`  [Pollinations] Generating image ${i + 1}/${count} (attempt ${attempts}/${maxAttempts})...`);

                const seed = Date.now() + i + attempts * 1000;
                const enhancedPrompt = encodeURIComponent(
                    `${prompt}, high quality, professional, cinematic lighting, detailed, ${aspectRatio}`
                );
                const url = `https://image.pollinations.ai/prompt/${enhancedPrompt}?seed=${seed}&width=${width}&height=${height}&nologo=true&noWatermark=true`;

                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 60000,
                    headers: { 'Accept': 'image/*' }
                });

                const buffer = Buffer.from(response.data);

                // FIX: Detect actual format and validate
                const format = detectImageFormat(buffer);

                if (format === 'unknown') {
                    console.log(`     Attempt ${attempts}: Invalid image data, retrying...`);
                    if (attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 2000 * attempts));
                        continue;
                    }
                    throw new Error('Invalid image format after retries');
                }

                if (!isValidImage(buffer)) {
                    console.log(`     Attempt ${attempts}: Corrupted image, retrying...`);
                    if (attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 2000 * attempts));
                        continue;
                    }
                    throw new Error('Corrupted image after retries');
                }

                const { filepath, filename } = saveImageWithCorrectFormat(
                    buffer, outputDir, `image_${Date.now()}_${i}`
                );

                images.push({
                    url: '/uploads/' + filename,
                    filepath,
                    prompt: prompt,
                    index: i,
                    source: 'pollinations',
                    format,
                    size: buffer.length
                });

                console.log(`     Image ${i + 1} saved: ${filename} (${format}, ${(buffer.length/1024).toFixed(1)}KB)`);
                break; // success, move to next image

            } catch (error) {
                console.error(`     Attempt ${attempts} failed:`, error.message);
                if (attempts >= maxAttempts) {
                    console.error(`     Image ${i + 1} failed after ${maxAttempts} attempts`);
                } else {
                    await new Promise(r => setTimeout(r, 2000 * attempts));
                }
            }
        }

        if (i < count - 1) await new Promise(r => setTimeout(r, 1000));
    }

    if (images.length === 0) throw new Error('Pollinations returned no valid images');
    return { success: true, images, count: images.length, prompt, source: 'pollinations' };
}

async function generateVideoFrames(script, options = {}) {
    const { frameCount = 30, outputDir = path.join(__dirname, 'uploads'), style = 'cinematic' } = options;
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

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
                    format: result.images[0].format,
                    duration: 1
                });
            }
            if (i < segments.length - 1) await new Promise(r => setTimeout(r, 800));
        } catch (error) {
            console.error(`   Frame ${i + 1} failed:`, error.message);
        }
    }

    return { success: frames.length > 0, frames, frameCount: frames.length, estimatedDuration: frames.length };
}

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
        if (segmentText) segments.push(segmentText);
    }

    while (segments.length < frameCount) {
        segments.push(`Visual continuation of: ${segments[segments.length - 1] || 'the scene'}`);
    }

    return segments.slice(0, frameCount);
}

async function generateThumbnail(title, options = {}) {
    const { style = 'viral youtube thumbnail', outputDir = path.join(__dirname, 'uploads') } = options;
    const prompt = `YouTube thumbnail for video titled: "${title}". ${style}. High contrast, bold colors, eye-catching, professional design, 16:9. No text in image.`;
    return generateImages(prompt, { count: 3, aspectRatio: '16:9', outputDir });
}

module.exports = {
    generateImages,
    generateVideoFrames,
    generateThumbnail,
    parseScriptIntoSegments,
    detectImageFormat,
    isValidImage,
    saveImageWithCorrectFormat
};
