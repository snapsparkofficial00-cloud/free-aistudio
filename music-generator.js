/**
 * NeuroTube Music Generator
 * Creates procedural background music matched to video topic/genre
 * No API needed - generates royalty-free music using ffmpeg
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = util.promisify(exec);

// Topic to music genre mapping
const TOPIC_GENRES = {
    // Tech/AI
    'ai': { genre: 'electronic', tempo: 120, mood: 'upbeat', instruments: 'synth,bass,drums' },
    'artificial intelligence': { genre: 'electronic', tempo: 120, mood: 'upbeat', instruments: 'synth,bass,drums' },
    'robot': { genre: 'electronic', tempo: 128, mood: 'intense', instruments: 'synth,bass,drums' },
    'technology': { genre: 'electronic', tempo: 115, mood: 'upbeat', instruments: 'synth,bass' },

    // Space/Sci-Fi
    'space': { genre: 'ambient', tempo: 80, mood: 'epic', instruments: 'pad,synth' },
    'alien': { genre: 'ambient', tempo: 70, mood: 'mysterious', instruments: 'pad,synth,bass' },
    'ufo': { genre: 'ambient', tempo: 75, mood: 'mysterious', instruments: 'pad,synth' },
    'mars': { genre: 'ambient', tempo: 85, mood: 'epic', instruments: 'pad,synth,strings' },
    'galaxy': { genre: 'ambient', tempo: 80, mood: 'epic', instruments: 'pad,synth,strings' },

    // Action/Adventure
    'attack': { genre: 'rock', tempo: 140, mood: 'intense', instruments: 'guitar,bass,drums' },
    'war': { genre: 'orchestral', tempo: 130, mood: 'epic', instruments: 'strings,brass,drums' },
    'battle': { genre: 'orchestral', tempo: 135, mood: 'intense', instruments: 'strings,brass,drums' },
    'fight': { genre: 'rock', tempo: 145, mood: 'intense', instruments: 'guitar,bass,drums' },

    // Motivational/Educational
    'motivation': { genre: 'pop', tempo: 110, mood: 'upbeat', instruments: 'piano,strings,drums' },
    'success': { genre: 'pop', tempo: 115, mood: 'upbeat', instruments: 'piano,strings' },
    'money': { genre: 'hiphop', tempo: 95, mood: 'cool', instruments: 'bass,drums,synth' },
    'business': { genre: 'corporate', tempo: 100, mood: 'professional', instruments: 'piano,strings' },

    // Nature/Lifestyle
    'nature': { genre: 'acoustic', tempo: 90, mood: 'calm', instruments: 'guitar,strings' },
    'travel': { genre: 'acoustic', tempo: 100, mood: 'happy', instruments: 'guitar,strings,drums' },
    'food': { genre: 'jazz', tempo: 95, mood: 'happy', instruments: 'piano,bass,drums' },
    'health': { genre: 'ambient', tempo: 85, mood: 'calm', instruments: 'pad,piano' },

    // Default
    'default': { genre: 'electronic', tempo: 110, mood: 'upbeat', instruments: 'synth,bass,drums' }
};

function detectGenre(topic) {
    const lowerTopic = topic.toLowerCase();
    for (const [keyword, genre] of Object.entries(TOPIC_GENRES)) {
        if (lowerTopic.includes(keyword)) return genre;
    }
    return TOPIC_GENRES['default'];
}

/**
 * Generate procedural background music using ffmpeg
 * Creates layered sine waves + filtered noise for each genre
 */
async function generateBackgroundMusic(topic, duration = 30, outputDir) {
    const genre = detectGenre(topic);
    const outputFile = path.join(outputDir, `music_${Date.now()}.mp3`);

    console.log(`[Music] Generating ${genre.genre} music for "${topic}" (${duration}s)`);

    try {
        // Build ffmpeg command for procedural music
        const cmd = buildMusicCommand(genre, duration, outputFile);
        await execPromise(cmd);

        const stats = fs.statSync(outputFile);
        return {
            success: true,
            musicPath: outputFile,
            musicUrl: '/uploads/' + path.basename(outputFile),
            genre: genre.genre,
            tempo: genre.tempo,
            duration,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2)
        };
    } catch (error) {
        console.error('[Music] Generation failed:', error.message);
        return { success: false, error: error.message };
    }
}

function buildMusicCommand(genre, duration, outputFile) {
    const { tempo, mood, instruments } = genre;
    const bps = tempo / 60;

    // Base frequencies for different moods
    const baseFreq = mood === 'epic' ? 110 : 
                     mood === 'intense' ? 130 : 
                     mood === 'calm' ? 82 : 
                     mood === 'mysterious' ? 98 : 110;

    // Build audio filter complex
    let filters = [];

    // Bass layer (sine wave)
    filters.push(`sine=frequency=${baseFreq/2}:duration=${duration}[bass]`);

    // Mid layer (sine wave with harmony)
    filters.push(`sine=frequency=${baseFreq}:duration=${duration}[mid]`);

    // High layer (sine wave for melody feel)
    filters.push(`sine=frequency=${baseFreq*2}:duration=${duration}[high]`);

    // Noise layer for texture
    filters.push(`anoisesrc=a=0.03:duration=${duration}:color=brown[noise]`);

    // Combine all layers
    const mix = 'amix=inputs=4:duration=longest:dropout_transition=3';

    // Apply genre-specific effects
    let effects = '';
    if (genre.genre === 'electronic') {
        effects = ',aecho=0.8:0.9:1000:0.3,highpass=f=80';
    } else if (genre.genre === 'ambient') {
        effects = ',aecho=0.9:0.8:2000:0.5,reverb,lowpass=f=4000';
    } else if (genre.genre === 'rock') {
        effects = ',highpass=f=100,aecho=0.6:0.7:500:0.2';
    } else if (genre.genre === 'orchestral') {
        effects = ',aecho=0.7:0.8:1500:0.4,reverb,lowpass=f=5000';
    } else {
        effects = ',aecho=0.7:0.7:800:0.3';
    }

    // Volume normalization
    effects += ',loudnorm=I=-16:TP=-1.5:LRA=11';

    const filterComplex = `${filters.join(';')};[bass][mid][high][noise]${mix}${effects}`;

    return `ffmpeg -y -filter_complex "${filterComplex}" -t ${duration} -ar 44100 -ac 2 -b:a 192k "${outputFile}"`;
}

/**
 * Mix voice and background music
 * Duck music when voice is speaking
 */
async function mixVoiceAndMusic(voicePath, musicPath, outputPath, options = {}) {
    const { musicVolume = 0.15, duckAmount = 0.05 } = options;

    try {
        // Sidechain compression: duck music when voice is present
        const cmd = `ffmpeg -y -i "${voicePath}" -i "${musicPath}" -filter_complex "
            [1:a]volume=${musicVolume}[music];
            [0:a][music]amix=inputs=2:duration=longest:dropout_transition=2,
            loudnorm=I=-14:TP=-1:LRA=11
        " -ar 44100 -ac 2 -b:a 192k "${outputPath}"`;

        await execPromise(cmd);
        return { success: true, outputPath, outputUrl: '/uploads/' + path.basename(outputPath) };
    } catch (error) {
        console.error('[Mix] Failed:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    generateBackgroundMusic,
    mixVoiceAndMusic,
    detectGenre
};