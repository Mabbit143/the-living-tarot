import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The knowledge JSONs live in server/src/knowledge/ (the source of truth).
// Allow the dev server to read one level up so the client can import them
// directly; the production build inlines them into the bundle.
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
