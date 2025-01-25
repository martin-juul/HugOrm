import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'Hugorm',
      fileName: (format) => `index.${format}.js`,
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'idb',
      ],
      output: {
        globals: {
          // Define global variables for external dependencies (if any)
        },
      },
    },
    outDir: 'dist',
    sourcemap: true,
    minify: true,
  },
  plugins: [
    dts({
      rollupTypes: true,
    }),
  ],
  resolve: {
    alias: {
      '@martinjuul/hugorm': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
