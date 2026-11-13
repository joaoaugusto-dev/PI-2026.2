import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// ponytail: um único HTML com tudo embutido (fontes, imagens, JS). Abre offline
// com dois cliques e é o mesmo arquivo publicado como Artifact.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { assetsInlineLimit: 100_000_000 },
})
