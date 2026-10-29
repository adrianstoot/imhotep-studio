import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/imhotep-studio/',
  plugins: [react()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-three': [
            'three',
            'three/examples/jsm/controls/OrbitControls.js',
            'three/examples/jsm/controls/TransformControls.js',
            'three/examples/jsm/geometries/RoundedBoxGeometry.js',
          ],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
