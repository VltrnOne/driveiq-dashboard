import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        carbon: '#0D0D0D',
        graphite: '#2D2D2D',
        slate: '#4A4A4A',
        diamond: '#FAFAFA',
        blue: { DEFAULT: '#0066FF', 600: '#0055DD' },
        success: '#00C853',
        warning: '#FFB300',
        danger: '#FF3D00',
        espresso: '#2C1810',
        latte: '#C4A882',
        cream: '#FFF8F0',
      },
      fontFamily: { mono: ['var(--font-mono)', 'monospace'] },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
