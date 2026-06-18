/**
 * Gemini Image Generation Module
 * Uses Google Gemini API OR Hugging Face Inference API (FREE fallback)
 * Fallback: SVG Placeholder (always works, no internet needed)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp';

// Hugging Face Inference API - FREE tier, no key needed for public models
const HF_API_URL = 'https://api-inference.huggingface.co/models';
const HF_IMAGE_MODELS = [
    'stabilityai/stable-diffusion-xl-base-1.0',
    'runwayml/stable-diffusion-v1-5',
    'prompthero/openjourney'
];

/**
 * Generate images using Gemini -> Hugging Face -> SVG Placeholder
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

    // Try Gemini first if key available
    if (GEMINI_API_KEY) {
        try {
            return await generateWithGemini(prompt, { count, aspectRatio, outputDir });
        } catch (err) {
            console.log('Gemini failed, trying Hugging Face:', err.message);
        }
    }

    // Try Hugging Face Inference API (free, no key for public models)
    try {
        return await generateWithHuggingFace(prompt, { count, aspectRatio, outputDir });
    } catch (err) {
        console.log('Hugging Face failed, using SVG placeholders:', err.message);
    }

    // Final fallback: SVG placeholders (always works, instant)
    return await generateWithSVGPlaceholder(prompt, { count, aspectRatio, outputDir });
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
            const enhancedPrompt = `${prompt}. High quality, professional, cinematic lighting, detailed, ${aspectRatio} aspect ratio.`;
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
                generationConfig: { responseModalities: ['Text', 'Image'] }
            });
            const response = result.response;
            let imageData = null;
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) imageData = part.inlineData.data;
            }
            if (imageData) {
                const filename = `image_${Date.now()}_${i}.png`;
                const filepath = path.join(outputDir, filename);
                fs.writeFileSync(filepath, Buffer.from(imageData, 'base64'));
                images.push({ url: '/uploads/' + filename, filepath, prompt: enhancedPrompt, index: i });
                console.log(`     Image ${i + 1} saved: ${filename}`);
            }
        } catch (error) {
            console.error(`     Image ${i + 1} failed:`, error.message);
        }
    }
    if (images.length === 0) throw new Error('Gemini returned no images');
    return { success: true, images, count: images.length, prompt, source: 'gemini' };
}

async function generateWithHuggingFace(prompt, options) {
    const { count, aspectRatio, outputDir } = options;
    const images = [];
    const [width, height] = aspectRatio === '16:9' ? [1024, 576] :
                           aspectRatio === '9:16' ? [576, 1024] : [1024, 1024];

    for (let i = 0; i < count; i++) {
        let success = false;
        for (const modelId of HF_IMAGE_MODELS) {
            if (success) break;
            try {
                console.log(`  [HF] Trying ${modelId} for image ${i + 1}/${count}...`);
                const response = await axios.post(
                    `${HF_API_URL}/${modelId}`,
                    { inputs: `${prompt}, high quality, professional, cinematic, ${aspectRatio}` },
                    {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': process.env.HF_API_KEY ? `Bearer ${process.env.HF_API_KEY}` : undefined
                        }
                    }
                );
                const buffer = Buffer.from(response.data);
                if (buffer.length > 1000 && (buffer[0] === 0x89 || buffer[0] === 0xFF)) {
                    const ext = buffer[0] === 0x89 ? 'png' : 'jpg';
                    const filename = `image_${Date.now()}_${i}.${ext}`;
                    const filepath = path.join(outputDir, filename);
                    fs.writeFileSync(filepath, buffer);
                    images.push({ url: '/uploads/' + filename, filepath, prompt, index: i, source: 'huggingface' });
                    console.log(`     Image ${i + 1} saved: ${filename} (${(buffer.length/1024).toFixed(1)}KB)`);
                    success = true;
                }
            } catch (error) {
                console.log(`     [HF] ${modelId} failed:`, error.message);
            }
        }
        if (!success && i < count - 1) await new Promise(r => setTimeout(r, 1000));
    }
    if (images.length === 0) throw new Error('Hugging Face returned no images');
    return { success: true, images, count: images.length, prompt, source: 'huggingface' };
}

async function generateWithSVGPlaceholder(prompt, options) {
    const { count, aspectRatio, outputDir } = options;
    const images = [];
    const [width, height] = aspectRatio === '16:9' ? [1280, 720] :
                           aspectRatio === '9:16' ? [720, 1280] : [1024, 1024];

    console.log(`  [SVG] Creating ${count} placeholder images...`);

    for (let i = 0; i < count; i++) {
        try {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <defs>
                    <linearGradient id="bg${i}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#${['0f0f23','1a0a2e','16213e','0d1b2a'][i%4]}"/>
                        <stop offset="100%" style="stop-color:#${['1a1a2e','2d1b4e','1b2838','1b263b'][i%4]}"/>
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#bg${i})"/>
                <rect x="5%" y="5%" width="90%" height="90%" fill="none" rx="30" stroke="#00f3ff" stroke-width="2" opacity="0.3"/>
                <text x="50%" y="42%" font-family="Arial,sans-serif" font-size="${width > height ? '36' : '28'}" font-weight="bold" fill="#00f3ff" text-anchor="middle">NeuroTube AI</text>
                <text x="50%" y="52%" font-family="Arial,sans-serif" font-size="${width > height ? '18' : '14'}" fill="#e0e0e0" text-anchor="middle">${prompt.substring(0, 40).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text>
                <text x="50%" y="60%" font-family="Arial,sans-serif" font-size="${width > height ? '14' : '12'}" fill="#888" text-anchor="middle">Image ${i + 1} | Placeholder</text>
                <text x="50%" y="68%" font-family="Arial,sans-serif" font-size="12" fill="#555" text-anchor="middle">API temporarily unavailable - using placeholder</text>
            </svg>`;

            const svgPath = path.join(outputDir, `temp_${Date.now()}_${i}.svg`);
            const pngPath = path.join(outputDir, `image_${Date.now()}_${i}.png`);
            fs.writeFileSync(svgPath, svg);

            const { exec } = require('child_process');
            const util = require('util');
            const execPromise = util.promisify(exec);

            try {
                await execPromise(`ffmpeg -y -i "${svgPath}" -vf "scale=${width}:${height}" "${pngPath}" 2>/dev/null`);
                fs.unlinkSync(svgPath);
            } catch(e) {
                fs.renameSync(svgPath, pngPath);
            }

            images.push({
                url: '/uploads/' + path.basename(pngPath),
                filepath: pngPath,
                prompt: prompt,
                index: i,
                source: 'svg-placeholder'
            });
            console.log(`     Placeholder ${i + 1} created`);
        } catch (e) {
            console.error(`     Placeholder ${i + 1} failed:`, e.message);
        }
    }

    return {
        success: true,
        images,
        count: images.length,
        prompt,
        source: 'svg-placeholder',
        note: 'Using placeholder images because image generation APIs are unavailable. Set GEMINI_API_KEY or HF_API_KEY for real images.'
    };
}

async function generateVideoFrames(script, options = {}) {
    const {
        frameCount = 30,
        outputDir = path.join(__dirname, 'uploads'),
        style = 'cinematic'
    } = options;

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const segments = parseScriptIntoSegments(script, frameCount);
    const frames = [];
    console.log(`[Video Frames] Generating ${frameCount} frames from script...`);

    // Try to generate real images first, fallback to placeholders
    let usePlaceholders = false;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const framePrompt = `Scene ${i + 1}/${frameCount}: ${segment}. ${style} style, cinematic composition, professional photography, high detail, 16:9.`;

        try {
            if (!usePlaceholders) {
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
                        duration: 1,
                        source: result.source
                    });
                }
            } else {
                throw new Error('Using placeholders');
            }
        } catch (error) {
            // Create placeholder for this frame
            try {
                const [w, h] = [1280, 720];
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
                    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f0f23"/><stop offset="100%" style="stop-color:#1a1a2e"/></linearGradient></defs>
                    <rect width="100%" height="100%" fill="url(#g)"/>
                    <rect x="5%" y="5%" width="90%" height="90%" fill="#16213e" rx="20" stroke="#00f3ff" stroke-width="1" opacity="0.5"/>
                    <text x="50%" y="40%" font-family="Arial" font-size="24" fill="#00f3ff" text-anchor="middle">Scene ${i + 1}</text>
                    <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#e0e0e0" text-anchor="middle">${segment.substring(0, 50).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text>
                    <text x="50%" y="60%" font-family="Arial" font-size="12" fill="#888" text-anchor="middle">NeuroTube AI Generated</text>
                </svg>`;
                const svgPath = path.join(outputDir, `frame_${Date.now()}_${i}.svg`);
                const pngPath = path.join(outputDir, `frame_${Date.now()}_${i}.png`);
                fs.writeFileSync(svgPath, svg);
                try {
                    const { exec } = require('child_process');
                    const util = require('util');
                    const execPromise = util.promisify(exec);
                    await execPromise(`ffmpeg -y -i "${svgPath}" -vf "scale=${w}:${h}" "${pngPath}" 2>/dev/null`);
                    fs.unlinkSync(svgPath);
                } catch(e) { fs.renameSync(svgPath, pngPath); }

                frames.push({
                    index: i,
                    segment,
                    imageUrl: '/uploads/' + path.basename(pngPath),
                    filepath: pngPath,
                    duration: 1,
                    source: 'svg-placeholder'
                });
                usePlaceholders = true;
            } catch(e) {
                console.error(`   Frame ${i + 1} failed:`, e.message);
            }
        }

        if (i < segments.length - 1) await new Promise(r => setTimeout(r, 500));
    }

    return {
        success: frames.length > 0,
        frames,
        frameCount: frames.length,
        estimatedDuration: frames.length,
        source: frames[0]?.source || 'unknown'
    };
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