// Speech utility for Chigoxa voice narration and interactive guided instructions

export interface VoiceStatus {
  voiceName: string;
  inworldConfigured: boolean;
  activeProvider: string;
}

// In-memory audio cache for synthesized audio base64
const audioCache = new Map<string, { audioContent: string; mimeType: string; source: string }>();

let currentAudio: HTMLAudioElement | null = null;
let isCurrentlySpeaking = false;
const speechListeners = new Set<(speaking: boolean, text: string) => void>();
let activeSpokenText = '';
let sharedAudioCtx: AudioContext | null = null;

// Preload voices as soon as module is imported
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  } catch (e) {
    // Ignore
  }
}

export function subscribeSpeechState(listener: (speaking: boolean, text: string) => void) {
  speechListeners.add(listener);
  listener(isCurrentlySpeaking, activeSpokenText);
  return () => {
    speechListeners.delete(listener);
  };
}

function notifyState(speaking: boolean, text: string) {
  isCurrentlySpeaking = speaking;
  activeSpokenText = text;
  speechListeners.forEach((l) => l(speaking, text));
}

// Unlock audio context and speech synthesis on user interaction
export function unlockAudio() {
  if (typeof window === 'undefined') return;

  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
      }
    }
  } catch (e) {
    // Ignore
  }
}

// Natural speech normalization for Sharp EL-738 calculator buttons and symbols
export function formatSpeechText(text: string): string {
  if (!text) return '';

  let spoken = text;

  // Format button notation like [2ndF], [CA], [COMP] etc.
  spoken = spoken
    .replace(/\[2ndF\]/gi, 'Second Function')
    .replace(/2ndF/gi, 'Second Function')
    .replace(/\[CA\]/gi, 'Clear All')
    .replace(/\[C\]/gi, 'Clear')
    .replace(/\[DEL\]/gi, 'Delete')
    .replace(/\[ENT\]/gi, 'Enter')
    .replace(/\[COMP\]/gi, 'Compute')
    .replace(/\[PMT\]/gi, 'Payment P M T')
    .replace(/\[PV\]/gi, 'Present Value P V')
    .replace(/\[FV\]/gi, 'Future Value F V')
    .replace(/\[I\/Y\]/gi, 'Interest rate I over Y')
    .replace(/\[N\]/gi, 'Number of periods N')
    .replace(/\[CFi\]/gi, 'Cash Flow C F i')
    .replace(/\[Ni\]/gi, 'Frequency N i')
    .replace(/\[NPV\]/gi, 'Net Present Value N P V')
    .replace(/\[IRR\]/gi, 'Internal Rate of Return I R R')
    .replace(/\[AMORT\]/gi, 'Amortization')
    .replace(/\[BGN\]/gi, 'Begin mode')
    .replace(/\[P\/Y\]/gi, 'Payments per year P over Y')
    .replace(/\[\+\/\-\]/gi, 'Plus Minus sign')
    .replace(/\+/g, ' plus ')
    .replace(/\-/g, ' minus ')
    .replace(/\*/g, ' times ')
    .replace(/\//g, ' divided by ')
    .replace(/=/g, ' equals ')
    .replace(/%/g, ' percent ')
    .replace(/(^|[^\w])R([0-9,]+(\.[0-9]+)?)/g, '$1$2 Rand')
    .replace(/\$/g, ' Rand ')
    .replace(/\bTVM\b/g, 'Time Value of Money')
    .replace(/\bPMT\b/g, 'P M T payment')
    .replace(/\bPV\b/g, 'P V present value')
    .replace(/\bFV\b/g, 'F V future value')
    .replace(/\bNPV\b/g, 'N P V')
    .replace(/\bIRR\b/g, 'I R R')
    .replace(/EL-738/gi, 'Sharp E L seven thirty-eight');

  // Collapse multiple spaces
  spoken = spoken.replace(/\s+/g, ' ').trim();
  return spoken;
}

// Stop any currently playing audio or speech synthesis
export function stopInstructionSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      (window as unknown as { __chigoxa_active_utterance: unknown }).__chigoxa_active_utterance = null;
    } catch (e) {
      // ignore
    }
  }
  notifyState(false, '');
}

export function isInstructionSpeaking(): boolean {
  return isCurrentlySpeaking;
}

