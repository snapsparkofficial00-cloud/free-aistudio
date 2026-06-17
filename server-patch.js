
// ============================================================
// INTEGRATION: Add these requires at the top of server.js
// ============================================================

const { ErrorFixingAgent, runPipelineWithHealing } = require('./error-agent');
const { detectImageFormat, isValidImage } = require('./gemini-image'); // or import from fixed module

// ============================================================
// REPLACE the /api/assemble-video endpoint with this FIXED version
// ============================================================

app.post('/api/assemble-video', async (req, res) => {
    const agent = new ErrorFixingAgent();
    let tempFiles = [];

    try {
        const { script, topic, imageCount = 30, voice = 'hi-IN-MadhurNeural', resolution = '1280x720', style = 'cinematic' } = req.body;

        if (!script && !topic) {
            return res.status(400).json({ 
                success: false, 
                error: 'Script or topic is required',
                code: 'MISSING_INPUT',
                suggestion: 'Provide a script or topic for video generation'
            });
        }

        console.log(`[Pipeline] Starting video assembly for: ${topic || 'generated'}`);

        // STEP 1: Generate frames
        console.log('[Pipeline] Step 1/4: Generating frames...');
        const frameResult = await generateVideoFrames(script || topic, { 
            frameCount: imageCount, 
            outputDir: uploadsDir, 
            style 
        });

        if (!frameResult.success || frameResult.frames.length === 0) {
            throw new Error('FRAME_GENERATION_FAILED: No frames generated');
        }

        // Validate frames before proceeding
        const validFrames = frameResult.frames.filter(f => {
            const valid = fs.existsSync(f.filepath);
            if (!valid) console.log(`[Pipeline] Frame ${f.index} file missing: ${f.filepath}`);
            return valid;
        });

        if (validFrames.length === 0) {
            throw new Error('FRAME_VALIDATION_FAILED: All frames invalid');
        }

        if (validFrames.length < frameResult.frames.length) {
            console.log(`[Pipeline] Warning: ${frameResult.frames.length - validFrames.length} frames invalid, continuing with ${validFrames.length}`);
        }

        // STEP 2: Generate voice
        console.log('[Pipeline] Step 2/4: Generating voice...');
        const cleanScript = script 
            ? script.replace(/\[.*?\]/g, '').replace(/\d{1,2}:\d{2}[-\u2013]\d{1,2}:\d{2}/g, '').trim() 
            : topic;

        const voiceFile = path.join(uploadsDir, `voice_video_${Date.now()}.mp3`);
        tempFiles.push(voiceFile);

        const voiceResult = await generateSpeech(
            cleanScript.substring(0, 3000), 
            { voice, outputPath: voiceFile }
        );

        // STEP 3: Assemble video with error healing
        console.log('[Pipeline] Step 3/4: Assembling video...');

        const pipelineData = {
            frames: validFrames,
            audioPath: voiceResult.audioPath,
            resolution,
            outputDir: uploadsDir,
            topic: topic || 'generated'
        };

        // Use the fixed assembleVideo with built-in validation
        const videoResult = await assembleVideo(
            validFrames, 
            voiceResult.audioPath, 
            { resolution, outputDir: uploadsDir }
        );

        // STEP 4: Save to database
        console.log('[Pipeline] Step 4/4: Saving to database...');
        const videos = readDB('videos');
        videos.unshift({
            id: Date.now(),
            topic: topic || 'Generated Video',
            script: script?.substring(0, 500),
            videoUrl: videoResult.videoUrl,
            videoPath: videoResult.videoPath,
            duration: videoResult.duration,
            frameCount: videoResult.frameCount,
            validFrames: videoResult.validFrames,
            invalidFrames: videoResult.invalidFrames,
            resolution: videoResult.resolution,
            sizeMB: videoResult.sizeMB,
            fps: videoResult.fps,
            voice,
            createdAt: new Date().toISOString()
        });
        writeDB('videos', videos.slice(0, 50));

        // Success response with full details
        res.json({
            success: true,
            videoUrl: videoResult.videoUrl,
            videoPath: videoResult.videoPath,
            duration: videoResult.duration,
            frameCount: videoResult.frameCount,
            validFrames: videoResult.validFrames,
            invalidFrames: videoResult.invalidFrames,
            resolution: videoResult.resolution,
            sizeMB: videoResult.sizeMB,
            fps: videoResult.fps,
            images: validFrames.map(f => f.imageUrl),
            voiceUrl: voiceResult.audioUrl,
            message: `Video created: ${videoResult.duration}s, ${videoResult.frameCount} frames, ${videoResult.sizeMB}MB`
        });

    } catch (error) {
        console.error('[Pipeline] Fatal error:', error.message);

        // Analyze error for structured response
        const analysis = agent.analyzeError(error.message, req.body);

        // Cleanup temp files
        tempFiles.forEach(f => {
            if (fs.existsSync(f)) {
                try { fs.unlinkSync(f); } catch(e) {}
            }
        });

        // Structured error response
        const errorResponse = {
            success: false,
            error: error.message,
            code: analysis.findings[0]?.type?.toUpperCase() || 'UNKNOWN_ERROR',
            severity: analysis.severity,
            step: error.message.includes('FRAME') ? 'frame_generation' : 
                  error.message.includes('voice') ? 'voice_generation' :
                  error.message.includes('assembly') ? 'video_assembly' : 'unknown',
            analysis: {
                pattern: analysis.findings[0]?.pattern,
                description: analysis.findings[0]?.description,
                suggestedFix: analysis.findings[0]?.fix
            },
            suggestions: getErrorSuggestions(analysis),
            retryable: analysis.severity !== 'critical',
            timestamp: new Date().toISOString()
        };

        res.status(500).json(errorResponse);
    }
});

