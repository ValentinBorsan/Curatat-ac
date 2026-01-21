/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs"], // Spunem lui Tailwind unde să caute clasele (în toate fișierele EJS)
  theme: {
    extend: {
      colors: {
        // Paleta "Fresh Air" (Copiată din designul anterior)
        bgLight: '#f0f9ff',   // Sky-50
        brandBlue: '#0ea5e9', // Sky-500
        brandDark: '#0f172a', // Slate-900
        textGray: '#64748b',  // Slate-500
        accentOrange: '#f97316', // Orange-500
        accentHover: '#ea580c',  // Orange-600
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 3s infinite',
      }
    },
  },
  plugins: [],
}