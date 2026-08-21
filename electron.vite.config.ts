import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const appVersion = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version

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
    define: { appVersion: JSON.stringify(appVersion) },
    plugins: [react()],
    resolve: { alias: [{ find: '#src', replacement: resolve('src') }] },
  },
})
