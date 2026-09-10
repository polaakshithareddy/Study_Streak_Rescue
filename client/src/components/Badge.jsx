import React from 'react';

export default function Badge({ children, variant = 'neutral', className = '' }) {
  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-blue-50 text-accent border-blue-200',
    success: 'bg-green-50 text-success border-green-200',
    danger: 'bg-red-50 text-danger border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant] || variants.neutral} ${className}`}>
      {children}
    </span>
  );
}
