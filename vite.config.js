import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/card-images': {
        target: 'https://images.ygoprodeck.com/images/cards',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/card-images/, ''),
      },
    },
  },
})
