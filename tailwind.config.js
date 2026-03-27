/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
          './app/**/*.{js,ts,jsx,tsx,mdx}',
        ],
    theme: {
          extend: {
                  colors: {
                            'dark': '#0a0a0a',
                            'gold': '#D4A843',
                            'gold-light': '#E5B856',
                            'gold-dark': '#B89031',
                  },
                  fontFamily: {
                            sans: ['Inter', 'sans-serif'],
                  },
          },
    },
    plugins: [],
};
