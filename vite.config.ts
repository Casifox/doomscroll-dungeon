import { defineConfig } from 'vite';

// Base relative : le build fonctionne aussi bien à la racine
// d'un domaine que dans un sous-dossier GitHub Pages.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
  },
});
