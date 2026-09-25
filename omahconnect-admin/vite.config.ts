import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(
    mode,
    process.cwd(),
    ''
  )

  if (
    mode === 'production' &&
    !env.VITE_API_URL?.trim()
  ) {
    throw new Error(
      'VITE_API_URL is required for production builds.'
    )
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    build: {
      sourcemap: false,
    },
  }
})
