import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // React y sus dependencias primero (incluyendo react-three)
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('@react-three') || id.includes('scheduler')) {
                return 'react-vendor';
              }
              // Three.js puro (sin react-three)
              if (id.includes('three') && !id.includes('@react-three')) {
                return 'three-engine';
              }
              if (id.includes('fabric')) {
                return 'fabric-engine';
              }
              if (id.includes('@radix-ui') || id.includes('lucide')) {
                return 'ui-libs';
              }
              return 'vendor-utils';
            }
          },
        },
      },
    },
  }
})
