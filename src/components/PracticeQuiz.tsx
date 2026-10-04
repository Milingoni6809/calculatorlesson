import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { Award, CheckCircle, XCircle, HelpCircle, ArrowRight, RotateCcw, Volume2, Square, Sparkles } from 'lucide-react';
import { formatFinancial } from '../utils/financialMath';
import {
  playInstructionSpeech,
  stopInstructionSpeech,
  subscribeSpeechProgress,
  SpeechProgressInfo,
  unlockAudio,
} from '../utils/speech';
import { HighlightedScenario } from './HighlightedScenario';

interface PracticeQuizProps {
  questions: QuizQuestion[];
  currentCalculatorValue?: number | null;
  onLoadScenarioToCalc?: (q: QuizQuestion) => void;
}

export const PracticeQuiz: React.FC<PracticeQuizProps> = ({
  questions,
  currentCalculatorValue,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [score, setScore] = useState(0);
  const [completedList, setCompletedList] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechProgress, setSpeechProgress] = useState<SpeechProgressInfo>({
    speaking: false,
    text: '',
    charIndex: 0,
    word: '',
    progress: 0,
  });

  const q = questions[currentIdx];

  // Subscribe to speech progress for yellow highlight
  useEffect(() => {
    const unsub = subscribeSpeechProgress((info) => {
      setSpeechProgress(info);
      setIsSpeaking(info.speaking);
    });
    return () => {
      unsub();
      stopInstructionSpeech();
    };
  }, []);

  const handleReadQuizQuestion = () => {
    unlockAudio();
    if (isSpeaking) {
      stopInstructionSpeech();
      return;
    }
    const introText = `Hello, I am Teacher Chigs! In this quiz challenge, here is the problem: ${q.scenario}. Find the target variable: ${q.targetVariable}.`;
    playInstructionSpeech(introText, {
      voiceId: 'Chigoxa',
      rate: 1.0,
      allowDeviceFallback: true,
    });
  };

  const handleCheckAnswer = () => {
    const parsed = parseFloat(userAnswer.replace(/,/g, ''));
    if (isNaN(parsed)) {
      setFeedback({
        isCorrect: false,
        message: 'Please enter a valid number (e.g. 10356.09 or -1532.96)',
      });
      return;
    }

    // Check tolerance
    const delta = Math.abs(parsed - q.correctAnswer);
    const isCorrect = delta <= q.tolerance;

    if (isCorrect) {
      if (!completedList.includes(q.id)) {
        setScore((s) => s + 1);
        setCompletedList((list) => [...list, q.id]);
      }
      setFeedback({
        isCorrect: true,
        message: `Correct! The target value is ${formatFinancial(q.correctAnswer)} ${q.unit}.`,
      });
    } else {
      setFeedback({
        isCorrect: false,
        message: `Not quite. Your answer: ${parsed}. Expected around ${formatFinancial(q.correctAnswer)} ${q.unit}. Check hints or steps.`,
      });
    }
  };

  const handleUseCalcAnswer = () => {
    if (currentCalculatorValue !== null && currentCalculatorValue !== undefined && !isNaN(currentCalculatorValue)) {
      setUserAnswer(String(currentCalculatorValue));
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setUserAnswer('');
      setShowHint(false);
      setFeedback(null);
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setUserAnswer('');
    setShowHint(false);
    setFeedback(null);
    setScore(0);
    setCompletedList([]);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      {/* Header with Score */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 text-sm">
            Interactive Financial Practice Challenges
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-200">
            Solved: {completedList.length} / {questions.length}
          </span>
          <button
            onClick={handleReset}
            title="Reset Quiz"
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Question Selector Pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {questions.map((item, idx) => {
          const isDone = completedList.includes(item.id);
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentIdx(idx);
                setUserAnswer('');
                setShowHint(false);
                setFeedback(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isCurrent
                  ? 'bg-blue-600 text-white border-blue-600'
                  : isDone
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isDone && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
              <span>Challenge {idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Problem Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-900 text-sm">{q.title}</h4>
            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              Teacher Chigs Quiz
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReadQuizQuestion}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-[1.02]'
              }`}
              title={isSpeaking ? 'Stop Teacher Chigs voice' : 'Listen to problem read aloud'}
            >
              {isSpeaking ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen to Problem</span>
                </>
              )}
            </button>
            <span className="text-[11px] font-mono font-bold bg-white text-blue-700 px-2 py-0.5 rounded border border-slate-200">
              Find: [{q.targetVariable}]
            </span>
          </div>
        </div>

        {/* Problem statement in Font Size 12 with real-time yellow highlight on voice speech */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 mb-3 shadow-2xs">
          <HighlightedScenario
            scenario={q.scenario}
            spokenText={speechProgress.text}
            speechCharIndex={speechProgress.charIndex}
            speechWord={speechProgress.word}
            isSpeaking={isSpeaking}
            fontSizePt={12}
          />
        </div>

        {/* Given values chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {q.givenValues.map((gv, i) => (
            <div key={i} className="bg-white p-2 rounded border border-slate-200">
              <span className="text-[10px] text-slate-400 block">{gv.label}</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{gv.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Answer Submission Box */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder={`Enter calculated ${q.targetVariable} (e.g. ${q.correctAnswer})`}
              className="w-full text-xs sm:text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCheckAnswer();
              }}
            />
          </div>

          {currentCalculatorValue !== null && currentCalculatorValue !== undefined && (
            <button
              onClick={handleUseCalcAnswer}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
            >
              Paste from Calculator LCD
            </button>
          )}

          <button
            onClick={handleCheckAnswer}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Check Answer
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              feedback.isCorrect
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {feedback.isCorrect ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div className="flex-1">{feedback.message}</div>
          </div>
        )}

        {/* Hint and Solution Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showHint ? 'Hide Calculator Steps' : 'Show Keystroke Hint'}</span>
          </button>

          {currentIdx < questions.length - 1 && (
            <button
              onClick={handleNext}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
            >
              Next Problem <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Keystrokes Hint Box */}
        {showHint && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-2 text-amber-950">
            <div className="font-bold text-amber-900">Step-by-Step Keystrokes:</div>
            <ul className="list-decimal list-inside space-y-1 font-mono text-[11px] text-amber-900">
              {q.solutionSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