/**
 * Get human-readable suggestions based on error analysis
 */
function getErrorSuggestions(analysis) {
    const suggestions = [];
    const fix = analysis.primaryFix;

    switch(fix) {
        case 'auto_detect_format':
        case 'revalidate_images':
            suggestions.push('Images were saved with wrong format. The system will auto-detect and fix this.');
            suggestions.push('Retrying the pipeline should work now.');
            break;
        case 'regenerate_frames':
            suggestions.push('Some image frames were corrupted during download.');
            suggestions.push('Try generating with fewer frames (15 instead of 30) to reduce failure rate.');
            suggestions.push('Check your internet connection - Pollinations may be temporarily slow.');
            break;
        case 'use_concat_demuxer':
            suggestions.push('Frame sequence had gaps. Using concat demuxer instead.');
            suggestions.push('This is an internal fix - retry should work.');
            break;
        case 'retry_with_backoff':
            suggestions.push('Network timeout occurred. The system will retry automatically.');
            suggestions.push('If this persists, check your API keys and internet connection.');
            break;
        case 'regenerate_audio':
            suggestions.push('Audio generation failed. Edge-TTS may not be installed.');
            suggestions.push('Run: pip install edge-tts');
            suggestions.push('Or check that python3 is available in PATH.');
            break;
        default:
            suggestions.push('An unexpected error occurred.');
            suggestions.push('Try again with a different topic or fewer frames.');
            suggestions.push('If the error persists, check server logs for details.');
    }

    return suggestions;
}

// ============================================================
// NEW ENDPOINT: Error Agent Status & History
// ============================================================

app.get('/api/agents/error-agent/status', (req, res) => {
    const agent = new ErrorFixingAgent();
    res.json({
        success: true,
        stats: agent.getStats(),
        recentFixes: agent.getFixHistory(20),
        patterns: Object.keys(ERROR_PATTERNS).map(p => ({
            pattern: p,
            ...ERROR_PATTERNS[p]
        }))
    });
});

app.post('/api/agents/error-agent/analyze', (req, res) => {
    const { errorMessage, context } = req.body;
    if (!errorMessage) {
        return res.status(400).json({ success: false, error: 'errorMessage required' });
    }

    const agent = new ErrorFixingAgent();
    const analysis = agent.analyzeError(errorMessage, context);

    res.json({
        success: true,
        analysis,
        suggestions: getErrorSuggestions(analysis)
    });
});

// ============================================================
// REPLACE error handler at bottom of server.js
// ============================================================

app.use((err, req, res, next) => {
    console.error('Server error:', err);

    // Try to analyze the error
    const agent = new ErrorFixingAgent();
    const analysis = agent.analyzeError(err.message);

    res.status(500).json({ 
        success: false, 
        error: err.message,
        code: analysis.findings[0]?.type?.toUpperCase() || 'SERVER_ERROR',
        severity: analysis.severity,
        analysis: {
            pattern: analysis.findings[0]?.pattern,
            description: analysis.findings[0]?.description
        },
        suggestions: getErrorSuggestions(analysis),
        timestamp: new Date().toISOString()
    });
});
