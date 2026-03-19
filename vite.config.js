import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  server: {
    host: true,
    proxy: {
      '/users': 'http://127.0.0.1:8000',
      '/projects': 'http://127.0.0.1:8000',
      '/messages': 'http://127.0.0.1:8000',
      '/ai': 'http://127.0.0.1:8000'
    }
  }
})
