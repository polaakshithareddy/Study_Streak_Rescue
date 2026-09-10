import React from 'react';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-accent rounded-full animate-spin mb-3"></div>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
