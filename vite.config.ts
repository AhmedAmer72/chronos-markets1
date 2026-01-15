import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@lib': path.resolve(__dirname, './src/lib'),
          '@hooks': path.resolve(__dirname, './src/hooks'),
          '@components': path.resolve(__dirname, './components'),
        },
      },
      server: {
        port: 5173,
        host: '0.0.0.0',
        headers: {
          // Required for SharedArrayBuffer and WASM workers (Linera client)
          'Cross-Origin-Embedder-Policy': 'credentialless',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      },
      preview: {
        headers: {
          'Cross-Origin-Embedder-Policy': 'credentialless',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      // Optimize deps for Linera client
      optimizeDeps: {
        exclude: ['@linera/client'],
        esbuildOptions: {
          target: 'esnext',
        },
      },
      esbuild: {
        supported: {
          'top-level-await': true,
        },
      },
      build: {
        target: 'esnext',
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
        },
        // Don't externalize @linera/client, let it be bundled
        commonjsOptions: {
          transformMixedEsModules: true,
        },
      },
      // Handle @linera/client as an ES module
      ssr: {
        noExternal: ['@linera/client'],
      },
    };
});
