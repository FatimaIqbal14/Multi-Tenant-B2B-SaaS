import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In Docker the API lives at http://server:4000; locally it's http://localhost:4000.
const target = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,                       // lets acme.localhost:5173 style subdomains work
    proxy: { '/api': { target, changeOrigin: false } },
    watch: process.env.VITE_USE_POLLING ? { usePolling: true } : undefined, // needed on Docker + Windows
  },
});
