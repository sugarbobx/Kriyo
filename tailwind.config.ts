import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        kriyo: {
          bg: '#0a0d12',
          elevated: '#0d1117',
          surface: '#131922',
          surfaceHover: '#171f2b',
          border: '#232b38',
          borderSoft: '#1a212c',
          text: '#e7ecf3',
          dim: '#93a0b2',
          faint: '#5a6577',
          amber: '#e8a33d',
          cyan: '#4fd1c5',
          coral: '#ff6f61',
          steel: '#7c93a8',
          danger: '#e5484d',
          success: '#34d399'
        }
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(79, 209, 197, 0.12), 0 12px 40px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
};

export default config;
