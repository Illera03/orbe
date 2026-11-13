import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/orbe/',
  plugins: [react()],
  build: {
    // Multipágina sin rutas de cliente: en GitHub Pages una ruta de cliente da 404 al recargar.
    // Rutas relativas a web/, donde npm ejecuta siempre los scripts.
    rolldownOptions: {
      input: {
        main: 'index.html',
        deckgl: 'poc/deckgl.html',
        pmtiles: 'poc/pmtiles.html',
      },
    },
  },
})
