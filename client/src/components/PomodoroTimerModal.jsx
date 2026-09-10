import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, CheckCircle2, Flame, Volume2 } from 'lucide-react';
import Button from './Button';
import Badge from './Badge';

/**
 * Pure Web Audio API Chime Synth (no external audio files needed)
 */
function playCompletionChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Play tone 1 (G5 - 783.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, ctx.currentTime);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);

    // Play tone 2 (C6 - 1046.50 Hz after 0.2s)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.2);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 1.0);
  } catch (e) {
    console.log('Audio playback error', e);
  }
}

export default function PomodoroTimerModal({ task, onClose, onCompleteTask }) {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let timer = null;
    if (isActive && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      playCompletionChime();
    }
    return () => clearInterval(timer);
  }, [isActive, secondsLeft]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(25 * 60);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercentage = Math.round(((25 * 60 - secondsLeft) / (25 * 60)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <Badge variant="primary" className="mb-2 gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
            Focus Session
          </Badge>
          <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{task?.title || 'Study Session'}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Est. {task?.estimatedMinutes || 30} mins</p>
        </div>

        {/* Big Digital Timer Display */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="text-5xl font-extrabold font-mono tracking-tight text-slate-900 mb-4">
            {formatTime(secondsLeft)}
          </div>

          {/* Minimal Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mb-2">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Audio chime enabled when timer reaches 00:00</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant={isActive ? 'outline' : 'primary'}
            onClick={toggleTimer}
            size="lg"
            className="w-32 gap-2"
          >
            {isActive ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
          </Button>

          <Button
            variant="outline"
            onClick={resetTimer}
            size="lg"
            className="p-3"
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            onClick={playCompletionChime}
            size="lg"
            className="p-3 text-slate-500 hover:text-accent"
            title="Test Chime Sound"
          >
            <Volume2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Finish Task Action */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <Button
            variant="success"
            onClick={() => {
              playCompletionChime();
              onCompleteTask(task._id);
              onClose();
            }}
            className="w-full gap-2 font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" /> Mark Task Completed Now
          </Button>
        </div>
      </div>
    </div>
  );
}
