import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // تحسين الأداء - Performance optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // حذف console.log في الإنتاج
        drop_debugger: true,
      },
    },
    // تقسيم الكود لتحسين LCP
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'xlsx': ['xlsx'],
        },
      },
    },
    // تحسين حجم الملفات
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
  },
  // تحسين الأداء العام
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'xlsx'],
  },
});
