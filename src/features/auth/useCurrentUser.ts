import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export interface CurrentUser {
  id: string;
  email: string;
  name?: string;
}

export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.get<CurrentUser>("/api/auth/me"),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

/** True when the current user's email is in NEXT_PUBLIC_ADMIN_EMAILS (comma-separated). */
export function useIsAdmin(): boolean {
  const { data } = useCurrentUser();
  if (!data?.email) return false;
  const list = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
  return list.includes(data.email.toLowerCase().trim());
}
