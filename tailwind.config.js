/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './demo/index.html'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'], display: ['"Space Grotesk"', 'sans-serif'] },
      colors: {
        surface: { base: '#13161c', raised: '#1a1e26', border: 'rgba(255,255,255,0.07)' },
        brand: { blue: '#3b82f6', bluedeep: '#2563eb', green: '#22c55e' },
        tg: '#0088cc', max: '#6B4EFF', vk: '#0077FF',
      },
      animation: { float: 'float 6s ease-in-out infinite' },
      keyframes: { float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-14px)' } } },
    },
  },
  plugins: [],
};
