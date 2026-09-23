import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      tailwindcss(),
      react({
        fastRefresh: false, // ✅ disable eval-based refresh
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false, // ✅ fully disable HMR (no eval)
      proxy: {
        // Proxy API requests to the backend server during development
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      sourcemap: false, // ✅ no eval in source maps
      minify: 'esbuild',
      target: 'esnext',
    },
    esbuild: {
      legalComments: 'none',
    },
  };
});
