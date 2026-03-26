import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Centralizes JWT token management and auth redirect logic.
 * All pages should use this hook instead of calling localStorage directly.
 */
export function useAuth() {
  const router = useRouter();

  /** Returns the stored JWT token, or null if not present. */
  const getToken = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  /**
   * Returns an Authorization header object for API calls, or null if the
   * user is not authenticated. Does NOT redirect automatically.
   */
  const getAuthHeaders = useCallback(():
    | { Authorization: string }
    | null => {
    const token = getToken();
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  /**
   * Returns the Authorization header if authenticated, otherwise redirects
   * to the sign-in page and returns null.
   */
  const requireAuth = useCallback(():
    | { Authorization: string }
    | null => {
    const headers = getAuthHeaders();
    if (!headers) {
      router.push("/");
      return null;
    }
    return headers;
  }, [getAuthHeaders, router]);

  /** Clears the token and redirects to the sign-in page. */
  const signOut = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userProfile");
    router.replace("/?mode=signin");
  }, [router]);

  return { getToken, getAuthHeaders, requireAuth, signOut };
}
