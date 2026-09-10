import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { User, Mail, Calendar, LogOut, RotateCcw, ShieldCheck, Zap, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reSeeding, setReSeeding] = useState(false);

  const fetchPlan = () => {
    setLoading(true);
    api.get('/plans/active')
      .then(res => {
        if (res.data.hasActivePlan) {
          setActivePlan(res.data.plan);
        } else {
          setActivePlan(null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const handleReSeedDemo = async () => {
    setReSeeding(true);
    try {
      await api.post('/auth/seed-demo');
      fetchPlan();
      navigate('/today');
    } catch (err) {
      alert('Failed to re-seed demo data: ' + err.message);
    } finally {
      setReSeeding(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Profile & Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your account and active catch-up plan parameters.</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="gap-1.5 text-danger border-red-200 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </Button>
      </div>

      {/* User Information Card */}
      <Card title="Account Information">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center text-base">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{user?.name || 'Student User'}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Active Plan Details & Version History */}
      <Card title="Active Catch-Up Plan Status">
        {loading ? (
          <LoadingSpinner text="Loading plan metadata..." />
        ) : activePlan ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{activePlan.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target Recovery: {dayjs(activePlan.targetDate).format('MMMM D, YYYY')}
                </p>
              </div>
              <Badge variant="primary">Version {activePlan.version}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Daily Available Time:</span>
                <span className="font-semibold text-slate-800">{activePlan.availableMinutesPerDay} minutes/day</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Busy Slots Excluded:</span>
                <span className="font-semibold text-slate-800">{activePlan.busySlots?.length || 0} slots configured</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No active plan currently registered.</p>
        )}
      </Card>

      {/* Hackathon Demo Quick Reset Helper */}
      <Card title="Hackathon Demo Shortcuts" subtitle="Instant data reset tools for presentations">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-blue-50/60 border border-blue-200 rounded-lg">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-accent" />
                One-Click Re-Seed Demo Plan
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Resets active plan to sample tasks with 1 missed task yesterday to easily demo the Catch-Up Engine.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={reSeeding}
              onClick={handleReSeedDemo}
              className="shrink-0 gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {reSeeding ? 'Resetting...' : 'Re-Seed Demo Data'}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-current" />
                Create Custom Catch-Up Plan
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Test the Catch-Up Engine input form from scratch.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/plan/new')}
              className="shrink-0"
            >
              Start New Plan Form
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
