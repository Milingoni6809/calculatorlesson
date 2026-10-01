import React, { useState, useEffect, useRef } from 'react';
import { Lesson, TutorialStep } from '../types';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  Play,
  Square,
  Sparkles,
  BookOpen,
  MousePointerClick,
  ChevronRight,
  Volume2,
  VolumeX,
  Volume1,
  Headphones,
  Radio,
  Sliders,
} from 'lucide-react';
import {
  playInstructionSpeech,
  stopInstructionSpeech,
  subscribeSpeechState,
  getVoiceStatus,
  VoiceStatus,
  unlockAudio,
} from '../utils/speech';

interface LessonViewerProps {
  lessons: Lesson[];
  activeLessonId: string;
  onSelectLesson: (id: string) => void;
  currentStepIndex: number;
  onRestartLesson: () => void;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onJumpToStep?: (index: number) => void;
}

export const LessonViewer: React.FC<LessonViewerProps> = ({
  lessons,
  activeLessonId,
  onSelectLesson,
  currentStepIndex,
  onRestartLesson,
  onNextStep,
  onPrevStep,
  onJumpToStep,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'tvm' | 'loan' | 'cashflow' | 'annuity' | 'algebra'>('all');
  
  // Chigoxa Voice Narration State
  const [autoVoice, setAutoVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({
    voiceName: 'Chigoxa',
    inworldConfigured: false,
    activeProvider: 'Chigoxa Voice',
  });
  const lastSpokenKeyRef = useRef<string>('');

  const currentLesson = lessons.find((l) => l.id === activeLessonId) || lessons[0];
  const progressPercent = Math.min(
    100,
    Math.round((currentStepIndex / currentLesson.steps.length) * 100)
  );
  const activeStep = currentLesson.steps[currentStepIndex];
  const isLessonComplete = currentStepIndex >= currentLesson.steps.length;

  const filteredLessons = selectedCategory === 'all'
    ? lessons
    : lessons.filter((l) => {
        if (selectedCategory === 'cashflow') return l.category === 'cashflow' || l.category === 'amortization';
        return l.category === selectedCategory;
      });

  // Track speech state subscription
  useEffect(() => {
    const unsubscribe = subscribeSpeechState((speaking, text) => {
      setIsSpeaking(speaking);
      setSpokenText(text);
    });

    getVoiceStatus().then((status) => {
      setVoiceStatus(status);
    });

    return () => {
      unsubscribe();
      stopInstructionSpeech();
    };
  }, []);

  // Unlock audio context on user interaction
  useEffect(() => {
    const handleUnlock = () => {
      unlockAudio();
    };
    window.addEventListener('pointerdown', handleUnlock, { once: true });
    window.addEventListener('keydown', handleUnlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('keydown', handleUnlock);
    };
  }, []);

  // Speak step instruction with Chigoxa voice directly
  const speakInstruction = (textToRead: string, keyIdentifier: string) => {
    unlockAudio();
    lastSpokenKeyRef.current = keyIdentifier;
    playInstructionSpeech(textToRead, {
      voiceId: 'Chigoxa',
      rate: speechSpeed,
      volume: 1.0,
      allowDeviceFallback: true, // Seamless fallback if Inworld key is not set
    });
  };

  // Hook/effect that automatically triggers narration of current step's description whenever currentStepIndex changes
  useEffect(() => {
    if (isLessonComplete || !activeStep) {
      if (isLessonComplete) {
        const completeKey = `${activeLessonId}:complete`;
        if (lastSpokenKeyRef.current !== completeKey) {
          const completeText = `Teacher Chigs here! Congratulations! You have completed all steps for ${currentLesson.title}. ${currentLesson.summaryTip || 'Great job mastering this financial calculation on the Sharp EL-738!'}`;
          speakInstruction(completeText, completeKey);
        }
      }
      return;
    }

    const currentKey = `${activeLessonId}:${currentStepIndex}`;
    if (lastSpokenKeyRef.current === currentKey) return;

    // The intro must start by Introducing Teacher Chigs
    if (currentStepIndex === 0) {
      const introText = `Hello, I am Teacher Chigs! In this lesson: ${currentLesson.scenario}. Step 1: ${activeStep.desc}`;
      speakInstruction(introText, currentKey);
    } else {
      const stepText = `Step ${currentStepIndex + 1}: ${activeStep.desc}`;
      speakInstruction(stepText, currentKey);
    }
  }, [currentStepIndex, activeLessonId, isLessonComplete, activeStep]);

  // Dedicated function to play Teacher Chigs lesson introduction
  const handlePlayTeacherIntro = () => {
    unlockAudio();
    if (isSpeaking) {
      stopInstructionSpeech();
      return;
    }
    const introText = `Hello! I am Teacher Chigs. Welcome to our Sharp EL-738 lesson on ${currentLesson.title}. Here is the problem to solve: ${currentLesson.scenario}. ${currentLesson.description ? 'Our target is to calculate ' + currentLesson.description + '.' : ''} Let's begin with Step 1: ${currentLesson.steps[0]?.desc || 'Start calculation'}.`;
    speakInstruction(introText, `${activeLessonId}:teacher-intro:${Date.now()}`);
  };

  // Read current active step manually
  const handleReadCurrentStep = () => {
    unlockAudio();
    if (isSpeaking) {
      stopInstructionSpeech();
      return;
    }
    if (!isLessonComplete && activeStep) {
      if (currentStepIndex === 0) {
        const introText = `Hello, I am Teacher Chigs! Problem: ${currentLesson.scenario}. Step 1: ${activeStep.desc}`;
        speakInstruction(introText, `${activeLessonId}:${currentStepIndex}:${Date.now()}`);
      } else {
        const stepText = `Step ${currentStepIndex + 1}: ${activeStep.desc}`;
        speakInstruction(stepText, `${activeLessonId}:${currentStepIndex}:${Date.now()}`);
      }
    } else if (isLessonComplete) {
      const completeText = `Teacher Chigs here! Congratulations! You have completed all steps for ${currentLesson.title}. ${currentLesson.summaryTip || 'Great job mastering this financial calculation!'}`;
      speakInstruction(completeText, `${activeLessonId}:complete:${Date.now()}`);
    }
  };

  // Read a specific step from the list directly
  const handleReadStepItem = (step: TutorialStep, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    unlockAudio();
    speakInstruction(step.desc, `${activeLessonId}:step-${idx}:${Date.now()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Category Pills & Interactive Lesson Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Interactive Tutorials & Scenarios</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <span>{lessons.length} Modules Available</span>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px]">
          {[
            { id: 'all', label: 'All Modules' },
            { id: 'tvm', label: 'TVM Basics' },
            { id: 'loan', label: 'Car Loan & PMT' },
            { id: 'cashflow', label: 'NPV / IRR / Cashflows' },
            { id: 'annuity', label: 'Annuity & BGN' },
            { id: 'algebra', label: 'Algebra & Scientific' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-2.5 py-1 rounded-full font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Lesson Horizontal Strip */}
        <div className="flex gap-2 overflow-x-auto pt-1 scrollbar-thin">
          {filteredLessons.map((lesson) => {
            const isActive = lesson.id === activeLessonId;
            return (
              <button
                key={lesson.id}
                onClick={() => {
                  stopInstructionSpeech();
                  onSelectLesson(lesson.id);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {lesson.title.split('.')[0]}
                </span>
                <span className="truncate max-w-[150px]">
                  {lesson.title.split('.')[1]?.trim() || lesson.title}
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  isActive ? 'bg-white/25 text-white' : 'bg-blue-50 text-blue-700'
                }`}>
                  {lesson.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Guided Instructions - Main Workflow */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        {/* Module Header & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                {currentLesson.badge}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                <span>👨‍🏫 Guided by Teacher Chigs</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Difficulty: {currentLesson.difficulty}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {currentLesson.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 font-mono">
              {progressPercent}% Complete
            </span>
            {/* Explicit Listen to Steps Button */}
            <button
              type="button"
              id="listen-to-steps-main-btn"
              data-testid="listen-to-steps-button"
              onClick={handleReadCurrentStep}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold shadow-sm transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-300 animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 hover:scale-[1.02]'
              }`}
              title={isSpeaking ? 'Stop Chigoxa voice' : 'Listen to guided steps read aloud'}
            >
              {isSpeaking ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-white" />
                  <span>Listen to Steps</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                stopInstructionSpeech();
                onRestartLesson();
              }}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600 font-medium transition-colors px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
              title="Reset steps from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Tutorial</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
          <div
            className="bg-blue-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ======================================================== */}
        {/* ACTIVE QUESTION & PROBLEM STATEMENT (ALWAYS VISIBLE DURING GUIDED NARRATION) */}
        {/* ======================================================== */}
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50/95 via-indigo-50/50 to-blue-50/95 border-2 border-blue-200/90 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-blue-100">
            <span className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Question / Problem to Solve (Font Size 12):</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                Teacher Chigs Guide
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">
                {currentLesson.badge}
              </span>
            </div>
          </div>

          {/* Question problem statement in Font Size 12 */}
          <p className="text-[12pt] sm:text-[13pt] text-slate-950 font-semibold leading-relaxed">
            {currentLesson.scenario}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-blue-200/80">
            {currentLesson.description ? (
              <div className="text-[12pt] text-blue-950 font-medium flex items-center gap-1.5 bg-white/90 px-3 py-1.5 rounded-lg border border-blue-100 shadow-2xs">
                <span className="text-blue-600 font-bold shrink-0">🎯 Target:</span>
                <span className="font-semibold text-slate-900">{currentLesson.description}</span>
              </div>
            ) : <div />}

            <div className="flex flex-wrap items-center gap-2">
              {/* Dedicated Teacher Chigs Intro Button */}
              <button
                type="button"
                id="btn-teacher-chigs-intro"
                onClick={handlePlayTeacherIntro}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer ring-2 ring-indigo-200 hover:scale-[1.02]"
                title="Listen to Teacher Chigs introduce this lesson and question"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Teacher Chigs Intro</span>
              </button>

              {/* Prominent Listen to Steps Button right on the Question Card */}
              <button
                type="button"
                onClick={handleReadCurrentStep}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer ${
                  isSpeaking
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-300 animate-pulse'
                    : 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 hover:scale-[1.02]'
                }`}
                title={isSpeaking ? 'Stop Teacher Chigs voice' : 'Listen to steps read aloud'}
              >
                {isSpeaking ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Listen to Steps</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CHIGOXA VOICE GUIDE CONTROL PANEL */}
        {/* ======================================================== */}
        <div className={`mb-4 p-3.5 rounded-xl border transition-all ${
          isSpeaking
            ? 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-amber-300 shadow-sm ring-2 ring-amber-300/60'
            : 'bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 border-slate-200'
        }`}>
          {voiceStatus.inworldConfigured ? (
            <div className="mb-2.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-950 flex items-center justify-between gap-2 shadow-2xs">
              <span className="font-semibold flex items-center gap-1.5 text-emerald-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Authentic Inworld Chigoxa Voice Connected
              </span>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                Custom Voice Active
              </span>
            </div>
          ) : (
            <div className="mb-2.5 p-2.5 bg-amber-50/95 border border-amber-300 rounded-lg text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  🔒 Inworld Chigoxa Key:
                </span>
                <span className="text-amber-800 text-[11px]">
                  Add <strong>INWORLD_API_KEY</strong> in AI Studio Secrets to stream the authentic Chigoxa voice.
                </span>
              </div>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full self-start sm:self-auto">
                Internet Voices Blocked
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Chigoxa Persona & Soundwave Equalizer Indicator */}
            <div className="flex items-center gap-3">
              <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all ${
                isSpeaking
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white ring-4 ring-amber-200 animate-pulse'
                  : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
              }`}>
                {isSpeaking ? (
                  <Headphones className="w-5 h-5 animate-bounce" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
                {isSpeaking && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    Teacher Chigs
                    <span className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider shadow-2xs">
                      Teacher Chigs Voice
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-600">
                  {isSpeaking ? (
                    <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                      <span className="flex items-end gap-0.5 h-3">
                        <span className="w-1 bg-amber-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2"></span>
                        <span className="w-1 bg-amber-600 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-3"></span>
                        <span className="w-1 bg-amber-500 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-1.5"></span>
                        <span className="w-1 bg-amber-600 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-2.5"></span>
                      </span>
                      <span>Teacher Chigs is reading instructions aloud...</span>
                    </div>
                  ) : (
                    <span className="text-slate-500">
                      Teacher Chigs reads step instructions, calculator buttons & LCD targets
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controls: Play/Stop, Auto-Read Toggle, Speed Selector */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {/* Prominent Listen to Steps Button */}
              <button
                type="button"
                onClick={handleReadCurrentStep}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer ${
                  isSpeaking
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-300 animate-pulse'
                    : 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 hover:scale-[1.02]'
                }`}
                title={isSpeaking ? 'Stop Teacher Chigs voice' : 'Listen to guided steps read aloud'}
              >
                {isSpeaking ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Listen to Steps</span>
                  </>
                )}
              </button>

              {/* Auto-Read Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !autoVoice;
                  setAutoVoice(next);
                  if (!next && isSpeaking) {
                    stopInstructionSpeech();
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  autoVoice
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                }`}
                title="Teacher Chigs automatically speaks step instructions when advancing"
              >
                {autoVoice ? (
                  <>
                    <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    <span>Teacher Chigs Auto-Read: ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span>Teacher Chigs Auto-Read: OFF</span>
                  </>
                )}
              </button>

              {/* Speed selector */}
              <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 text-[11px] font-semibold">
                {[
                  { rate: 0.85, label: '0.8x' },
                  { rate: 1.0, label: '1.0x' },
                  { rate: 1.15, label: '1.2x' },
                ].map((s) => (
                  <button
                    key={s.rate}
                    type="button"
                    onClick={() => {
                      setSpeechSpeed(s.rate);
                    }}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      speechSpeed === s.rate
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Speaking Marquee / Live Transcript */}
          {isSpeaking && spokenText && (
            <div className="mt-2.5 pt-2 border-t border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-1.5 font-medium leading-relaxed bg-amber-100/60 p-2 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-950">Teacher Chigs Narration: </strong>
                <span>"{spokenText}"</span>
              </div>
            </div>
          )}
        </div>

        {/* Active Step Highlight Prompt - Red Before Executed */}
        {!isLessonComplete && activeStep && (
          <div className={`mb-4 p-4 rounded-xl text-xs shadow-md border-l-4 transition-all ${
            isSpeaking
              ? 'bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-red-600 ring-2 ring-red-400'
              : 'bg-gradient-to-r from-red-50/90 via-rose-50/80 to-red-50/90 border-red-600 ring-1 ring-red-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-bold text-red-950 text-[11px] uppercase tracking-wider flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-red-600" />
                    <span>Current Action</span>
                    <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-2xs">
                      Red Before Executed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSpeaking && (
                      <span className="text-[10px] text-red-900 bg-red-100 px-2 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-red-700" />
                        Teacher Chigs Narrating
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleReadCurrentStep}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs ${
                        isSpeaking
                          ? 'bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-rose-300 animate-pulse'
                          : 'bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-300 hover:scale-[1.02]'
                      }`}
                      title={isSpeaking ? "Stop Teacher Chigs speech" : "Listen to guided steps read aloud"}
                    >
                      {isSpeaking ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Audio</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen to Steps</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Solving problem statement in Font Size 12 */}
                <div className="text-[12pt] sm:text-[13pt] text-blue-950 bg-blue-50/95 px-3 py-2 rounded-lg border border-blue-200 mb-2.5 font-medium flex items-start gap-2 shadow-2xs">
                  <span className="font-bold text-blue-700 shrink-0 mt-0.5">Solving (Font Size 12):</span>
                  <span className="leading-snug">{currentLesson.scenario}</span>
                </div>

                <div className="text-slate-900 font-bold text-sm sm:text-base leading-snug">
                  {activeStep.desc}
                </div>

                {activeStep.explanation && (
                  <p className="text-slate-700 mt-2 text-xs leading-relaxed flex items-start gap-1.5 bg-white/80 p-2.5 rounded-lg border border-red-200/70 shadow-2xs">
                    <HelpCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{activeStep.explanation}</span>
                  </p>
                )}

                <div className="mt-2.5 text-[11px] text-slate-600 font-mono flex items-center gap-2">
                  <span>Screen:</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                    {activeStep.expectedDisplay}
                  </span>
                </div>
              </div>

              {/* Big Action Button / Call to Action - Red Before Executed */}
              <div className="shrink-0 flex flex-row sm:flex-col items-center justify-between sm:justify-center p-3 bg-white/95 rounded-xl border-2 border-red-300 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-red-700 sm:mb-1.5">
                  Click on Keypad
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 bg-red-600 text-white font-mono font-black rounded-xl shadow-md text-sm ring-4 ring-red-300/80 animate-pulse">
                    [{activeStep.key}]
                  </span>
                </div>
                {onNextStep && (
                  <button
                    onClick={onNextStep}
                    className="mt-2 text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-0.5"
                    title="Skip to next step"
                  >
                    <span>Skip step</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Controls (Prev, Next, Manual Audio Trigger) */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                stopInstructionSpeech();
                onPrevStep && onPrevStep();
              }}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
            <button
              onClick={() => {
                stopInstructionSpeech();
                onNextStep && onNextStep();
              }}
              disabled={isLessonComplete}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleReadCurrentStep}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer shadow-2xs ${
                isSpeaking
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                  : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
              }`}
              title={isSpeaking ? 'Stop audio' : 'Listen to guided steps read aloud'}
            >
              {isSpeaking ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Listen to Steps</span>
                </>
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block">
            Tip: Press the pulsing key on the calculator or your physical keyboard!
          </div>
        </div>

        {/* Lesson Complete Banner */}
        {isLessonComplete && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Great Job! You Mastered This Scenario</span>
              </div>
              <button
                type="button"
                onClick={handleReadCurrentStep}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-white border border-emerald-300 px-2 py-0.5 rounded cursor-pointer hover:bg-emerald-100"
              >
                <Volume2 className="w-3 h-3" />
                <span>Replay Chigoxa's Summary</span>
              </button>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed mb-3">
              {currentLesson.summaryTip || 'You have successfully executed this financial calculation sequence on the Sharp EL-738.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  stopInstructionSpeech();
                  onRestartLesson();
                }}
                className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Repeat Lesson</span>
              </button>
              {lessons.findIndex((l) => l.id === activeLessonId) < lessons.length - 1 && (
                <button
                  onClick={() => {
                    stopInstructionSpeech();
                    const currentIndex = lessons.findIndex((l) => l.id === activeLessonId);
                    onSelectLesson(lessons[currentIndex + 1].id);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <span>Next Lesson ({lessons[lessons.findIndex((l) => l.id === activeLessonId) + 1].title.split('.')[1]?.trim()})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step Items List (Clickable to jump, with audio play button for each step) */}
        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 text-xs scrollbar-thin">
          {currentLesson.steps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={idx}
                onClick={() => {
                  stopInstructionSpeech();
                  onJumpToStep && onJumpToStep(idx);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  isDone
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 hover:bg-emerald-100/60'
                    : isCurrent
                    ? 'bg-red-50/95 border-red-500 font-bold text-red-950 shadow-md ring-2 ring-red-400'
                    : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100/70 opacity-80'
                }`}
                title={`Jump to step ${idx + 1}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                        isCurrent ? 'bg-red-600 text-white ring-2 ring-red-300' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`block truncate ${isDone ? 'line-through text-slate-500' : 'text-slate-900 font-semibold'}`}>
                        {step.desc}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0 shadow-2xs">
                          Red Before Executed
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Screen: {step.expectedDisplay}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleReadStepItem(step, idx, e)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                      isCurrent
                        ? 'bg-red-100 hover:bg-red-200 text-red-900 border border-red-300'
                        : 'text-slate-600 hover:text-amber-700 bg-white border border-slate-200 hover:bg-slate-50'
                    }`}
                    title={`Listen to Chigoxa read Step ${idx + 1}`}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Listen</span>
                  </button>

                  <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs uppercase ${
                    isDone
                      ? 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                      : isCurrent
                      ? 'bg-red-600 text-white border-2 border-red-700 shadow-xs ring-2 ring-red-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {step.key}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
