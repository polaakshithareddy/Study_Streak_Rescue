import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import { Zap, AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate('/today');
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent text-white mb-3 shadow-sm">
            <Zap className="w-7 h-7 fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Study Streak Rescue</h1>
          <p className="text-sm text-slate-500 mt-1">Turn missed deadlines into achievable day-by-day catch-up plans.</p>
        </div>

        <Card>
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-subtle ${
                isLogin ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => { setIsLogin(true); setError(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-subtle ${
                !isLogin ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => { setIsLogin(false); setError(''); }}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Alex Rivera"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="student@university.edu"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full mt-2"
              size="lg"
            >
              {submitting ? 'Please wait...' : isLogin ? 'Sign In to Dashboard' : 'Create Account'}
            </Button>
          </form>

          {/* Quick Demo Login Preset Notice */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Demo account preset available:
            </p>
            <button
              type="button"
              onClick={() => {
                setEmail('demo@example.com');
                setPassword('password123');
                setIsLogin(true);
              }}
              className="mt-1.5 text-xs text-accent font-medium hover:underline inline-flex items-center gap-1"
            >
              Click to autofill Demo credentials (demo@example.com)
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
