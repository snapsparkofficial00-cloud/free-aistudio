/**
 * Edge-TTS Node.js Wrapper
 * Uses Python edge-tts via child_process
 * No API key needed - FREE Microsoft Edge TTS
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Generate speech audio using edge-tts (Microsoft Edge TTS - FREE)
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Options
 * @param {string} options.voice - Voice ID (default: hi-IN-MadhurNeural)
 * @param {string} options.outputPath - Output file path
 * @param {string} options.rate - Speech rate (default: +0%)
 * @param {string} options.volume - Volume (default: +0%)
 * @param {string} options.pitch - Pitch (default: +0Hz)
 * @returns {Promise<{success: boolean, audioPath: string, duration: number}>}
 */
async function generateSpeech(text, options = {}) {
    const {
        voice = 'hi-IN-MadhurNeural',
        outputPath,
        rate = '+0%',
        volume = '+0%',
        pitch = '+0Hz'
    } = options;

    const outputFile = outputPath || path.join(__dirname, 'uploads', `voice_${Date.now()}.mp3`);

    // Ensure uploads dir exists
    const uploadsDir = path.dirname(outputFile);
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        // Check if edge-tts is available
        const checkCmd = spawn('python3', ['-c', 'import edge_tts; print("OK")']);
        let pythonAvailable = false;

        checkCmd.stdout.on('data', (data) => {
            if (data.toString().includes('OK')) pythonAvailable = true;
        });

        checkCmd.on('close', (code) => {
            if (!pythonAvailable && code !== 0) {
                // Try python (Windows or alternate)
                const checkCmd2 = spawn('python', ['-c', 'import edge_tts; print("OK")']);
                checkCmd2.stdout.on('data', (data) => {
                    if (data.toString().includes('OK')) pythonAvailable = true;
                });
                checkCmd2.on('close', (code2) => {
                    if (!pythonAvailable) {
                        reject(new Error('edge-tts Python package not installed. Run: pip install edge-tts'));
                        return;
                    }
                    runEdgeTTS('python');
                });
                return;
            }
            runEdgeTTS('python3');
        });

        function runEdgeTTS(pythonCmd) {
            // Escape text for Python triple-quoted string
            const safeText = text
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/'/g, "\\'")
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r');

            const script = `import asyncio
import sys
import edge_tts

async def main():
    communicate = edge_tts.Communicate(
        """${safeText}""",
        voice="${voice}",
        rate="${rate}",
        volume="${volume}",
        pitch="${pitch}"
    )
    await communicate.save("${outputFile.replace(/\\/g, '\\\\')}")
    print("SUCCESS")

asyncio.run(main())
`;
            const proc = spawn(pythonCmd, ['-c', script]);
            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => { stdout += data.toString(); });
            proc.stderr.on('data', (data) => { stderr += data.toString(); });

            proc.on('close', (code) => {
                if (code === 0 && stdout.includes('SUCCESS')) {
                    // Estimate duration: ~15 chars per second for Hindi/English
                    const duration = Math.ceil(text.length / 15);
                    resolve({
                        success: true,
                        audioPath: outputFile,
                        audioUrl: '/uploads/' + path.basename(outputFile),
                        duration,
                        voice,
                        textLength: text.length
                    });
                } else {
                    reject(new Error('edge-tts failed: ' + (stderr || stdout)));
                }
            });

            proc.on('error', (err) => {
                reject(new Error('Failed to run edge-tts: ' + err.message));
            });
        }
    });
}

/**
 * Get list of available voices
 * @returns {Promise<Array>}
 */
async function getVoices() {
    return new Promise((resolve, reject) => {
        const pythonCmd = 'python3';
        const script = `import asyncio
import edge_tts

async def main():
    voices = await edge_tts.list_voices()
    # Filter for Hindi and English voices
    filtered = [v for v in voices if any(x in v['ShortName'].lower() for x in ['hi-in', 'en-us', 'en-gb', 'en-in'])]
    for v in filtered[:20]:
        print(f"{v['ShortName']}|{v['FriendlyName']}|{v['Gender']}|{v['Locale']}")

asyncio.run(main())
`;
        const proc = spawn(pythonCmd, ['-c', script]);
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (code === 0) {
                const voices = stdout.trim().split('\n').filter(Boolean).map(line => {
                    const [shortName, friendlyName, gender, locale] = line.split('|');
                    return { shortName, friendlyName, gender, locale };
                });
                resolve(voices);
            } else {
                // Fallback voice list
                resolve([
                    { shortName: 'hi-IN-MadhurNeural', friendlyName: 'Madhur (Hindi)', gender: 'Male', locale: 'hi-IN' },
                    { shortName: 'hi-IN-SwaraNeural', friendlyName: 'Swara (Hindi)', gender: 'Female', locale: 'hi-IN' },
                    { shortName: 'en-US-GuyNeural', friendlyName: 'Guy (English US)', gender: 'Male', locale: 'en-US' },
                    { shortName: 'en-US-JennyNeural', friendlyName: 'Jenny (English US)', gender: 'Female', locale: 'en-US' },
                    { shortName: 'en-GB-RyanNeural', friendlyName: 'Ryan (English UK)', gender: 'Male', locale: 'en-GB' },
                    { shortName: 'en-IN-PrabhatNeural', friendlyName: 'Prabhat (English India)', gender: 'Male', locale: 'en-IN' }
                ]);
            }
        });
    });
}

module.exports = {
    generateSpeech,
    getVoices
};
