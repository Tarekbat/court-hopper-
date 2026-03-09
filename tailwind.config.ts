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
        /* Setra brand palette */
        primary: {
          DEFAULT: '#C41E2A',
          dark: '#9B1620',
        },
        cream: {
          DEFAULT: '#F5F0EB',
          dark: '#E8E0D8',
        },
        charcoal: '#1A1A1A',
        'warm-gray': '#8A8279',
        /* Legacy names mapped to Setra for existing class names */
        beige: {
          DEFAULT: '#F5F0EB',
          light: '#FFFFFF',
          dark: '#E8E0D8',
          darker: '#E0D8D0',
        },
        terracotta: {
          DEFAULT: '#C41E2A',
          light: '#C41E2A',
          dark: '#9B1620',
        },
        accent: {
          green: '#4A7C2A',
          'green-light': '#5A8F3A',
          'green-dark': '#3A6A1A',
          tan: '#D4AF37',
          'tan-light': '#E5C048',
          'tan-dark': '#B8941F',
        },
        clay: {
          terracotta: '#C41E2A',
          'terracotta-light': '#C41E2A',
          'terracotta-dark': '#9B1620',
          rust: '#C41E2A',
          'rust-light': '#C41E2A',
          'rust-dark': '#9B1620',
        },
        tropical: {
          palm: '#4A7C2A',
          'palm-light': '#5A8F3A',
          'palm-dark': '#3A6A1A',
          sage: '#4A7C2A',
          'sage-light': '#5A8F3A',
          'sage-dark': '#3A6A1A',
        },
        ink: '#1A1A1A',
        stone: {
          DEFAULT: '#8A8279',
          light: '#8A8279',
          soft: '#E8E0D8',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.06), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'luxury': '0 20px 60px -12px rgba(0, 0, 0, 0.08), 0 8px 16px -4px rgba(0, 0, 0, 0.04)',
        'luxury-clay': '0 20px 60px -12px rgba(196, 30, 42, 0.12), 0 8px 16px -4px rgba(196, 30, 42, 0.08)',
        'glow': '0 0 30px rgba(196, 30, 42, 0.2)',
        'glow-clay': '0 0 30px rgba(196, 30, 42, 0.15)',
        'premium': '0 20px 60px -12px rgba(0, 0, 0, 0.08), 0 8px 16px -4px rgba(0, 0, 0, 0.04)',
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
        'luxury-gradient': 'linear-gradient(135deg, #F5F0EB 0%, #E8E0D8 50%, #F5F0EB 100%)',
        'clay-gradient': 'linear-gradient(135deg, #C41E2A 0%, #9B1620 50%, #C41E2A 100%)',
        'hero-gradient': 'linear-gradient(135deg, #F5F0EB 0%, #E8E0D8 50%, #F5F0EB 100%)',
        'tropical-gradient': 'linear-gradient(135deg, #F5F0EB 0%, #E8E0D8 30%, #F5F0EB 60%, #E8E0D8 90%, #F5F0EB 100%)',
        'palm-gradient': 'linear-gradient(180deg, #F5F0EB 0%, #E8E0D8 50%, #F5F0EB 100%)',
        'terracotta-gradient': 'linear-gradient(135deg, #C41E2A 0%, #9B1620 50%, #C41E2A 100%)',
        'clay-tropical': 'linear-gradient(135deg, #C41E2A 0%, #4A7C2A 50%, #C41E2A 100%)',
        'accent-gradient': 'linear-gradient(135deg, #C41E2A 0%, #9B1620 100%)',
      },
    },
  },
  plugins: [],
}
export default config



