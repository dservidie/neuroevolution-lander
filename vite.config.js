import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  server: {
    port: 43180,
    host: '127.0.0.1',
    strictPort: true,
  },
  preview: {
    port: 43180,
    host: '127.0.0.1',
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        designer: resolve(root, 'designer.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 20000,
  },
})
