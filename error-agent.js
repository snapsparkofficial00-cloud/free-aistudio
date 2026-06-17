/**
 * AI Error-Fixing Agent - Self-Healing Pipeline Monitor
 * Watches the video pipeline, detects failures, and auto-applies fixes
 * Integrates with NeuroTube AI PRO v4.0
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Error patterns and their fixes
const ERROR_PATTERNS = {
    // Image format errors
    'Invalid PNG signature': {
        type: 'image_format',
        severity: 'critical',
        fix: 'auto_detect_format',
        description: 'Image saved with wrong extension or corrupted download'
    },
    'Could not find codec parameters': {
        type: 'image_format', 
        severity: 'critical',
        fix: 'revalidate_images',
        description: 'ffmpeg cannot decode image files'
    },
    'Invalid data found when processing input': {
        type: 'image_corruption',
        severity: 'critical',
        fix: 'regenerate_frames',
        description: 'Corrupted image data in frame files'
    },
    // ffmpeg errors
    'No such file or directory': {
        type: 'missing_file',
        severity: 'high',
        fix: 'check_paths',
        description: 'Frame file missing or path incorrect'
    },
    'Pattern type mismatch': {
        type: 'frame_pattern',
        severity: 'high',
        fix: 'use_concat_demuxer',
        description: 'Frame sequence has gaps or wrong naming'
    },
    // Network/API errors
    'timeout': {
        type: 'network',
        severity: 'medium',
        fix: 'retry_with_backoff',
        description: 'API request timed out'
    },
    'ECONNREFUSED': {
        type: 'network',
        severity: 'medium',
        fix: 'retry_with_backoff',
        description: 'Connection refused'
    },
    // Audio errors
    'audio stream': {
        type: 'audio',
        severity: 'medium',
        fix: 'regenerate_audio',
        description: 'Audio file corrupted or missing'
    }
};

/**
 * ErrorFixingAgent - Main class
 */
class ErrorFixingAgent {
    constructor(options = {}) {
        this.logFile = options.logFile || path.join(__dirname, 'data', 'error-log.json');
        this.maxRetries = options.maxRetries || 3;
        this.fixHistory = [];
        this.ensureLogFile();
    }

