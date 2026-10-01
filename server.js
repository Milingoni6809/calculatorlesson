// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json());
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voiceId = "Chigoxa" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text prompt is required" });
    }
    const inworldKey = process.env.INWORLD_API_KEY;
    if (inworldKey) {
      try {
        const authHeader = inworldKey.startsWith("Basic ") || inworldKey.startsWith("Bearer ") ? inworldKey : `Basic ${inworldKey}`;
        const inworldRes = await fetch("https://api.inworld.ai/tts/v1/voice", {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text,
            voiceId: voiceId || "Chigoxa",
            modelId: "inworld-tts-2"
          })
        });
        if (inworldRes.ok) {
          const data = await inworldRes.json();
          const audio = data?.audioContent || data?.result?.audioContent;
          if (audio) {
            return res.json({
              audioContent: audio,
              mimeType: "audio/mp3",
              source: "inworld",
              voice: voiceId || "Chigoxa"
            });
          }
        } else {
          const errText = await inworldRes.text();
          console.warn("Inworld TTS returned error, falling back to Gemini TTS:", inworldRes.status, errText);
        }
      } catch (inworldErr) {
        console.warn("Inworld TTS connection failed, falling back to Gemini TTS:", inworldErr);
      }
    }
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text,
                  speechMetadata: {
                    speaker: "Chigoxa",
                    style: "Clear, encouraging, articulate financial calculator instructor guide"
                  }
                }
              ]
            }
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" }
              }
            }
          }
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return res.json({
            audioContent: base64Audio,
            mimeType: "audio/wav",
            source: "gemini-tts",
            voice: "Chigoxa"
          });
        }
      } catch (geminiErr) {
        console.warn("Gemini TTS failed:", geminiErr);
      }
    }
    return res.status(200).json({
      audioContent: null,
      source: "web-speech-fallback",
      voice: voiceId || "Chigoxa",
      message: "Using client-side speech synthesizer for Chigoxa voice"
    });
  } catch (error) {
    console.error("TTS endpoint error:", error);
    return res.status(500).json({ error: error.message || "TTS generation failed" });
  }
});
app.get("/api/voice-status", (req, res) => {
  const hasInworld = Boolean(process.env.INWORLD_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    voiceName: "Chigoxa",
    inworldConfigured: hasInworld,
    geminiConfigured: hasGemini,
    activeProvider: hasInworld ? "Inworld AI Cloud TTS (Chigoxa)" : hasGemini ? "AI Voice Engine (Chigoxa Persona)" : "Browser Speech Synthesizer"
  });
});
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
