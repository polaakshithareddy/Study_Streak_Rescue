import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CheckCircle2, Calendar, BarChart3, User, Zap, Award, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [unlockedPerks, setUnlockedPerks] = useState([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/rewards/summary')
        .then(res => {
          setUnlockedPerks(res.data.unlockedPerks || []);
          if (res.data.activeTheme === 'dark') {
            setIsDark(true);
            document.body.classList.add('dark-theme');
          }
        })
        .catch(() => {});
    }
  }, [user, location]);

  const toggleTheme = () => {
    const nextState = !isDark;
    setIsDark(nextState);
    if (nextState) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  if (!user) return null;

  const isGoldScholar = unlockedPerks.includes('perk_gold_badge');
  const hasFocusTheme = unlockedPerks.includes('perk_focus_theme');

  const navItems = [
    { label: 'Today', path: '/today', icon: CheckCircle2 },
    { label: 'Plan', path: '/plan/review', alternativePaths: ['/plan/new', '/plan/regenerate'], icon: Calendar },
    { label: 'Rewards', path: '/rewards', alternativePaths: ['/rewards/history', '/rewards/redeem'], icon: Award },
    { label: 'Progress', path: '/progress', icon: BarChart3 },
    { label: 'Profile', path: '/profile', icon: User }
  ];

  const isLinkActive = (item) => {
    if (location.pathname === item.path) return true;
    if (item.alternativePaths && item.alternativePaths.includes(location.pathname)) return true;
    return false;
  };

  return (
    <>
      {/* Desktop Top Header Nav */}
      <header className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NavLink to="/today" className="flex items-center gap-2 font-bold text-lg text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <span>Study Streak Rescue</span>
            </NavLink>

            {/* Gold Scholar Perk Badge */}
            {isGoldScholar && (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-xs">
                👑 Gold Scholar
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <nav className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isLinkActive(item);
                return (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-subtle ${
                      active
                        ? 'bg-accent-light text-accent'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Dark Focus Theme Perk Toggle */}
            {hasFocusTheme && (
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-subtle"
                title="Toggle Dark Focus Theme"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-1">
        <div className="flex justify-around items-center h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item);
            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition-subtle ${
                  active ? 'text-accent' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
