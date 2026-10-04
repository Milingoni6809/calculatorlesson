import React, { useMemo } from 'react';

interface HighlightedScenarioProps {
  scenario: string;
  spokenText?: string;
  speechCharIndex?: number;
  speechWord?: string;
  isSpeaking?: boolean;
  className?: string;
  fontSizePt?: number;
  onWordClick?: (word: string, index: number) => void;
}

interface ScenarioToken {
  id: number;
  raw: string;
  clean: string;
  start: number;
  end: number;
  trailingSpace: string;
}

// Common stop words to avoid accidental false-positive highlights during step narration
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'it', 'as', 'what', 'will', 'be'
]);

export const HighlightedScenario: React.FC<HighlightedScenarioProps> = ({
  scenario,
  spokenText = '',
  speechCharIndex = 0,
  speechWord = '',
  isSpeaking = false,
  className = '',
  fontSizePt = 12,
  onWordClick,
}) => {
  // Parse scenario into individual word tokens with precise character offsets
  const tokens = useMemo<ScenarioToken[]>(() => {
    if (!scenario) return [];

    const result: ScenarioToken[] = [];
    const regex = /(\S+)(\s*)/g;
    let match: RegExpExecArray | null;
    let id = 0;

    while ((match = regex.exec(scenario)) !== null) {
      const raw = match[1];
      const trailingSpace = match[2];
      const start = match.index;
      const end = start + raw.length;
      const clean = raw.replace(/^[^\w$R]+|[^\w$R]+$/gi, '').toLowerCase();

      result.push({
        id: id++,
        raw,
        clean,
        start,
        end,
        trailingSpace,
      });
    }

    return result;
  }, [scenario]);

  // Determine scenario offset in current spoken text
  const scenarioOffset = useMemo(() => {
    if (!spokenText || !scenario) return -1;
    return spokenText.indexOf(scenario);
  }, [spokenText, scenario]);

  // Cleaned active spoken word for keyword matching
  const cleanSpokenWord = useMemo(() => {
    if (!speechWord) return '';
    return speechWord.replace(/^[^\w$R]+|[^\w$R]+$/gi, '').toLowerCase();
  }, [speechWord]);

  return (
    <span
      className={`inline font-semibold leading-relaxed text-slate-950 ${className}`}
      style={{
        fontSize: `${fontSizePt}pt`,
        lineHeight: 1.65,
      }}
      data-testid="highlighted-scenario-text"
    >
      {tokens.map((token) => {
        let isCurrent = false;
        let isSpoken = false;

        if (isSpeaking) {
          if (scenarioOffset !== -1) {
            // Spoken text includes the scenario directly (e.g. Teacher Chigs Intro or Read Question)
            const charInScenario = speechCharIndex - scenarioOffset;
            if (charInScenario >= token.start && charInScenario < token.end) {
              isCurrent = true;
            } else if (charInScenario >= token.end) {
              isSpoken = true;
            }
          } else if (cleanSpokenWord && cleanSpokenWord.length >= 2 && !STOP_WORDS.has(cleanSpokenWord)) {
            // Spoken text is outside scenario (e.g. step instruction) but matches key variables/numbers in scenario
            if (
              token.clean === cleanSpokenWord ||
              (token.clean.length >= 3 && cleanSpokenWord.length >= 3 && (token.clean.includes(cleanSpokenWord) || cleanSpokenWord.includes(token.clean)))
            ) {
              isCurrent = true;
            }
          }
        }

        return (
          <React.Fragment key={token.id}>
            <span
              onClick={() => onWordClick?.(token.raw, token.id)}
              className={`inline select-text rounded-xs transition-colors duration-100 ${
                isCurrent
                  ? 'bg-yellow-300 text-slate-950 shadow-[0_0_0_2px_#facc15]'
                  : isSpoken
                  ? 'bg-yellow-100/90 text-slate-900'
                  : 'text-slate-950 bg-transparent'
              } ${onWordClick ? 'cursor-pointer hover:bg-yellow-50' : ''}`}
              title={
                isCurrent
                  ? `Teacher Chigs speaking: "${token.raw}"`
                  : undefined
              }
            >
              {token.raw}
            </span>
            {token.trailingSpace}
          </React.Fragment>
        );
      })}
    </span>
  );
};
