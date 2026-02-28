import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/lib/__tests__/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/**/*.test.ts',
        'src/lib/**/__tests__/**',
        'src/lib/export/pdf-fonts.ts',
        'src/lib/export/pdf-images.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        // Parsers are deterministic pure functions — hold them to a higher standard
        'src/lib/parsers/**': {
          lines: 85,
          functions: 90,
        },
        // JSON parsing utilities are fully testable pure functions
        'src/lib/analysis/json-parser.ts': {
          lines: 95,
          functions: 95,
        },
        // Analysis modules — core business logic
        'src/lib/analysis/**': {
          lines: 70,
          functions: 70,
        },
        // Validation schemas — security boundary
        'src/lib/validation/**': {
          lines: 80,
          functions: 80,
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
