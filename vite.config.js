import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Os componentes usam JSX em arquivos .js (herança do Create React App).
export default defineConfig({
  plugins: [react({ include: /\.(js|jsx)$/ })],
  esbuild: { loader: 'jsx', include: /src\/.*\.jsx?$/, exclude: [] },
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  // Mesma pasta de saída de antes: o Capacitor copia de build/ (capacitor.config.ts → webDir).
  build: { outDir: 'build', sourcemap: false, chunkSizeWarningLimit: 600 },
  server: { port: 3000, open: true },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.js'],
    setupFiles: ['src/test-setup.js']
  }
});
