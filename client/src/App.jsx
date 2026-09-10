import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import DeadlineReminderMonitor from './components/DeadlineReminderMonitor';

import AuthPage from './pages/AuthPage';
import TodayPage from './pages/TodayPage';
import NewPlanPage from './pages/NewPlanPage';
import PlanReviewPage from './pages/PlanReviewPage';
import ProgressPage from './pages/ProgressPage';
import RegeneratePage from './pages/RegeneratePage';
import ProfilePage from './pages/ProfilePage';
import RewardsPage from './pages/RewardsPage';
import RewardsHistoryPage from './pages/RewardsHistoryPage';
import RewardsRedeemPage from './pages/RewardsRedeemPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Authenticating user session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner text="Initializing Study Streak Rescue..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      {user && <DeadlineReminderMonitor />}
      <main className="flex-1">
        <Routes>
          <Route path="/auth" element={user ? <Navigate to="/today" replace /> : <AuthPage />} />

          <Route path="/today" element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
          <Route path="/plan/new" element={<ProtectedRoute><NewPlanPage /></ProtectedRoute>} />
          <Route path="/plan/review" element={<ProtectedRoute><PlanReviewPage /></ProtectedRoute>} />
          <Route path="/plan/regenerate" element={<ProtectedRoute><RegeneratePage /></ProtectedRoute>} />
          <Route path="/rewards" element={<ProtectedRoute><RewardsPage /></ProtectedRoute>} />
          <Route path="/rewards/history" element={<ProtectedRoute><RewardsHistoryPage /></ProtectedRoute>} />
          <Route path="/rewards/redeem" element={<ProtectedRoute><RewardsRedeemPage /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to={user ? "/today" : "/auth"} replace />} />
        </Routes>
      </main>
    </div>
  );
}
