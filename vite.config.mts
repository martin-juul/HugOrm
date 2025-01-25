import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'Hugorm',
      fileName: (format) => `index.${format}.js`,
      formats: ['es'], // Build for ESM only
    },
    rollupOptions: {
      // Ensure external dependencies are not bundled
      external: [], // Add any external dependencies here
      output: {
        globals: {
          // Define global variables for external dependencies (if any)
        },
      },
    },
    outDir: 'dist',
  },
  plugins: [
    dts({
      insertTypesEntry: true, // Generate types entry file
    }),
  ],
  resolve: {
    alias: {
      '@martinjuul/hugorm': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});