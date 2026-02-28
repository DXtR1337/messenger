import { beforeAll, afterAll, vi } from 'vitest';

beforeAll(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});
