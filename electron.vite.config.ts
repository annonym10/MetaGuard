import { defineConfig } from 'electron-vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/main/main.ts')
        },
        output: {
          format: 'cjs',
          entryFileNames: 'main.js',
        }
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'src/main/preload.ts')
        },
        output: {
          format: 'cjs',
          entryFileNames: 'preload.js',
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
});