// Fetch voice status from backend
export async function getVoiceStatus(): Promise<VoiceStatus> {
  try {
    const res = await fetch('/api/voice-status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Ignore
  }
  return {
    voiceName: 'Chigoxa',
    inworldConfigured: false,
    activeProvider: 'Chigoxa Voice',
  };
}

// Main speech playback function
export async function playInstructionSpeech(
  rawText: string,
  options: {
    voiceId?: string;
    rate?: number;
    volume?: number;
    allowDeviceFallback?: boolean;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  } = {}
) {
  stopInstructionSpeech();
  unlockAudio();

  const formattedText = formatSpeechText(rawText);
  if (!formattedText) return;

  const rate = options.rate ?? 1.0;
  const volume = options.volume ?? 1.0;

  // Direct speech start without interfering chime intro
  notifyState(true, rawText);
  options.onStart?.();

  // 1. Check in-memory audio cache for synthesized Inworld Chigoxa audio
  const cacheKey = `Chigoxa:${formattedText}`;
  if (audioCache.has(cacheKey)) {
    const cached = audioCache.get(cacheKey)!;
    playAudioData(
      cached.audioContent,
      cached.mimeType,
      volume,
      rate,
      () => {
        notifyState(false, '');
        options.onEnd?.();
      },
      (err) => {
        if (options.allowDeviceFallback) {
          speakWithBrowserSynthesis(formattedText, rate, volume, options);
        } else {
          notifyState(false, '');
          options.onError?.(err);
        }
      }
    );
    return;
  }

  // 2. Fetch authentic Inworld Chigoxa Voice from backend API
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: formattedText,
        voiceId: 'Chigoxa',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.audioContent) {
        audioCache.set(cacheKey, {
          audioContent: data.audioContent,
          mimeType: data.mimeType || 'audio/mp3',
          source: 'inworld',
        });

        playAudioData(
          data.audioContent,
          data.mimeType || 'audio/mp3',
          volume,
          rate,
          () => {
            notifyState(false, '');
            options.onEnd?.();
          },
          (err) => {
            if (options.allowDeviceFallback) {
              speakWithBrowserSynthesis(formattedText, rate, volume, options);
            } else {
              notifyState(false, '');
              options.onError?.(err);
            }
          }
        );
        return;
      }
    }
  } catch (netErr) {
    console.warn('Inworld Chigoxa speech fetch error:', netErr);
  }

  // 3. If Inworld Chigoxa key is missing, ONLY use device speech if explicitly allowed!
  if (options.allowDeviceFallback) {
    speakWithBrowserSynthesis(formattedText, rate, volume, options);
  } else {
    // Notify completion without playing unwanted internet/browser voices
    notifyState(false, '');
    options.onError?.(new Error('INWORLD_API_KEY required for Chigoxa voice'));
  }
}

// Browser speech synthesis optimized for Chigoxa voice delivery
function speakWithBrowserSynthesis(
  text: string,
  rate: number,
  volume: number,
  options: { onEnd?: () => void; onError?: (err: any) => void }
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    notifyState(false, '');
    options.onError?.(new Error('Speech synthesis is not supported on this browser.'));
    return;
  }

  try {
    // Chrome requires resume after cancel
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    // CRITICAL: Pin utterance to window to prevent garbage collection in Chrome/Safari
    (window as unknown as { __chigoxa_active_utterance: unknown }).__chigoxa_active_utterance = utterance;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferred =
        voices.find((v) => v.name.toLowerCase().includes('chigoxa')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (preferred) {
        utterance.voice = preferred;
      }
    }

    utterance.lang = 'en-US';
    utterance.rate = Math.max(0.75, Math.min(1.3, rate * 0.95));
    utterance.pitch = 1.0;
    utterance.volume = Math.max(0.1, Math.min(1.0, volume));

    utterance.onstart = () => {
      notifyState(true, text);
    };

    utterance.onend = () => {
      (window as unknown as { __chigoxa_active_utterance: unknown }).__chigoxa_active_utterance = null;
      notifyState(false, '');
      options.onEnd?.();
    };

    utterance.onerror = () => {
      (window as unknown as { __chigoxa_active_utterance: unknown }).__chigoxa_active_utterance = null;
      notifyState(false, '');
      options.onEnd?.();
    };

    // Chrome pause bug guard
    const checkInterval = setInterval(() => {
      if (!isCurrentlySpeaking) {
        clearInterval(checkInterval);
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 3000);

    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.resume();
  } catch (err) {
    notifyState(false, '');
    options.onError?.(err);
  }
}

// Play base64 audio blob
function playAudioData(
  base64Audio: string,
  mimeType: string,
  volume: number,
  rate: number,
  onEnd: () => void,
  onError: (err: any) => void
) {
  try {
    const audioUrl = `data:${mimeType};base64,${base64Audio}`;
    const audio = new Audio(audioUrl);
    currentAudio = audio;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));

    audio.onended = () => {
      currentAudio = null;
      onEnd();
    };

    audio.onerror = (e) => {
      currentAudio = null;
      onError(e);
    };

    audio.play().catch((playErr) => {
      currentAudio = null;
      onError(playErr);
    });
  } catch (err) {
    onError(err);
  }
}
