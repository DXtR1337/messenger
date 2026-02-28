/** Centralized Polish error messages for all API routes */
export const API_ERRORS = {
  RATE_LIMIT: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.',
  BODY_TOO_LARGE: 'Zbyt duży request.',
  INVALID_JSON: 'Nieprawidłowy JSON.',
  VALIDATION_ERROR: 'Błąd walidacji danych.',
  AI_ANALYSIS_FAILED: 'Błąd analizy AI — spróbuj ponownie.',
  INSUFFICIENT_MESSAGES: 'Za mało wiadomości do analizy.',
  MISSING_FIELDS: 'Brak wymaganych pól w żądaniu.',
  DISCORD_RATE_LIMIT: 'Zbyt wiele rate limitów Discord API. Spróbuj ponownie później.',
  DISCORD_INVALID_TOKEN: 'Nieprawidłowy token bota. Sprawdź czy token jest poprawny.',
  DISCORD_NO_ACCESS: 'Bot nie ma dostępu do tego kanału.',
  DISCORD_CHANNEL_NOT_FOUND: 'Kanał nie znaleziony. Sprawdź ID kanału.',
  GEMINI_SAFETY_REFUSAL: 'Gemini odmówiło wygenerowania odpowiedzi (safety filter).',
} as const;
