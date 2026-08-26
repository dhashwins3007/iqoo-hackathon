/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#06080B',
          900: '#0A0E13',
          850: '#0E131A',
          800: '#11161F',
          700: '#161D28',
          600: '#1C2430',
          500: '#273140',
          400: '#3A4456',
        },
        accent: {
          DEFAULT: '#00E5C7',
          glow: '#1FF0D6',
          dim: '#0A8A78',
        },
        ok: {
          DEFAULT: '#2BE58A',
          dim: '#128A55',
        },
        bad: {
          DEFAULT: '#FF4D5E',
          dim: '#B22E3C',
        },
        warn: {
          DEFAULT: '#FFB627',
          dim: '#A9770E',
        },
        neutralx: {
          DEFAULT: '#5B6776',
          dim: '#3A4452',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'inner-line': 'inset 0 0 0 1px rgba(255,255,255,0.04)',
        glow: '0 0 24px -2px rgba(0,229,199,0.35)',
        badglow: '0 0 32px -4px rgba(255,77,94,0.45)',
        okglow: '0 0 24px -4px rgba(43,229,138,0.4)',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        pulseRing: {
          '0%,100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        flicker: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.78' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        scan: 'scan 2.8s ease-in-out infinite',
        pulseRing: 'pulseRing 1.6s ease-in-out infinite',
        flicker: 'flicker 2.4s ease-in-out infinite',
        riseIn: 'riseIn 0.4s ease-out both',
        slideUp: 'slideUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
};
