import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

let resolvedChigoxaVoiceId = 'mega-tomato-7453__chigoxa';

async function getChigoxaVoiceId(): Promise<string> {
  const inworldKey = process.env.INWORLD_API_KEY?.trim();
  if (!inworldKey) return resolvedChigoxaVoiceId;

  try {
    let authHeader = inworldKey;
    if (!authHeader.startsWith('Basic ') && !authHeader.startsWith('Bearer ')) {
      authHeader = `Basic ${authHeader}`;
    }

    const res = await fetch('https://api.inworld.ai/voices/v1/voices', {
      headers: { 'Authorization': authHeader },
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      const chigVoice = data.voices?.find(
        (v: any) =>
          v.voiceId?.toLowerCase().includes('chigoxa') ||
          v.displayName?.toLowerCase().includes('chigoxa') ||
          v.name?.toLowerCase().includes('chigoxa')
      );
      if (chigVoice?.voiceId) {
        resolvedChigoxaVoiceId = chigVoice.voiceId;
      }
    }
  } catch (e) {
    // Keep default
  }
  return resolvedChigoxaVoiceId;
}

// Chigoxa TTS audio synthesis endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required' });
    }

    // 1. Inworld AI TTS with authentic Chigoxa voice clone
    const inworldKey = process.env.INWORLD_API_KEY?.trim();
    if (inworldKey) {
      try {
        let authHeader = inworldKey;
        if (!authHeader.startsWith('Basic ') && !authHeader.startsWith('Bearer ')) {
          authHeader = `Basic ${authHeader}`;
        }

        const voiceId = await getChigoxaVoiceId();

        const inworldRes = await fetch('https://api.inworld.ai/tts/v1/voice', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            voiceId: voiceId,
            modelId: 'inworld-tts-2',
          }),
        });

        if (inworldRes.ok) {
          const data = (await inworldRes.json()) as any;
          const audio = data?.audioContent || data?.result?.audioContent;
          if (audio) {
            return res.json({
              audioContent: audio,
              mimeType: 'audio/mp3',
              voice: 'Chigoxa',
            });
          }
        } else {
          const errText = await inworldRes.text();
          console.warn('Inworld TTS API error:', inworldRes.status, errText);
          return res.status(200).json({
            audioContent: null,
            voice: 'Chigoxa',
            error: `Inworld error ${inworldRes.status}: ${errText}`,
          });
        }
      } catch (inworldErr: any) {
        console.warn('Inworld fetch failure:', inworldErr.message);
      }
    }

    // 2. Chigoxa Voice Output
    return res.status(200).json({
      audioContent: null,
      voice: 'Chigoxa',
      message: 'INWORLD_API_KEY not configured or audio pending',
    });
  } catch (error: any) {
    return res.status(200).json({
      audioContent: null,
      voice: 'Chigoxa',
      message: 'Chigoxa voice active',
    });
  }
});

// Chigoxa Voice status endpoint
app.get('/api/voice-status', (req, res) => {
  res.json({
    voiceName: 'Chigoxa',
    activeVoice: 'Chigoxa',
    inworldConfigured: !!process.env.INWORLD_API_KEY,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    status: 'active',
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
