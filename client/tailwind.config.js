/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Charte du cahier des charges (annexe B), déclinée en encres d'imprimerie fiduciaire
        marine: { DEFAULT: '#0A4DA2', fonce: '#073574', nuit: '#0B1F3A', clair: '#E8EEF8', filet: '#C9D6EA' },
        ciel: '#4FA9DE', // bande claire du logo, relais de l'encrage iris
        citron: { DEFAULT: '#C5E91B', pale: '#F1F9CC', encre: '#3F4B05' },
        soleil: { DEFAULT: '#FFC93C', pale: '#FFF3D1', encre: '#5C4300' },
        refus: { DEFAULT: '#B42318', pale: '#FDECEA' },
        encre: { DEFAULT: '#14223A', douce: '#4A5873', pale: '#6B7891' },
        papier: '#FBFCFE',
        bureau: '#EDF1F7', // le plateau sur lequel les titres sont posés
      },
      fontFamily: {
        sans: ['"Archivo Variable"', 'system-ui', 'sans-serif'],
        mono: ['"Azeret Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        titre: '0 1px 2px rgba(11,31,58,0.08), 0 18px 40px -24px rgba(11,31,58,0.45)',
      },
      keyframes: {
        trace: { from: { strokeDashoffset: '1' }, to: { strokeDashoffset: '0' } },
        sceau: {
          '0%': { transform: 'scale(1.6) rotate(-18deg)', opacity: '0', filter: 'blur(3px)' },
          '70%': { transform: 'scale(0.96) rotate(-7deg)', opacity: '1', filter: 'blur(0)' },
          '100%': { transform: 'scale(1) rotate(-8deg)', opacity: '1' },
        },
        impression: {
          from: { opacity: '0', transform: 'translateY(6px)', filter: 'blur(4px)' },
          to: { opacity: '1', transform: 'none', filter: 'blur(0)' },
        },
      },
      animation: {
        sceau: 'sceau 520ms cubic-bezier(0.16, 1, 0.3, 1) both',
        impression: 'impression 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
