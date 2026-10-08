import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Tests sur téléphone via un tunnel HTTPS Cloudflare (adresse en *.trycloudflare.com)
    allowedHosts: ['.trycloudflare.com'],
    proxy: { '/api': 'http://localhost:4000' },
  },
});
