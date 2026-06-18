/**
 * NeuroTube Canvas Image Generator
 * Creates professional images using node-canvas (no APIs needed)
 * Works 100% offline - generates gradients, shapes, text overlays
 */

const fs = require('fs');
const path = require('path');

// Try to use canvas, fallback to SVG if not available
let Canvas, createCanvas, loadImage;
try {
    const canvas = require('canvas');
    Canvas = canvas.Canvas;
    createCanvas = canvas.createCanvas;
    loadImage = canvas.loadImage;
} catch (e) {
    console.log('[Canvas] node-canvas not installed, using SVG fallback');
}

// Topic-based visual themes
const THEMES = {
    'alien': { bg: ['#0a0a1a', '#1a0a2e'], accent: '#00ff88', shapes: 'circles' },
    'space': { bg: ['#000011', '#0a0a2e'], accent: '#4488ff', shapes: 'stars' },
    'attack': { bg: ['#1a0000', '#2e0a0a'], accent: '#ff0040', shapes: 'lines' },
    'war': { bg: ['#1a0500', '#2e1a0a'], accent: '#ff4400', shapes: 'triangles' },
    'dance': { bg: ['#0a0a1a', '#1a0a3e'], accent: '#ff00ff', shapes: 'waves' },
    'music': { bg: ['#0a1a0a', '#0a2e1a'], accent: '#00ff44', shapes: 'waves' },
    'technology': { bg: ['#0a0a1a', '#0a1a2e'], accent: '#00f3ff', shapes: 'grid' },
    'ai': { bg: ['#0a0a1a', '#1a0a3e'], accent: '#bc13fe', shapes: 'circles' },
    'robot': { bg: ['#1a1a1a', '#2e2e2e'], accent: '#ffcc00', shapes: 'grid' },
    'nature': { bg: ['#0a1a0a', '#0a2e1a'], accent: '#44ff88', shapes: 'circles' },
    'default': { bg: ['#0f0f23', '#1a1a2e'], accent: '#00f3ff', shapes: 'circles' }
};

function detectTheme(topic) {
    const lower = topic.toLowerCase();
    for (const [keyword, theme] of Object.entries(THEMES)) {
        if (lower.includes(keyword)) return theme;
    }
    return THEMES['default'];
}

/**
 * Generate a professional image using Canvas
 */
async function generateCanvasImage(prompt, options = {}) {
    const {
        width = 1280,
        height = 720,
        outputDir = path.join(__dirname, 'uploads')
    } = options;

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const theme = detectTheme(prompt);
    const filename = `image_${Date.now()}.png`;
    const filepath = path.join(outputDir, filename);

    // If canvas is available, use it
    if (createCanvas) {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, theme.bg[0]);
        gradient.addColorStop(1, theme.bg[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw shapes based on theme
        drawShapes(ctx, width, height, theme);

        // Draw accent glow
        const glow = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/1.5);
        glow.addColorStop(0, theme.accent + '22');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        // Draw border frame
        ctx.strokeStyle = theme.accent + '44';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, width - 40, height - 40);

        // Draw title text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${width > height ? '48px' : '36px'} Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word wrap title
        const words = prompt.split(' ');
        const lines = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine + word + ' ';
            if (ctx.measureText(testLine).width > width * 0.8) {
                lines.push(currentLine);
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);

        const lineHeight = width > height ? 60 : 45;
        const startY = height / 2 - (lines.length * lineHeight) / 2;

        lines.forEach((line, i) => {
            // Text shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(line.trim(), width/2 + 2, startY + i * lineHeight + 2);
            // Main text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(line.trim(), width/2, startY + i * lineHeight);
        });

        // Draw subtitle
        ctx.font = `${width > height ? '24px' : '18px'} Arial, sans-serif`;
        ctx.fillStyle = theme.accent;
        ctx.fillText('NeuroTube AI Generated', width/2, startY + lines.length * lineHeight + 30);

        // Save
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filepath, buffer);
    } else {
        // SVG fallback
        return generateSVGImage(prompt, { width, height, outputDir });
    }

    return {
        success: true,
        url: '/uploads/' + filename,
        filepath,
        prompt,
        source: 'canvas',
        theme: theme
    };
}

