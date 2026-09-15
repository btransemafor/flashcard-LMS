/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3157E5',
          hover: '#2748C8',
          subtle: '#E9EEFF'
        },
        bg: {
          warm: '#FAF9F6'
        },
        surface: {
          DEFAULT: '#FFFDFC',
          secondary: '#F5F4F0'
        },
        ink: {
          DEFAULT: '#172033',
          secondary: '#5E687A',
          muted: '#8B93A2'
        },
        border: {
          DEFAULT: '#E4E6EA',
          strong: '#D6D9E0'
        },
        accent: {
          DEFAULT: '#8A91E8',
          subtle: '#F0F1FF'
        },
        success: {
          DEFAULT: '#31866F',
          subtle: '#EAF6F1'
        },
        warning: {
          DEFAULT: '#B7791F',
          subtle: '#FFF5DD'
        },
        error: {
          DEFAULT: '#C94A55',
          subtle: '#FDEDEF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
      },
      borderRadius: {
        md: '12px',
        lg: '14px',
        xl: '18px'
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(23, 32, 51, 0.04), 0 1px 1px rgba(23, 32, 51, 0.03)',
        card: '0 2px 6px rgba(23, 32, 51, 0.05)',
        popover: '0 8px 24px rgba(23, 32, 51, 0.09)'
      },
      transitionDuration: {
        DEFAULT: '180ms'
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' }
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out'
      }
    }
  },
  plugins: []
};
