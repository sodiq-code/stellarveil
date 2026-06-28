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
        veil: {
          bg: '#0a0a0f',
          card: '#111118',
          border: '#1e1e2e',
          primary: '#7c3aed',   // violet-600
          accent: '#06b6d4',    // cyan-500
          success: '#10b981',   // emerald-500
          warning: '#f59e0b',   // amber-500
          danger: '#ef4444',    // red-500
          text: '#e2e8f0',
          muted: '#64748b',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
