import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'media', // <--- Mude de 'media' (implícito) para 'class'
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config