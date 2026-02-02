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
        beige: {
          DEFAULT: '#FAF9F6',
          light: '#FFFFFF',
          dark: '#F5F5F0',
          darker: '#EBEBE5',
        },
        terracotta: {
          DEFAULT: '#A0522D',
          light: '#C4621A',
          dark: '#8B4513',
        },
        accent: {
          green: '#4A7C2A',
          'green-light': '#5A8F3A',
          'green-dark': '#3A6A1A',
          tan: '#D4AF37',
          'tan-light': '#E5C048',
          'tan-dark': '#B8941F',
        },
        // Keep legacy colors for backward compatibility
        clay: {
          terracotta: '#A0522D',
          'terracotta-light': '#C4621A',
          'terracotta-dark': '#8B4513',
          rust: '#A0522D',
          'rust-light': '#C4621A',
          'rust-dark': '#8B4513',
        },
        tropical: {
          palm: '#4A7C2A',
          'palm-light': '#5A8F3A',
          'palm-dark': '#3A6A1A',
          sage: '#4A7C2A',
          'sage-light': '#5A8F3A',
          'sage-dark': '#3A6A1A',
        },
        ink: '#1A1716',
        stone: {
          DEFAULT: '#57534E',
          light: '#A8A29E',
          soft: '#E7E5E4',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.08), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'luxury': '0 20px 60px -12px rgba(0, 0, 0, 0.1), 0 8px 16px -4px rgba(0, 0, 0, 0.05)',
        'luxury-clay': '0 20px 60px -12px rgba(160, 82, 45, 0.15), 0 8px 16px -4px rgba(160, 82, 45, 0.1)',
        'glow': '0 0 30px rgba(160, 82, 45, 0.2)',
        'glow-clay': '0 0 30px rgba(160, 82, 45, 0.15)',
        'premium': '0 20px 60px -12px rgba(0, 0, 0, 0.12), 0 8px 16px -4px rgba(0, 0, 0, 0.06)',
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
        'luxury-gradient': 'linear-gradient(135deg, #FAF9F6 0%, #F5F5F0 50%, #FAF9F6 100%)',
        'clay-gradient': 'linear-gradient(135deg, #A0522D 0%, #C4621A 50%, #A0522D 100%)',
        'hero-gradient': 'linear-gradient(135deg, #FAF9F6 0%, #F5F5F0 50%, #FAF9F6 100%)',
        'tropical-gradient': 'linear-gradient(135deg, #FAF9F6 0%, #F5F5F0 30%, #FAF9F6 60%, #F5F5F0 90%, #FAF9F6 100%)',
        'palm-gradient': 'linear-gradient(180deg, #FAF9F6 0%, #F5F5F0 50%, #FAF9F6 100%)',
        'terracotta-gradient': 'linear-gradient(135deg, #A0522D 0%, #C4621A 50%, #A0522D 100%)',
        'clay-tropical': 'linear-gradient(135deg, #A0522D 0%, #4A7C2A 50%, #A0522D 100%)',
        'accent-gradient': 'linear-gradient(135deg, #A0522D 0%, #C4621A 100%)',
      },
    },
  },
  plugins: [],
}
export default config



