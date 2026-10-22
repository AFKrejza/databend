import { defineConfig } from 'tsup';

// Bundles the CLI to dist-cli/cli.js (the `databend` bin). Dependencies stay external.
// Separate from dist/ (vite's web build) because `clean` would wipe it.
export default defineConfig({
  entry: { cli: 'src/cli/main.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist-cli',
  clean: true,
});
