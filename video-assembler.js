/**
 * Video Assembler Module
 * Combines images + audio into video using ffmpeg
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

/**
 * Assemble video from frames and audio using ffmpeg
 * @param {Array} frames - Array of frame objects with filepath
 * @param {string} audioPath - Path to audio file
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function assembleVideo(frames, audioPath, options = {}) {
    const {
        outputPath,
        fps = 1,
        resolution = '1280x720',
        outputDir = path.join(__dirname, 'uploads')
    } = options;

    if (!frames || frames.length === 0) {
        throw new Error('No frames provided');
    }

    const outputFile = outputPath || path.join(outputDir, `video_${Date.now()}.mp4`);
    const tempDir = path.join(outputDir, `temp_${Date.now()}`);

    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    try {
        console.log(`[Video] Assembling ${frames.length} frames...`);

        // Copy frames to temp dir with sequential names
        let copiedCount = 0;
        frames.forEach((frame, i) => {
            const src = frame.filepath || frame;
            if (fs.existsSync(src)) {
                const dest = path.join(tempDir, `frame_${String(i).padStart(4, '0')}.png`);
                fs.copyFileSync(src, dest);
                copiedCount++;
            }
        });

        if (copiedCount === 0) {
            throw new Error('No valid frame files found');
        }

        const framePattern = path.join(tempDir, 'frame_%04d.png');
        const [w, h] = resolution.split('x');
        let ffmpegCmd;

        if (audioPath && fs.existsSync(audioPath)) {
            ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${framePattern}" -i "${audioPath}" -c:v libx264 -pix_fmt yuv420p -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black" -c:a aac -b:a 128k -shortest "${outputFile}"`;
        } else {
            ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${framePattern}" -c:v libx264 -pix_fmt yuv420p -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black" -t ${frames.length} "${outputFile}"`;
        }

        await execPromise(ffmpegCmd);

        // Cleanup temp dir
        fs.rmSync(tempDir, { recursive: true, force: true });

        const stats = fs.statSync(outputFile);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

        // Get actual duration using ffprobe
        let duration = frames.length;
        try {
            const { stdout } = await execPromise(
                `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputFile}"`
            );
            duration = parseFloat(stdout.trim()) || frames.length;
        } catch (e) {
            // fallback
        }

        return {
            success: true,
            videoPath: outputFile,
            videoUrl: '/uploads/' + path.basename(outputFile),
            duration: Math.round(duration),
            frameCount: copiedCount,
            resolution,
            size: stats.size,
            sizeMB
        };

    } catch (error) {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        throw new Error('Video assembly failed: ' + error.message);
    }
}

/**
 * Create slideshow from image paths
 */
async function createSlideshow(imagePaths, options = {}) {
    const {
        duration = 30,
        audioPath,
        outputDir = path.join(__dirname, 'uploads'),
        resolution = '1280x720'
    } = options;

    const frames = imagePaths.map((imgPath) => ({
        filepath: imgPath,
        duration: 1
    }));

    return assembleVideo(frames, audioPath, { outputDir, resolution });
}

/**
 * Get audio duration
 */
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
    getAudioDuration
};
