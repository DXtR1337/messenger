/**
 * Shared SSE stream reader — eliminates ~300 lines of duplicated parsing logic across hooks.
 */
export type SSEEvent<T = Record<string, unknown>> = T & { type: string };

export async function readSSEStream<T = Record<string, unknown>>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: SSEEvent<T>) => void,
  signal?: AbortSignal,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          if (!data || data === '') continue;
          try {
            const event = JSON.parse(data) as SSEEvent<T>;
            onEvent(event);
          } catch {
            // Ignore malformed JSON (heartbeat comments, partial chunks)
          }
        }
      }
    }
  } finally {
    try { reader.cancel(); } catch { /* already closed */ }
  }
}
