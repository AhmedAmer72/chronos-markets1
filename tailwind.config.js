/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-bg': '#0D1117',
        'brand-surface': '#161B22',
        'brand-surface-2': '#21262D',
        'brand-border': '#30363D',
        'brand-primary': '#238636',
        'brand-primary-hover': '#2EA043',
        'brand-secondary': '#8B949E',
        'brand-text': '#C9D1D9',
        'brand-success': '#238636',
        'brand-danger': '#DA3633',
        'brand-yes': '#238636',
        'brand-no': '#DA3633',
        'brand-yes-bg': 'rgba(35, 134, 54, 0.15)',
        'brand-no-bg': 'rgba(218, 54, 51, 0.15)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 10px -5px rgba(35, 134, 54, 0.4)' },
          '50%': { boxShadow: '0 0 15px 0px rgba(35, 134, 54, 0.7)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        backgroundPan: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'grid-pan': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100px 100px' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out forwards',
        glow: 'glow 2.5s ease-in-out infinite',
        marquee: 'marquee 60s linear infinite',
        'background-pan': 'backgroundPan 15s ease infinite',
        float: 'float 6s ease-in-out infinite',
        'grid-pan': 'grid-pan 10s linear infinite',
      },
      boxShadow: {
        'glow-primary': '0 0 15px -3px rgba(35, 134, 54, 0.6)',
      }
    },
  },
  plugins: [],
}
