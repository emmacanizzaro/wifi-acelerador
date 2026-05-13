/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./frontend/index.html', './frontend/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#070b12',
        panel: '#0f1724',
        panelSoft: '#121f31',
        accent: '#00e5b0',
        accentBlue: '#00c2ff',
        danger: '#ff4d6d',
        warning: '#ffb347',
      },
      boxShadow: {
        glow: '0 0 40px rgba(0, 229, 176, 0.18)',
        blueGlow: '0 0 35px rgba(0, 194, 255, 0.2)',
      },
      backdropBlur: {
        xl: '24px',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.85' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 2.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
