import { useAuthStore } from "./auth/store";

/**
 * Get the API base URL from environment variables
 * Returns the first available base URL (proxy first, then app base)
 * Falls back to a default URL if none is configured (prevents crash)
 */
export const getApiBaseUrl = () => {
  const proxyBase = process.env.EXPO_PUBLIC_PROXY_BASE_URL || "";
  const appBase = process.env.EXPO_PUBLIC_BASE_URL || "";
  const bases = [proxyBase, appBase].filter(Boolean);

  if (bases.length === 0) {
    // In production, log error but don't crash - return a safe fallback
    const errorMsg = "Server URL not configured. Please set EXPO_PUBLIC_PROXY_BASE_URL or EXPO_PUBLIC_BASE_URL environment variable.";
    console.error("❌", errorMsg);
    
    // Return null instead of throwing to prevent crashes
    // Callers should check for null and handle gracefully
    return null;
  }

  const base = bases[0].endsWith("/") ? bases[0].slice(0, -1) : bases[0];
  return base;
};

/**
 * Build a full API URL from an endpoint
 * @param {string} endpoint - API endpoint (e.g., "/api/auth/signup")
 * @returns {string} Full URL with base URL prepended
 */
export const buildApiUrl = (endpoint) => {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      "Cannot build API URL: Server URL not configured. Please set EXPO_PUBLIC_PROXY_BASE_URL or EXPO_PUBLIC_BASE_URL environment variable."
    );
  }
  return `${base}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
};

/**
 * Utility function for making authenticated API calls in mobile app
 * Automatically includes JWT token in Authorization header if user is authenticated
 */
export const fetchWithAuth = async (url, options = {}) => {
  const { auth, setAuth } = useAuthStore.getState();

  const hasBody = typeof options.body !== "undefined" && options.body !== null;

  const buildHeaders = (jwt) => ({
    // Only set Content-Type when we actually send a body; avoids unnecessary preflights
    ...(hasBody && { "Content-Type": "application/json" }),
    Accept: "application/json",
    ...options.headers,
    // Include Authorization header if JWT is available
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  });

  // Build full URL with preferred base (proxy first, then app base)
  const proxyBase = process.env.EXPO_PUBLIC_PROXY_BASE_URL || "";
  const appBase = process.env.EXPO_PUBLIC_BASE_URL || "";
  const chosenBase = proxyBase || appBase;
  
  if (!chosenBase) {
    throw new Error(
      "Server URL not configured. Please set EXPO_PUBLIC_PROXY_BASE_URL or EXPO_PUBLIC_BASE_URL environment variable."
    );
  }
  
  const base = chosenBase.endsWith("/") ? chosenBase.slice(0, -1) : chosenBase;
  const fullUrl = url.startsWith("http")
    ? url
    : `${base}${url.startsWith("/") ? url : "/" + url}`;

  console.log("Making authenticated request to:", fullUrl);

  // First attempt
  let response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers: buildHeaders(auth?.jwt),
    });
  } catch (e) {
    console.error("Network error:", e);
    // Network-level error; surface as a Response-like object to keep callers consistent
    return new Response(
      JSON.stringify({ error: "Network error. Please try again." }),
      { status: 0, headers: { "Content-Type": "application/json" } },
    );
  }

  // If unauthorized, try to refresh JWT once and retry
  if (response.status === 401) {
    try {
      const refreshUrl = `${base}/api/auth/token`;
      const refreshRes = await fetch(refreshUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        if (data?.jwt) {
          // Persist the new token
          setAuth({ jwt: data.jwt, user: data.user });
          // Retry the original request with fresh token
          response = await fetch(fullUrl, {
            ...options,
            headers: buildHeaders(data.jwt),
          });
        }
      }
    } catch (e) {
      console.error("Token refresh error:", e);
      // Fall through and return the 401 response
    }
  }

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
