import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, Flame, CheckCircle2, Zap, ShoppingBag, ArrowRight } from 'lucide-react';
import Button from './Button';

/**
 * Play a triumphant victory fanfare via Web Audio API
 */
function playVictoryFanfare() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [
      { freq: 523.25, time: 0, duration: 0.15 },    // C5
      { freq: 659.25, time: 0.15, duration: 0.15 }, // E5
      { freq: 783.99, time: 0.30, duration: 0.15 }, // G5
      { freq: 1046.50, time: 0.45, duration: 0.5 }  // C6 (High sustained)
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + note.time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + note.time);
      osc.stop(ctx.currentTime + note.time + note.duration);
    });
  } catch (e) {
    console.log('Audio error', e);
  }
}

export default function CelebrationModal({ onClose, xpEarned = 600, userLevel = 1 }) {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    playVictoryFanfare();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#2563eb', '#16a34a', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
    const particles = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2 - 50,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.8) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let animationFrameId;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      particles.forEach(p => {
        if (p.opacity > 0) {
          aliveCount++;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.3;
          p.rotation += p.rotationSpeed;
          p.opacity -= 0.008;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        animationFrameId = requestAnimationFrame(render);
      }
    }

    render();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-10" />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 relative z-20 animate-in zoom-in-95 duration-200">
        {/* Glow Trophy Icon */}
        <div className="relative inline-block mx-auto mt-2">
          <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mx-auto shadow-inner ring-8 ring-amber-50 animate-bounce">
            <Trophy className="w-10 h-10 fill-current" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow">
            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
          </div>
        </div>

        <div>
          <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 fill-current" /> Day Cleared!
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">DAILY MASTERY!</h2>
          <p className="text-xs text-slate-500 mt-1">
            You completed every task scheduled for today. Zero tasks left behind!
          </p>
        </div>

        {/* XP Rewards Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-3 text-center">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">XP & Study Points</span>
            <span className="text-xl font-extrabold text-accent flex items-center justify-center gap-1 mt-0.5">
              <Zap className="w-4 h-4 fill-current text-accent" /> +{xpEarned} Pts
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Student Rank</span>
            <span className="text-xl font-extrabold text-amber-600 flex items-center justify-center gap-1 mt-0.5">
              Level {userLevel}
            </span>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-2.5 text-[11px] text-blue-900">
          💡 <strong>What are XP Points for?</strong> Your XP points automatically convert into <strong>Study Points</strong> in your <span className="font-bold underline cursor-pointer" onClick={() => { onClose(); navigate('/rewards'); }}>Rewards Wallet</span>! You can spend them on perks & treats.
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-1">
          <Button
            variant="primary"
            size="lg"
            onClick={onClose}
            className="w-full font-bold text-sm py-2.5 gap-2"
          >
            <Flame className="w-4 h-4 fill-current text-amber-400" />
            Awesome! Keep The Streak Going
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => {
              onClose();
              navigate('/rewards/redeem');
            }}
            className="w-full text-xs font-semibold gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-accent" /> Spend Points in Rewards Shop <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
