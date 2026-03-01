/**
 * Shared PIN verification for all Discord API endpoints.
 * DISCORD_ACCESS_PIN env var MUST be set — if missing, endpoint returns 503.
 * If PIN doesn't match, returns 401.
 * Returns null when verification passes.
 */
export function verifyDiscordPin(pin: string | undefined | null): Response | null {
  const requiredPin = process.env.DISCORD_ACCESS_PIN;

  if (!requiredPin) {
    return Response.json(
      { error: 'Endpoint nie jest skonfigurowany (brak DISCORD_ACCESS_PIN).' },
      { status: 503 },
    );
  }

  if (!pin || pin !== requiredPin) {
    return Response.json(
      { error: 'Nieprawidłowy PIN dostępu.' },
      { status: 401 },
    );
  }

  return null;
}
