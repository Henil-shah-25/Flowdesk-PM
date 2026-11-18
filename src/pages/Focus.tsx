import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GlassCard, Button, Toggle, SegmentedControl } from '../components/ui';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { useTableData, useCreateRecord } from '../hooks/useData';
import { useToast } from '../components/common/Toast';

export const Focus: React.FC = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'pomodoro' | 'shortBreak' | 'longBreak'>('pomodoro');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const { data: tasks = [] } = useTableData('Tasks');
  const createTimeLog = useCreateRecord('TimeLogs');
  const { showToast } = useToast();

  const sessionStartTimeRef = useRef<string | null>(null);

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId);
  }, [tasks, selectedTaskId]);

  const openTasks = useMemo(() => {
    return tasks.filter((t) => !t.done_at);
  }, [tasks]);

  useEffect(() => {
    let interval: number | null = null;
    if (isActive) {
      if (!sessionStartTimeRef.current) {
        sessionStartTimeRef.current = new Date().toISOString();
      }
      interval = window.setInterval(() => {
        if (seconds > 0) {
          setSeconds((s) => s - 1);
        } else if (minutes > 0) {
          setMinutes((m) => m - 1);
        } else {
          setIsActive(false);
          // Log time when pomodoro finishes
          if (mode === 'pomodoro') {
            const start = sessionStartTimeRef.current || new Date().toISOString();
            const end = new Date().toISOString();
            createTimeLog.mutate({
              mode: 'pomodoro',
              start,
              end,
              duration_min: 25,
              task_id: selectedTaskId || '',
              project_id: selectedTask?.project_id || '',
            });
            showToast({
              message: 'Focus session completed! 25 minutes logged.',
            });
          }
          sessionStartTimeRef.current = null;
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, minutes, seconds, mode, selectedTaskId, selectedTask, createTimeLog, showToast]);

  const selectMode = (newMode: 'pomodoro' | 'shortBreak' | 'longBreak') => {
    setIsActive(false);
    sessionStartTimeRef.current = null;
    setMode(newMode);
    if (newMode === 'pomodoro') {
      setMinutes(25);
    } else if (newMode === 'shortBreak') {
      setMinutes(5);
    } else {
      setMinutes(15);
    }
    setSeconds(0);
  };

  const resetTimer = () => {
    setIsActive(false);
    sessionStartTimeRef.current = null;
    selectMode(mode);
  };

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  // Ring color: Coral ring for focus, Lime ring for rest
  const ringColor = mode === 'pomodoro' ? '#F26B3A' : '#C6F432';

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      <div>
        <h1 className="text-[clamp(52px,5.5vw,76px)] font-light tracking-[-0.02em] text-graphite leading-[1.05]">
          Focus Session
        </h1>
        <p className="text-xs sm:text-[13px] text-secondary mt-2 font-normal">
          Deep work blocks with calm structured intervals.
        </p>
      </div>

      {/* Main Focus Card */}
      <GlassCard className="p-8 sm:p-12 text-center flex flex-col items-center">
        {/* Segmented Pill Selector */}
        <SegmentedControl
          value={mode}
          onChange={(val) => selectMode(val)}
          size="md"
          options={[
            { value: 'pomodoro', label: 'Pomodoro (25m)' },
            { value: 'shortBreak', label: 'Short Break (5m)' },
            { value: 'longBreak', label: 'Long Break (15m)' },
          ]}
        />

        {/* Task Selection */}
        {openTasks.length > 0 && (
          <div className="mt-6 w-full max-w-xs">
            <label className="block text-xs text-secondary mb-1.5 text-center">
              Target Task (Optional)
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20 text-center truncate"
            >
              <option value="">General Focus (No task linked)</option>
              {openTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Big Light Number inside Timer Ring (Coral for focus, Lime for rest) */}
        <div className="relative my-8 w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="rgba(27, 29, 31, 0.08)"
              strokeWidth="3.5"
              fill="none"
            />
            {/* Dynamic colored ring: coral for focus, lime for rest */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke={ringColor}
              strokeWidth="4"
              strokeDasharray={276}
              strokeDashoffset={isActive ? 60 : 0}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Centered Large Light-Weight Number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl sm:text-6xl font-light text-graphite tracking-tight font-sans">
              {formatNumber(minutes)}:{formatNumber(seconds)}
            </div>
            <div className="mt-2">
              <span className="text-xs text-secondary font-normal">
                {isActive ? 'Session Active' : 'Ready to start'}
              </span>
            </div>
          </div>
        </div>

        {/* Timer Control Buttons */}
        <div className="flex items-center gap-3 mt-2">
          <Button
            variant="primary"
            size="md"
            icon={isActive ? <Pause size={16} /> : <Play size={16} />}
            onClick={() => setIsActive(!isActive)}
            className="w-36"
          >
            {isActive ? 'Pause' : 'Start Focus'}
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={<RotateCcw size={16} />}
            onClick={resetTimer}
            aria-label="Reset Timer"
          >
            Reset
          </Button>
        </div>

        {/* Ambient Settings */}
        <div className="mt-10 pt-5 border-t border-black/[0.05] w-full flex items-center justify-between text-xs text-secondary font-normal">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-secondary" />
            <span>Gentle Ambient Gong</span>
          </div>
          <Toggle checked={soundEnabled} onChange={setSoundEnabled} size="sm" />
        </div>
      </GlassCard>
    </div>
  );
};
