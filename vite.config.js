import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/code-wiki/',
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
  },
})
