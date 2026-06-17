/**
 * Video Assembler Module - FIXED v4.1
 * Fixes: Image validation, concat demuxer, temp cleanup, fps calculation
 * Combines images + audio into video using ffmpeg
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

// Import validation from gemini-image (or inline if needed)
function detectImageFormat(buffer) {
    if (!buffer || buffer.length < 4) return 'unknown';
    const magic = buffer.toString('hex', 0, 8).toLowerCase();
    if (magic.startsWith('89504e47')) return 'png';
    if (magic.startsWith('ffd8ff')) return 'jpeg';
    if (magic.startsWith('52494646')) return 'webp';
    if (magic.startsWith('47494638')) return 'gif';
    return 'unknown';
}

function isValidImageFile(filepath) {
    try {
        if (!fs.existsSync(filepath)) return false;
        const stats = fs.statSync(filepath);
        if (stats.size < 1024) return false; // too small

        const buffer = fs.readFileSync(filepath);
        const format = detectImageFormat(buffer);
        if (format === 'unknown') return false;

        // Check file isn't truncated
        if (format === 'png') {
            const end = buffer.slice(-8).toString('hex').toLowerCase();
            return end.includes('49454e44');
        }
        if (format === 'jpeg') {
            const end = buffer.slice(-2).toString('hex').toLowerCase();
            return end === 'ffd9';
        }
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Assemble video from frames and audio using ffmpeg - FIXED
 * Uses concat demuxer instead of frame pattern for reliability
 */
async function assembleVideo(frames, audioPath, options = {}) {
    const {
        outputPath,
        fps = null, // auto-calculated if null
        resolution = '1280x720',
        outputDir = path.join(__dirname, 'uploads')
    } = options;

    if (!frames || frames.length === 0) {
        throw new Error('No frames provided');
    }

    const outputFile = outputPath || path.join(outputDir, `video_${Date.now()}.mp4`);
    const tempDir = path.join(outputDir, `temp_${Date.now()}`);
    let tempCreated = false;

    // Ensure output dir exists
    fs.mkdirSync(outputDir, { recursive: true });

    try {
        console.log(`[Video] Assembling ${frames.length} frames...`);
        fs.mkdirSync(tempDir, { recursive: true });
        tempCreated = true;

        // FIX: Validate and copy frames, skip invalid ones
        const validFrames = [];
        let copiedCount = 0;

        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const src = frame.filepath || frame;

            if (!fs.existsSync(src)) {
                console.log(`[Video] Frame ${i + 1}: File not found, skipping`);
                continue;
            }

            // FIX: Validate image integrity
            if (!isValidImageFile(src)) {
                console.log(`[Video] Frame ${i + 1}: Invalid/corrupted image, skipping`);
                continue;
            }

            // Copy to temp with sequential index (no gaps!)
            const dest = path.join(tempDir, `frame_${String(copiedCount).padStart(4, '0')}.png`);
            fs.copyFileSync(src, dest);
            validFrames.push({
                filepath: dest,
                originalIndex: i,
                duration: frame.duration || 1
            });
            copiedCount++;
        }

        if (copiedCount === 0) {
            throw new Error('No valid frame files found after validation');
        }

        if (copiedCount < frames.length) {
            console.log(`[Video] Warning: ${frames.length - copiedCount} frames were invalid and skipped`);
        }

        // FIX: Calculate fps based on audio duration or frame count
        let audioDuration = validFrames.length; // default 1 sec per frame
        if (audioPath && fs.existsSync(audioPath)) {
            try {
                audioDuration = await getAudioDuration(audioPath);
                console.log(`[Video] Audio duration: ${audioDuration}s`);
            } catch (e) {
                console.log('[Video] Could not detect audio duration, using frame count');
            }
        }

        const calculatedFps = fps || (validFrames.length / audioDuration);
        const finalFps = Math.max(calculatedFps, 0.1); // minimum 0.1 fps
        console.log(`[Video] Using fps: ${finalFps.toFixed(2)} (${validFrames.length} frames / ${audioDuration}s)`);

        // FIX: Use concat demuxer instead of frame pattern for reliability
        // Create concat list file
        const concatListPath = path.join(tempDir, 'concat_list.txt');
        const concatLines = validFrames.map(f => {
            // Escape single quotes in path for ffmpeg concat
            const escapedPath = f.filepath.replace(/'/g, "'\''");
            return `file '${escapedPath}'\nduration ${f.duration || 1}`;
        }).join('\n');

        fs.writeFileSync(concatListPath, concatLines + '\n');

        const [w, h] = resolution.split('x');
        let ffmpegCmd;

        if (audioPath && fs.existsSync(audioPath)) {
            // With audio: use concat demuxer + audio stream
            ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -i "${audioPath}" -c:v libx264 -pix_fmt yuv420p -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,fps=${finalFps}" -c:a aac -b:a 128k -shortest "${outputFile}"`;
        } else {
            // Without audio: concat demuxer only
            ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -pix_fmt yuv420p -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,fps=${finalFps}" -t ${audioDuration} "${outputFile}"`;
        }

        console.log(`[Video] Running ffmpeg...`);
        const { stdout, stderr } = await execPromise(ffmpegCmd);

        if (stderr && stderr.includes('Error')) {
            console.warn('[Video] ffmpeg stderr:', stderr.substring(0, 500));
        }

        // Get actual duration using ffprobe
        let duration = audioDuration;
        try {
            const { stdout: durOut } = await execPromise(
                `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputFile}"`
            );
            duration = parseFloat(durOut.trim()) || audioDuration;
        } catch (e) {
            // fallback
        }

        const stats = fs.statSync(outputFile);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

        return {
            success: true,
            videoPath: outputFile,
            videoUrl: '/uploads/' + path.basename(outputFile),
            duration: Math.round(duration),
            frameCount: copiedCount,
            totalFramesRequested: frames.length,
            validFrames: copiedCount,
            invalidFrames: frames.length - copiedCount,
            resolution,
            size: stats.size,
            sizeMB,
            fps: finalFps.toFixed(2)
        };

    } catch (error) {
        console.error('[Video] Assembly failed:', error.message);
        throw new Error('Video assembly failed: ' + error.message);
    } finally {
        // FIX: Always cleanup temp directory
        if (tempCreated && fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
                console.log('[Video] Cleaned up temp directory');
            } catch (e) {
                console.error('[Video] Failed to cleanup temp dir:', e.message);
            }
        }
    }
}

async function createSlideshow(imagePaths, options = {}) {
    const {
        duration = 30,
        audioPath,
        outputDir = path.join(__dirname, 'uploads'),
        resolution = '1280x720'
    } = options;

    // Validate all images first
    const validPaths = imagePaths.filter(p => {
        const valid = isValidImageFile(p);
        if (!valid) console.log(`[Slideshow] Skipping invalid image: ${p}`);
        return valid;
    });

    if (validPaths.length === 0) {
        throw new Error('No valid images for slideshow');
    }

    const frames = validPaths.map((imgPath, i) => ({
        filepath: imgPath,
        duration: duration / validPaths.length
    }));

    return assembleVideo(frames, audioPath, { outputDir, resolution });
}

async function getAudioDuration(audioPath) {
    try {
        const { stdout } = await execPromise(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
        );
        return parseFloat(stdout.trim()) || 30;
    } catch {
        return 30;
    }
}

module.exports = {
    assembleVideo,
    createSlideshow,
    getAudioDuration,
    isValidImageFile,
    detectImageFormat
};
