import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg transition-subtle focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover focus:ring-accent',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400 border border-slate-200',
    outline: 'bg-transparent text-slate-700 hover:bg-slate-100 border border-slate-300 focus:ring-slate-400',
    danger: 'bg-danger text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-success text-white hover:bg-green-700 focus:ring-green-500'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base font-semibold'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyle} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
