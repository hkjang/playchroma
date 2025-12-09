import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,
        open: true,
        proxy: {
            // ChromaDB API 프록시 (CORS 우회)
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                secure: false
            }
        }
    },
    build: {
        target: 'esnext',
        outDir: 'dist'
    }
});
