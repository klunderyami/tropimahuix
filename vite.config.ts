import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga las variables de entorno del sistema (producción) o del archivo .env (desarrollo)
dotenv.config();

export default defineConfig(({ mode }) => {
  // Carga las variables de entorno del archivo .env (en desarrollo) o del entorno del sistema (en producción).
  // Vite expondrá automáticamente las variables con prefijo 'VITE_' a `import.meta.env`.
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_BASE_URL || `http://127.0.0.1:${env.VITE_BACKEND_PORT || '3001'}`;

  // Transforma las variables cargadas en un formato que el bloque `define` de Vite pueda usar.
  // Esto reemplazará `import.meta.env.VITE_*` con su valor real durante la compilación.
  const envForDefine = Object.keys(env).reduce((acc: Record<string, string>, key) => {
    if (key.startsWith('VITE_')) {
      acc[`import.meta.env.${key}`] = JSON.stringify(env[key]);
    }
    return acc;
  }, {});

  return {
    plugins: [react(), tailwindcss()],
    define: envForDefine,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      cssCodeSplit: true,
      minify: 'esbuild',
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) {
                return 'firebase';
              }
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router-dom') ||
                id.includes('framer-motion')
              ) {
                return 'vendor-ui';
              }
              return 'vendor';
            }
          },
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      esbuild: {
        drop: ['console', 'debugger'],
      },
    },
  };
});
