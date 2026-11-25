import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createGeminiReader } from '../server/src/gemini-reader.mjs';

// The knowledge JSONs live in server/src/knowledge/ (the source of truth).
// Allow the dev server to read one level up so the client can import them
// directly; the production build inlines them into the bundle.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GEMINI_');
  const geminiReader = createGeminiReader({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
  });

  return {
    plugins: [react(), {
      name: 'living-tarot-gemini',
      configureServer(server) {
        server.middlewares.use(geminiReader);
      },
      configurePreviewServer(server) {
        server.middlewares.use(geminiReader);
      },
    }],
    server: {
      fs: { allow: ['..'] },
    },
  };
});
