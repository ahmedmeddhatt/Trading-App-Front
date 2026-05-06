/**
 * Allow-list of accounts that can see and use the AI Recommendations feature
 * (the dashboard strip, the /recommendations page, and the Picks quick-access
 * button on mobile). Other users get a cleaner UI without the AI module.
 *
 * Centralised here so the dashboard, the page, and any nav surface stay in
 * sync — change one place to add an account.
 */
import { useCurrentUser } from "./useCurrentUser";

const RECS_ALLOWED_EMAILS = new Set([
  "ahmedmedhat1231@gmail.com",
]);

export function isRecsAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return RECS_ALLOWED_EMAILS.has(email.toLowerCase().trim());
}

/**
 * Reactive hook — returns `{ allowed, ready }`.
 * `ready=false` while the auth query is in-flight so callers can show a
 * skeleton instead of flashing a "not allowed" screen on first paint.
 */
export function useCanSeeRecommendations(): { allowed: boolean; ready: boolean } {
  const { data, isLoading } = useCurrentUser();
  return {
    allowed: isRecsAllowedEmail(data?.email),
    ready: !isLoading,
  };
}
