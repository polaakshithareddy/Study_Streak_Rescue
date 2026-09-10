import React from 'react';

export default function Card({ children, className = '', title, subtitle, headerAction }) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-5 ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
