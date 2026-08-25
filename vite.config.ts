import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Absolute base: the app now has real routes, and './' breaks deep links.
  base: '/',
})
