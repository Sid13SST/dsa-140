import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  /*
   * The app has real routes now, so './' no longer works — a relative base
   * breaks deep links like /plans. But GitHub Pages serves from a sub-path
   * (/dsa-140/) while Vercel serves from the root, and a hard-coded '/' gives
   * Pages a blank page 404ing on its own assets.
   *
   * So the base comes from the environment: the Pages workflow sets
   * VITE_BASE_PATH=/dsa-140/, and everything else defaults to the root.
   */
  base: process.env.VITE_BASE_PATH || '/',
})
