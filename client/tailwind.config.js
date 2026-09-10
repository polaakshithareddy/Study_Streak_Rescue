/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#2563EB', // Royal Blue
          hover: '#1D4ED8',
          light: '#EFF6FF'
        },
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A'
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#F0FDF4',
          border: '#BBF7D0'
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEF2F2',
          border: '#FECACA'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      borderRadius: {
        'lg': '8px'
      }
    },
  },
  plugins: [],
}
