import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { parse } from 'yaml';

/** data/ 配下の YAML をビルド時に JSON へ変換する（実行時に YAML パーサを持たない） */
function yamlPlugin(): Plugin {
  return {
    name: 'local-yaml',
    transform(code, id) {
      if (!/\.ya?ml$/.test(id)) return null;
      return { code: `export default ${JSON.stringify(parse(code))};`, map: null };
    },
  };
}

export default defineConfig({
  // GitHub Pages（https://<user>.github.io/try/）で配信する
  base: process.env.GITHUB_PAGES === 'true' ? '/try/' : '/',
  plugins: [react(), yamlPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
