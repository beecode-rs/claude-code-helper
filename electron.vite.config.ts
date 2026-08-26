import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import { resolve } from 'node:path'

export default defineConfig({
  main: {
    build: { externalizeDeps: true },
    resolve: { alias: [{ find: '#src', replacement: resolve('src') }] },
  },
  preload: {
    build: { externalizeDeps: true },
    resolve: { alias: [{ find: '#src', replacement: resolve('src') }] },
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: [
        { find: '#resource', replacement: resolve('resource') },
        { find: '#src', replacement: resolve('src') },
      ],
    },
  },
})
