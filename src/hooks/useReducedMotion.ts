'use client';

/** Always returns false — animations should always play regardless of OS preference. */
export function useReducedMotion(): boolean {
  return false;
}
