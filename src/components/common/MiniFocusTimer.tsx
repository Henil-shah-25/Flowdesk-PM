import React, { useState, useEffect, useRef } from 'react';

interface MiniFocusTimerProps {
  compact?: boolean;
}

export const MiniFocusTimer: React.FC<MiniFocusTimerProps> = ({ compact = false }) => {
  const [preset, setPreset] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const setDuration = (min: number) => {
    setPreset(min);
    setSeconds(min * 60);
    setRunning(false);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const pct = ((preset * 60 - seconds) / (preset * 60)) * 100;
  const r = compact ? 32 : 44;
  const c = 2 * Math.PI * r;
  const size = compact ? 80 : 112;
  const vb = r + 10;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`-${vb} -${vb} ${vb * 2} ${vb * 2}`} className="w-full h-full">
          <circle cx="0" cy="0" r={r} fill="none" stroke="rgba(27,29,31,0.08)" strokeWidth={compact ? 5 : 6} />
          <circle
            cx="0" cy="0" r={r} fill="none"
            stroke="var(--accent-lime)" strokeWidth={compact ? 5 : 6}
            strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
            transform="rotate(-90)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-light text-graphite tabular-nums ${compact ? 'text-base' : 'text-xl'}`}>
            {mm}:{ss}
          </span>
        </div>
      </div>

      <div className="flex gap-1.5">
        {[15, 25, 50].map(m => (
          <button
            key={m}
            onClick={() => setDuration(m)}
            className={`px-3 py-1 rounded-full text-xs font-normal transition-all ${
              preset === m
                ? 'bg-charcoal text-white'
                : 'bg-white/60 text-secondary border border-black/[0.07] hover:bg-white/80'
            }`}
          >
            {m}m
          </button>
        ))}
      </div>

      <button
        onClick={() => setRunning(r => !r)}
        className={`w-full py-2 rounded-full text-sm font-medium transition-all ${
          running
            ? 'bg-charcoal text-white hover:bg-charcoal/90'
            : 'bg-lime text-nearblack hover:bg-[var(--accent-lime-hover)]'
        }`}
      >
        {running ? 'Pause' : 'Start'}
      </button>
    </div>
  );
};
