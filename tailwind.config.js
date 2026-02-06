/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Morandi Zen Color Palette - Low saturation, calming tones
        zen: {
          50: '#f7f6f4',   // Lightest warm gray
          100: '#eeece7',  // Very light beige
          200: '#dbd7cf',  // Light stone
          300: '#c4beb2',  // Soft taupe
          400: '#a89d8e',  // Muted sand
          500: '#8d7f6d',  // Medium earth
          600: '#736757',  // Darker earth
          700: '#5c5145',  // Deep brown-gray
          800: '#4a4139',  // Very dark taupe
          900: '#3a352f',  // Almost black brown
        },
        sage: {
          50: '#f5f6f4',   // Whisper green
          100: '#e7ebe7',  // Pale sage
          200: '#d0d9d0',  // Light sage
          300: '#b4c2b4',  // Soft green-gray
          400: '#95a795',  // Muted sage
          500: '#798c79',  // Medium sage
          600: '#627361',  // Deep sage
          700: '#4f5d4f',  // Forest mute
          800: '#3f4a3f',  // Dark green-gray
          900: '#323a32',  // Deep forest
        },
        dust: {
          50: '#f7f5f4',   // Dusty white
          100: '#efe9e6',  // Pale dust
          200: '#ddd3cd',  // Light mauve-gray
          300: '#c7b9b1',  // Soft rose-gray
          400: '#ad9a8f',  // Muted rose-taupe
          500: '#927e73',  // Medium dust-rose
          600: '#79685e',  // Deep rose-brown
          700: '#62544c',  // Dark rose-earth
          800: '#4e433c',  // Very dark taupe
          900: '#3e3530',  // Almost black
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
