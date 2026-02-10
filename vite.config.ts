import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const [, rest] = id.split('node_modules/');
          if (!rest) return 'vendor';
          const parts = rest.split('/');
          const pkg = parts[0]?.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];

          if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') return 'react';
          if (pkg === 'react-router' || pkg === 'react-router-dom') return 'router';
          if (pkg === 'recharts') return 'charts';
          if (pkg === 'framer-motion') return 'motion';
          if (pkg === 'i18next' || pkg === 'react-i18next') return 'i18n';
          if (pkg === 'lucide-react') return 'icons';
          if (pkg === 'zustand') return 'state';
          return 'vendor';
        },
      },
    },
  },
})
