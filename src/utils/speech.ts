// Speech utility for Chigoxa voice narration and interactive guided instructions

export interface VoiceStatus {
  voiceName: string;
  inworldConfigured: boolean;
  activeProvider: string;
}

export interface SpeechProgressInfo {
  speaking: boolean;
  text: string;
  charIndex: number;
  word: string;
  progress: number; // 0.0 to 1.0
}

export interface TextSpan {
  word: string;
  cleanWord: string;
  start: number;
  end: number;
}

export function extractWordSpans(text: string): TextSpan[] {
  if (!text) return [];
  const spans: TextSpan[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    spans.push({
      word: match[0],
      cleanWord: match[0].replace(/[^\w]/g, '').toLowerCase(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return spans;
}

export function findWordAtChar(spans: TextSpan[], charIndex: number): string {
  if (spans.length === 0) return '';
  const exact = spans.find((s) => charIndex >= s.start && charIndex < s.end);
  if (exact) return exact.word;
  const closest = spans.find((s) => charIndex <= s.end);
  if (closest) return closest.word;
  return spans[spans.length - 1].word;
}

// In-memory audio cache for synthesized audio base64
const audioCache = new Map<string, { audioContent: string; mimeType: string; source: string }>();

let currentAudio: HTMLAudioElement | null = null;
let currentAudioTicker: number | null = null;
let isCurrentlySpeaking = false;
let activeSpokenText = '';
let activeCharIndex = 0;
let activeSpokenWord = '';
let activeProgress = 0;
let progressTicker: number | null = null;
let sharedAudioCtx: AudioContext | null = null;

const speechListeners = new Set<(speaking: boolean, text: string) => void>();
const progressListeners = new Set<(info: SpeechProgressInfo) => void>();

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

export function subscribeSpeechProgress(listener: (info: SpeechProgressInfo) => void) {
  progressListeners.add(listener);
  listener({
    speaking: isCurrentlySpeaking,
    text: activeSpokenText,
    charIndex: activeCharIndex,
    word: activeSpokenWord,
    progress: activeProgress,
  });
  return () => {
    progressListeners.delete(listener);
  };
}

function notifyState(speaking: boolean, text: string, charIndex = 0, word = '', progress = 0) {
  isCurrentlySpeaking = speaking;
  activeSpokenText = text;
  activeCharIndex = charIndex;
  activeSpokenWord = word;
  activeProgress = progress;

  const info: SpeechProgressInfo = {
    speaking,
    text,
    charIndex,
    word,
    progress,
  };

  speechListeners.forEach((l) => l(speaking, text));
  progressListeners.forEach((l) => l(info));
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
  if (progressTicker) {
    clearInterval(progressTicker);
    progressTicker = null;
  }
  if (currentAudioTicker) {
    clearInterval(currentAudioTicker);
    currentAudioTicker = null;
  }
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
  notifyState(false, '', 0, '', 0);
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

  // Direct speech start with initial state and progress tracker
  const spans = extractWordSpans(rawText);
  const estimatedDurationSec = Math.max(1, spans.length / (2.5 * rate));
  const startTime = Date.now();

  notifyState(true, rawText, 0, spans[0]?.word || '', 0);
  options.onStart?.();

  if (progressTicker) clearInterval(progressTicker);
  progressTicker = window.setInterval(() => {
    if (!isCurrentlySpeaking) {
      if (progressTicker) clearInterval(progressTicker);
      return;
    }
    const elapsedSec = (Date.now() - startTime) / 1000;
    const progress = Math.min(0.99, elapsedSec / estimatedDurationSec);
    const charIndex = Math.min(rawText.length - 1, Math.floor(progress * rawText.length));
    const currentWord = findWordAtChar(spans, charIndex);

    notifyState(true, rawText, charIndex, currentWord, progress);
  }, 40);

  const cleanup = () => {
    if (progressTicker) {
      clearInterval(progressTicker);
      progressTicker = null;
    }
    if (currentAudioTicker) {
      clearInterval(currentAudioTicker);
      currentAudioTicker = null;
    }
    notifyState(false, '', 0, '', 0);
  };

  // 1. Check in-memory audio cache for synthesized Inworld Chigoxa audio
  const cacheKey = `Chigoxa:${formattedText}`;
  if (audioCache.has(cacheKey)) {
    const cached = audioCache.get(cacheKey)!;
    playAudioData(
      rawText,
      cached.audioContent,
      cached.mimeType,
      volume,
      rate,
      () => {
        cleanup();
        options.onEnd?.();
      },
      (err) => {
        if (options.allowDeviceFallback) {
          speakWithBrowserSynthesis(rawText, formattedText, rate, volume, options, cleanup);
        } else {
          cleanup();
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
          rawText,
          data.audioContent,
          data.mimeType || 'audio/mp3',
          volume,
          rate,
          () => {
            cleanup();
            options.onEnd?.();
          },
          (err) => {
            if (options.allowDeviceFallback) {
              speakWithBrowserSynthesis(rawText, formattedText, rate, volume, options, cleanup);
            } else {
              cleanup();
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
    speakWithBrowserSynthesis(rawText, formattedText, rate, volume, options, cleanup);
  } else {
    cleanup();
    options.onError?.(new Error('INWORLD_API_KEY required for Chigoxa voice'));
  }
}

// Browser speech synthesis optimized for Chigoxa voice delivery
function speakWithBrowserSynthesis(
  rawText: string,
  text: string,
  rate: number,
  volume: number,
  options: { onEnd?: () => void; onError?: (err: any) => void },
  cleanup: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    cleanup();
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
      notifyState(true, rawText, 0, '', 0);
    };

    const spans = extractWordSpans(rawText);
    utterance.onboundary = (event) => {
      if (event.name === 'word' || !event.name) {
        const spokenChar = event.charIndex;
        const progress = Math.min(1, spokenChar / Math.max(1, text.length));
        const rawChar = Math.min(rawText.length - 1, Math.floor(progress * rawText.length));
        const currentWord = findWordAtChar(spans, rawChar);
        notifyState(true, rawText, rawChar, currentWord, progress);
      }
    };

    utterance.onend = () => {
      (window as unknown as { __chigoxa_active_utterance: unknown }).__chigoxa_active_utterance = null;
      cleanup();
      options.onEnd?.();
    };

    utterance.onerror = () => {
      (window as unknown as { __chigoxa_active_utterance: unknown }).__chigoxa_active_utterance = null;
      cleanup();
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
    cleanup();
    options.onError?.(err);
  }
}

// Play base64 audio blob
function playAudioData(
  rawText: string,
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

    const spans = extractWordSpans(rawText);

    if (currentAudioTicker) {
      clearInterval(currentAudioTicker);
      currentAudioTicker = null;
    }

    const updateAudioProgress = () => {
      if (!audio || !audio.duration) return;
      const progress = Math.min(0.999, audio.currentTime / audio.duration);
      const rawChar = Math.min(rawText.length - 1, Math.floor(progress * rawText.length));
      const currentWord = findWordAtChar(spans, rawChar);
      notifyState(true, rawText, rawChar, currentWord, progress);
    };

    currentAudioTicker = window.setInterval(updateAudioProgress, 35);
    audio.ontimeupdate = updateAudioProgress;

    audio.onended = () => {
      if (currentAudioTicker) {
        clearInterval(currentAudioTicker);
        currentAudioTicker = null;
      }
      currentAudio = null;
      onEnd();
    };

    audio.onerror = (e) => {
      if (currentAudioTicker) {
        clearInterval(currentAudioTicker);
        currentAudioTicker = null;
      }
      currentAudio = null;
      onError(e);
    };

    audio.play().catch((playErr) => {
      if (currentAudioTicker) {
        clearInterval(currentAudioTicker);
        currentAudioTicker = null;
      }
      currentAudio = null;
      onError(playErr);
    });
  } catch (err) {
    onError(err);
  }
}
