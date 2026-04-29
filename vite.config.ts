import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHubリポジトリ名に合わせてbaseを変更してください
// 例: リポジトリ名が "investment-dashboard" の場合 → '/investment-dashboard/'
export default defineConfig({
  plugins: [react()],
  base: '/investment-dashboard/',
})
