/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warehouse: {
          dark: '#0b0f19',
          card: '#131b2e',
          border: '#1f2d47',
          accent: '#3b82f6',
          amber: '#f59e0b',
          emerald: '#10b981',
          rose: '#f43f5e'
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite',
        'scan': 'scanLine 2s linear infinite'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)' },
          '50%': { opacity: '0.6', boxShadow: '0 0 5px rgba(59, 130, 246, 0.2)' }
        },
        scanLine: {
          '0%': { top: '0%' },
          '50%': { top: '90%' },
          '100%': { top: '0%' }
        }
      }
    },
  },
  plugins: [],
}
