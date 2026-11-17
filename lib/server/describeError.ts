/**
 * Turns Supabase/Postgrest error objects (plain objects, not Error instances) into one readable line,
 * so console.error output and the Sentry issues it creates show the real cause instead of [object Object].
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const { message, code, details, hint } = error as Record<string, unknown>;
    const parts = [message, code && `code ${code}`, details, hint].filter((part): part is string => typeof part === "string" && part.length > 0);
    if (parts.length > 0) return parts.join(" | ");
    try {
      return JSON.stringify(error);
    } catch {
      return "Unserializable error object";
    }
  }
  return String(error);
}
