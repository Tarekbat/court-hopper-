import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d5ff',
          300: '#a4b8ff',
          400: '#8195ff',
          500: '#6374ff',
          600: '#4c52f5',
          700: '#3d3ee0',
          800: '#3234b4',
          900: '#2f3293',
          950: '#1e1f52',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        clay: {
          terracotta: '#C4621A',
          'terracotta-light': '#D2691E',
          'terracotta-dark': '#A0522D',
          rust: '#B87333',
          'rust-light': '#CD853F',
          'rust-dark': '#8B4513',
          orange: '#CC5500',
          'orange-light': '#FF6B35',
          'orange-dark': '#A04000',
          cream: '#FFF8DC',
          'cream-light': '#FFFEF5',
          'cream-dark': '#F5E6D3',
          sand: '#DEB887',
          'sand-light': '#F5DEB3',
          'sand-dark': '#D2B48C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'luxury': '0 20px 60px -12px rgba(196, 98, 26, 0.25), 0 8px 16px -4px rgba(139, 69, 19, 0.15)',
        'luxury-clay': '0 20px 60px -12px rgba(196, 98, 26, 0.35), 0 8px 16px -4px rgba(196, 98, 26, 0.25)',
        'glow': '0 0 30px rgba(196, 98, 26, 0.4)',
        'glow-clay': '0 0 30px rgba(204, 85, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backgroundImage: {
        'luxury-gradient': 'linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #8B4513 100%)',
        'clay-gradient': 'linear-gradient(135deg, #C4621A 0%, #D2691E 50%, #C4621A 100%)',
        'hero-gradient': 'linear-gradient(135deg, #8B4513 0%, #A0522D 25%, #C4621A 50%, #A0522D 75%, #8B4513 100%)',
        'terracotta-gradient': 'linear-gradient(135deg, #CC5500 0%, #D2691E 50%, #CC5500 100%)',
      },
    },
  },
  plugins: [],
}
export default config