    ensureLogFile() {
        const dir = path.dirname(this.logFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.logFile)) fs.writeFileSync(this.logFile, '[]');
    }

    /**
     * Analyze error and determine fix strategy
     */
    analyzeError(errorMessage, context = {}) {
        const errorText = (errorMessage || '').toLowerCase();
        const findings = [];

        for (const [pattern, info] of Object.entries(ERROR_PATTERNS)) {
            if (errorText.includes(pattern.toLowerCase())) {
                findings.push({
                    pattern,
                    ...info,
                    matched: true
                });
            }
        }

        // If no pattern matched, do generic analysis
        if (findings.length === 0) {
            findings.push({
                pattern: 'unknown',
                type: 'unknown',
                severity: 'medium',
                fix: 'generic_retry',
                description: errorMessage,
                matched: false
            });
        }

        return {
            originalError: errorMessage,
            findings,
            primaryFix: findings[0]?.fix || 'generic_retry',
            severity: findings[0]?.severity || 'medium',
            context
        };
    }

    /**
     * Apply fix based on analysis
     */
    async applyFix(analysis, pipelineData = {}) {
        const { primaryFix, findings, originalError } = analysis;
        const fixId = Date.now();

        console.log(`[ErrorAgent] Applying fix: ${primaryFix} for error: ${originalError.substring(0, 100)}`);

        let result = { success: false, fixApplied: primaryFix, details: '' };

        try {
            switch (primaryFix) {
                case 'auto_detect_format':
                    result = await this.fixImageFormat(pipelineData);
                    break;
                case 'revalidate_images':
                    result = await this.fixRevalidateImages(pipelineData);
                    break;
                case 'regenerate_frames':
                    result = await this.fixRegenerateFrames(pipelineData);
                    break;
                case 'use_concat_demuxer':
                    result = await this.fixUseConcatDemuxer(pipelineData);
                    break;
                case 'retry_with_backoff':
                    result = await this.fixRetryWithBackoff(pipelineData);
                    break;
                case 'regenerate_audio':
                    result = await this.fixRegenerateAudio(pipelineData);
                    break;
                case 'check_paths':
                    result = await this.fixCheckPaths(pipelineData);
                    break;
                default:
                    result = await this.fixGenericRetry(pipelineData);
            }
        } catch (e) {
            result = { success: false, fixApplied: primaryFix, details: `Fix failed: ${e.message}` };
        }

        // Log the fix attempt
        this.logFix({
            id: fixId,
            timestamp: new Date().toISOString(),
            error: originalError,
            analysis,
            result,
            pipelineData: {
                topic: pipelineData.topic,
                frameCount: pipelineData.frameCount
            }
        });

        return result;
    }

    // ===== FIX IMPLEMENTATIONS =====

    async fixImageFormat(pipelineData) {
        // This fix is applied by using the updated gemini-image module
        // which auto-detects format. We just need to ensure it's loaded.
        return {
            success: true,
            fixApplied: 'auto_detect_format',
            details: 'Image format auto-detection enabled. Files will be saved with correct extension.',
            action: 'use_fixed_gemini_image'
        };
    }

    async fixRevalidateImages(pipelineData) {
        const { frames } = pipelineData;
        if (!frames) return { success: false, details: 'No frames to validate' };

        const validFrames = [];
        const invalidFrames = [];

        for (const frame of frames) {
            const filepath = frame.filepath || frame;
            if (fs.existsSync(filepath)) {
                const buffer = fs.readFileSync(filepath);
                const magic = buffer.toString('hex', 0, 4).toLowerCase();

                // Check if it's actually a valid image
                const isPNG = magic.startsWith('89504e47');
                const isJPEG = magic.startsWith('ffd8');

                if (isPNG || isJPEG) {
                    validFrames.push(frame);
                } else {
                    invalidFrames.push(frame);
                    // Try to fix extension
                    const correctExt = isJPEG ? 'jpg' : (isPNG ? 'png' : null);
                    if (correctExt && filepath.endsWith('.png')) {
                        const newPath = filepath.replace('.png', `.${correctExt}`);
                        fs.renameSync(filepath, newPath);
                        frame.filepath = newPath;
                        validFrames.push(frame);
                    }
                }
            } else {
                invalidFrames.push(frame);
            }
        }

        return {
            success: validFrames.length > 0,
            fixApplied: 'revalidate_images',
            details: `${validFrames.length}/${frames.length} frames valid. ${invalidFrames.length} invalid.`,
            validFrames,
            invalidFrames,
            action: 'filter_invalid_frames'
        };
    }

    async fixRegenerateFrames(pipelineData) {
        const { topic, frameCount, outputDir } = pipelineData;

        // This requires regenerating images - would call the image generator
        return {
            success: false, // requires external action
            fixApplied: 'regenerate_frames',
            details: `Need to regenerate ${frameCount} frames for topic: ${topic}`,
            action: 'regenerate_images',
            params: { topic, frameCount, outputDir }
        };
    }

    async fixUseConcatDemuxer(pipelineData) {
        return {
            success: true,
            fixApplied: 'use_concat_demuxer',
            details: 'Switching from frame pattern to concat demuxer for reliability',
            action: 'use_concat_demuxer_in_ffmpeg'
        };
    }

    async fixRetryWithBackoff(pipelineData) {
        const { apiCall, params } = pipelineData;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const delay = Math.pow(2, attempt) * 1000; // exponential backoff
                await new Promise(r => setTimeout(r, delay));

                // Attempt the API call again
                if (apiCall) {
                    const result = await apiCall(params);
                    return {
                        success: true,
                        fixApplied: 'retry_with_backoff',
                        details: `Success on attempt ${attempt} after ${delay}ms delay`,
                        result
                    };
                }
            } catch (e) {
                console.log(`[ErrorAgent] Retry ${attempt}/${this.maxRetries} failed: ${e.message}`);
                if (attempt === this.maxRetries) {
                    return {
                        success: false,
                        fixApplied: 'retry_with_backoff',
                        details: `All ${this.maxRetries} retries failed`,
                        lastError: e.message
                    };
                }
            }
        }

        return { success: false, fixApplied: 'retry_with_backoff', details: 'No apiCall provided' };
    }

    async fixRegenerateAudio(pipelineData) {
        const { text, voice, outputPath } = pipelineData;
        return {
            success: false,
            fixApplied: 'regenerate_audio',
            details: 'Audio regeneration required',
            action: 'regenerate_audio',
            params: { text, voice, outputPath }
        };
    }

    async fixCheckPaths(pipelineData) {
        const { frames, audioPath } = pipelineData;
        const checks = {
            framesExist: [],
            framesMissing: [],
            audioExists: false,
            audioPath: audioPath
        };

        for (const frame of frames || []) {
            const path = frame.filepath || frame;
            if (fs.existsSync(path)) {
                checks.framesExist.push(path);
            } else {
                checks.framesMissing.push(path);
            }
        }

        if (audioPath) {
            checks.audioExists = fs.existsSync(audioPath);
        }

        return {
            success: checks.framesMissing.length === 0,
            fixApplied: 'check_paths',
            details: `${checks.framesExist.length} frames found, ${checks.framesMissing.length} missing. Audio: ${checks.audioExists ? 'found' : 'missing'}`,
            checks,
            action: checks.framesMissing.length > 0 ? 'regenerate_missing' : 'proceed'
        };
    }

    async fixGenericRetry(pipelineData) {
        return {
            success: false,
            fixApplied: 'generic_retry',
            details: 'Unknown error - manual intervention may be needed',
            action: 'report_to_user'
        };
    }

    // ===== LOGGING =====

    logFix(entry) {
        try {
            const logs = JSON.parse(fs.readFileSync(this.logFile, 'utf8'));
            logs.unshift(entry);
            fs.writeFileSync(this.logFile, JSON.stringify(logs.slice(0, 500), null, 2));
        } catch (e) {
            console.error('[ErrorAgent] Failed to log:', e.message);
        }
    }

    getFixHistory(limit = 50) {
        try {
            const logs = JSON.parse(fs.readFileSync(this.logFile, 'utf8'));
            return logs.slice(0, limit);
        } catch {
            return [];
        }
    }

    getStats() {
        const history = this.getFixHistory(500);
        return {
            totalFixes: history.length,
            successfulFixes: history.filter(h => h.result?.success).length,
            failedFixes: history.filter(h => !h.result?.success).length,
            byType: history.reduce((acc, h) => {
                const type = h.analysis?.primaryFix || 'unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {}),
            bySeverity: history.reduce((acc, h) => {
                const sev = h.analysis?.severity || 'unknown';
                acc[sev] = (acc[sev] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

/**
 * Pipeline wrapper with auto-healing
 * Wraps the video assembly pipeline with error detection and auto-fix
 */
async function runPipelineWithHealing(pipelineFn, pipelineData, options = {}) {
    const agent = new ErrorFixingAgent(options);

    try {
        return await pipelineFn(pipelineData);
    } catch (error) {
        console.error('[Pipeline] Error detected:', error.message);

        // Analyze the error
        const analysis = agent.analyzeError(error.message, {
            topic: pipelineData.topic,
            frameCount: pipelineData.frameCount
        });

        console.log('[Pipeline] Error analysis:', analysis);

        // Try to apply fix
        const fixResult = await agent.applyFix(analysis, pipelineData);

        if (fixResult.success && fixResult.action === 'proceed') {
            // Retry the pipeline with fixed data
            console.log('[Pipeline] Retrying with fixed data...');
            return await pipelineFn({
                ...pipelineData,
                frames: fixResult.validFrames || pipelineData.frames
            });
        }

        // If fix requires regeneration, throw with instructions
        if (fixResult.action === 'regenerate_images' || fixResult.action === 'regenerate_audio') {
            throw new Error(`AUTO_FIX_REQUIRED:${JSON.stringify(fixResult)}`);
        }

        // If fix failed, throw original error with analysis
        throw new Error(`${error.message} | ANALYSIS: ${JSON.stringify(analysis)} | FIX_ATTEMPT: ${JSON.stringify(fixResult)}`);
    }
}

module.exports = {
    ErrorFixingAgent,
    runPipelineWithHealing,
    ERROR_PATTERNS
};
