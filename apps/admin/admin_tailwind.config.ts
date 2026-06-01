import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        plush: {
          50:  '#fdf4ff', 100: '#fae8ff', 200: '#f3d0fe', 300: '#e9a8fd',
          400: '#d870fb', 500: '#c44df3', 600: '#a92cd8', 700: '#8d1eb5',
          800: '#751c93', 900: '#611a78', 950: '#3f0553',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      backgroundImage: {
        'plush-gradient': 'linear-gradient(135deg, #611a78 0%, #c44df3 50%, #f43f5e 100%)',
      },
    },
  },
  plugins: [],
}
export default config
