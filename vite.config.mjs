import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));

export function safeJSON(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export default defineConfig({
  root: path.join(root, 'frontend'),
  envDir: root,
  plugins: [react(), {
    name: 'portfolio-bootstrap',
    async transformIndexHtml(html) {
      let bootstrap = '';
      try {
        const data = JSON.parse(await readFile(path.join(root,'frontend/public/content/portfolio.json'),'utf8'));
        bootstrap = `<script id="portfolio-bootstrap">window.__PORTFOLIO__=${safeJSON(data)};</script>`;
      } catch { /* A first dev boot can render the loading state until the CMS responds. */ }
      return html.replace('<!--portfolio-data-->', bootstrap);
    }
  }],
  build: {outDir:path.join(root,'dist'),emptyOutDir:true, sourcemap:false},
  server: {host:'127.0.0.1',port:5173,strictPort:true}
});
