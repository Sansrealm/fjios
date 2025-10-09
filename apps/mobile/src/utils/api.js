import { useAuthStore } from "./auth/store";

/**
 * Utility function for making authenticated API calls in mobile app
 * Automatically includes JWT token in Authorization header if user is authenticated
 */
export const fetchWithAuth = async (url, options = {}) => {
  const { auth } = useAuthStore.getState();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add JWT token if available
  if (auth?.jwt) {
    headers.Authorization = `Bearer ${auth.jwt}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
};

/**
 * React Query utility function for authenticated API calls
 */
export const createAuthenticatedQueryFn = (url, options = {}) => {
  return async () => {
    const response = await fetchWithAuth(url, options);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Network error" }));
      throw new Error(
        error.error || `Request failed with status ${response.status}`,
      );
    }

    return response.json();
  };
};

/**
 * React Query mutation function for authenticated API calls
 */
export const createAuthenticatedMutationFn = (url, method = "POST") => {
  return async (data) => {
    const response = await fetchWithAuth(url, {
      method,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Network error" }));
      throw new Error(
        error.error || `Request failed with status ${response.status}`,
      );
    }

    return response.json();
  };
};
