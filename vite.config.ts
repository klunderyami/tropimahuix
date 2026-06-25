import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga las variables de entorno del archivo .env al process.env para que estén disponibles en todo el archivo de configuración.
dotenv.config();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_BASE_URL || `http://127.0.0.1:${env.VITE_BACKEND_PORT || '3001'}`;
  
  // Carga todas las variables de entorno del sistema/archivo .env
  // y crea un objeto para la opción `define` de Vite.
  // Esto asegura que `import.meta.env.VITE_*` funcione en producción.
  const envVars = Object.entries(process.env).reduce((prev, [key, val]) => {
    if (key.startsWith('VITE_')) {
      prev[`import.meta.env.${key}`] = JSON.stringify(val);
    }
    return prev;
  }, {});

  return {
    plugins: [react(), tailwindcss()],
    // Inyección forzada de variables de entorno en el build para compatibilidad con Render.
    // Vite reemplazará estas claves con sus valores literales durante la compilación.
    define: envVars,
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