function drawShapes(ctx, width, height, theme) {
    ctx.fillStyle = theme.accent + '11';

    if (theme.shapes === 'circles') {
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const r = Math.random() * 100 + 20;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (theme.shapes === 'stars') {
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const r = Math.random() * 3 + 1;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff' + Math.floor(Math.random() * 99).toString().padStart(2, '0');
            ctx.fill();
        }
    } else if (theme.shapes === 'lines') {
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * width, Math.random() * height);
            ctx.lineTo(Math.random() * width, Math.random() * height);
            ctx.strokeStyle = theme.accent + '22';
            ctx.lineWidth = Math.random() * 3 + 1;
            ctx.stroke();
        }
    } else if (theme.shapes === 'waves') {
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            for (let x = 0; x < width; x += 10) {
                const y = height / 2 + Math.sin(x * 0.01 + i) * 50 + (i - 2) * 30;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = theme.accent + '18';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    } else if (theme.shapes === 'grid') {
        ctx.strokeStyle = theme.accent + '11';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    } else {
        // triangles
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * width, Math.random() * height);
            ctx.lineTo(Math.random() * width, Math.random() * height);
            ctx.lineTo(Math.random() * width, Math.random() * height);
            ctx.closePath();
            ctx.fillStyle = theme.accent + '0d';
            ctx.fill();
        }
    }
}

async function generateSVGImage(prompt, options) {
    const { width, height, outputDir } = options;
    const theme = detectTheme(prompt);
    const filename = `image_${Date.now()}.png`;
    const filepath = path.join(outputDir, filename);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${theme.bg[0]}"/>
                <stop offset="100%" style="stop-color:${theme.bg[1]}"/>
            </linearGradient>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:${theme.accent};stop-opacity:0.15"/>
                <stop offset="100%" style="stop-color:transparent"/>
            </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <rect width="100%" height="100%" fill="url(#glow)"/>
        <rect x="20" y="20" width="${width-40}" height="${height-40}" fill="none" stroke="${theme.accent}" stroke-width="2" opacity="0.3" rx="20"/>
        <text x="50%" y="45%" font-family="Arial,sans-serif" font-size="${width > height ? '42' : '32'}" font-weight="bold" fill="white" text-anchor="middle">${prompt.substring(0, 30).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text>
        <text x="50%" y="55%" font-family="Arial,sans-serif" font-size="${width > height ? '20' : '16'}" fill="${theme.accent}" text-anchor="middle">NeuroTube AI Generated</text>
    </svg>`;

    const svgPath = filepath.replace('.png', '.svg');
    fs.writeFileSync(svgPath, svg);

    try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        await execPromise(`ffmpeg -y -i "${svgPath}" -vf "scale=${width}:${height}" "${filepath}" 2>/dev/null`);
        fs.unlinkSync(svgPath);
    } catch(e) {
        fs.renameSync(svgPath, filepath);
    }

    return {
        success: true,
        url: '/uploads/' + filename,
        filepath,
        prompt,
        source: 'svg',
        theme
    };
}

/**
 * Generate multiple images
 */
async function generateImages(prompt, options = {}) {
    const { count = 4, aspectRatio = '16:9', outputDir } = options;
    const [width, height] = aspectRatio === '16:9' ? [1280, 720] :
                           aspectRatio === '9:16' ? [720, 1280] : [1024, 1024];

    const images = [];
    for (let i = 0; i < count; i++) {
        const result = await generateCanvasImage(prompt, { width, height, outputDir });
        if (result.success) {
            result.index = i;
            images.push(result);
        }
    }

    return {
        success: images.length > 0,
        images,
        count: images.length,
        prompt,
        source: createCanvas ? 'canvas' : 'svg'
    };
}

/**
 * Generate video frames from script
 */
async function generateVideoFrames(script, options = {}) {
    const {
        frameCount = 30,
        outputDir = path.join(__dirname, 'uploads'),
        style = 'cinematic'
    } = options;

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const segments = parseScriptIntoSegments(script, frameCount);
    const frames = [];

    for (let i = 0; i < segments.length; i++) {
        const result = await generateCanvasImage(
            `Scene ${i+1}: ${segments[i]}`,
            { width: 1280, height: 720, outputDir }
        );
        if (result.success) {
            frames.push({
                index: i,
                segment: segments[i],
                imageUrl: result.url,
                filepath: result.filepath,
                duration: 1,
                source: result.source
            });
        }
    }

    return {
        success: frames.length > 0,
        frames,
        frameCount: frames.length,
        estimatedDuration: frames.length
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
    const { outputDir = path.join(__dirname, 'uploads') } = options;
    return generateImages(title, { count: 3, aspectRatio: '16:9', outputDir });
}

module.exports = {
    generateImages,
    generateVideoFrames,
    generateThumbnail,
    generateCanvasImage,
    parseScriptIntoSegments
};