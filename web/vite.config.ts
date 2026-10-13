import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
// `vitest/config` reexporta o `defineConfig` do Vite com o campo `test`
// tipado — não muda o build, só destrava rodar `vitest` com este mesmo
// config (mesmo alias `@`, sem duplicar arquivo).
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // 'node' serve pros testes de hoje (lógica pura, sem componente). O
    // primeiro teste de componente (.test.tsx) vai precisar trocar pra
    // 'jsdom' (+ testing-library) — o glob já aceita .tsx pra não esquecer
    // de ampliar os dois juntos.
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
