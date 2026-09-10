import React, { useState, useEffect } from 'react';
import { Coffee, Pause, Play, RotateCcw, X, CheckCircle2, Heart, Volume2 } from 'lucide-react';
import Button from './Button';
import Badge from './Badge';

/**
 * Play a gentle relaxing chime when coffee break finishes
 */
function playBreakFinishedChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [
      { freq: 440.00, time: 0, duration: 0.3 },    // A4
      { freq: 554.37, time: 0.25, duration: 0.3 }, // C#5
      { freq: 659.25, time: 0.50, duration: 0.6 }  // E5
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + n.time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.duration);
    });
  } catch (e) {
    console.log('Audio error', e);
  }
}

export default function CoffeeBreakModal({ onClose }) {
  const [secondsLeft, setSecondsLeft] = useState(15 * 60); // 15 mins default
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let timer = null;
    if (isActive && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      playBreakFinishedChime();
    }
    return () => clearInterval(timer);
  }, [isActive, secondsLeft]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(15 * 60);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercentage = Math.round(((15 * 60 - secondsLeft) / (15 * 60)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-amber-200 shadow-2xl max-w-md w-full p-6 text-center space-y-5 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Coffee Header */}
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner ring-8 ring-amber-50">
          <Coffee className="w-8 h-8" />
        </div>

        <div>
          <Badge variant="warning" className="mb-1 gap-1 text-xs">
            <Heart className="w-3.5 h-3.5 fill-current text-red-500" />
            Reward Treat Unlocked!
          </Badge>
          <h2 className="text-xl font-extrabold text-slate-900">15-Minute Coffee & Relaxation Break</h2>
          <p className="text-xs text-slate-500 mt-1">
            You earned this treat! Step away from your screen, grab your coffee or snack, and enjoy your break.
          </p>
        </div>

        {/* Big Clock */}
        <div className="py-2">
          <div className="text-5xl font-black font-mono text-amber-900 tracking-tight mb-3">
            {formatTime(secondsLeft)}
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mb-2">
            <div
              className="h-full bg-amber-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {secondsLeft === 0 ? '☕ Break Finished! Hope you feel refreshed.' : 'Timer running... relaxing sound chime on finish.'}
          </p>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant={isActive ? 'outline' : 'primary'}
            onClick={toggleTimer}
            size="lg"
            className="w-32 gap-2"
          >
            {isActive ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Resume</>}
          </Button>

          <Button
            variant="outline"
            onClick={resetTimer}
            size="lg"
            className="p-3"
            title="Reset Break Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            onClick={playBreakFinishedChime}
            size="lg"
            className="p-3 text-slate-500 hover:text-amber-600"
            title="Test Chime Sound"
          >
            <Volume2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <Button
            variant="success"
            onClick={onClose}
            className="w-full font-bold text-sm py-2.5 gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Finish Break & Return to Study
          </Button>
        </div>
      </div>
    </div>
  );
}
