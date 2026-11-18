/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: '#17191B',
        secondary: 'rgba(23, 25, 27, 0.72)',
        muted: 'rgba(23, 25, 27, 0.50)',
        charcoal: '#2B2E31',
        slate: '#4A5159',
        nearblack: '#17191B',
        // Accents
        lime: {
          DEFAULT: '#BBD85A',
          hover: '#a8c74e',
          tint: 'rgba(187, 216, 90, 0.25)',
        },
        coral: {
          DEFAULT: '#EE8D72',
          tint: 'rgba(238, 141, 114, 0.20)',
        },
        amber: {
          DEFAULT: '#F5A524',
          tint: 'rgba(245, 165, 36, 0.20)',
        },
        // Tint colors (for stage and department cards)
        tint: {
          sky: '#8DB3DE',
          lime: '#BBD85A',
          coral: '#EE8D72',
          sage: '#A5B87E',
          peach: '#E9B494',
          charcoal: '#2B2E31',
          slate: '#4A5159',
        },
        // Surfaces
        paper: '#F2F3EF',
        panel: '#F2F3EF',
        'inner-surface': 'rgba(255, 255, 255, 0.72)',
        'inner-surface-hover': 'rgba(255, 255, 255, 0.95)',
      },
      borderRadius: {
        '32px': '32px',
        '28px': '28px',
        '24px': '24px',
        '20px': '20px',
        '18px': '18px',
        '16px': '16px',
        'full': '9999px',
      },
      boxShadow: {
        'glass': 'inset 0 1px 0 rgba(255,255,255,0.90), 0 20px 40px -22px rgba(20,25,30,0.28)',
        'glass-hover': 'inset 0 1px 0 rgba(255,255,255,0.90), 0 24px 48px -20px rgba(20,25,30,0.32)',
        'dark-card': '0 20px 40px -20px rgba(18, 18, 18, 0.35)',
      },
      fontFamily: {
        sans: ['"Host Grotesk"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        handwriting: ['"Caveat"', '"Patrick Hand"', 'cursive'],
      },
      letterSpacing: {
        tighter: '-0.03em',
        tight: '-0.02em',
      },
    },
  },
  plugins: [],
}
