import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';

const originalFetch = fetch;
const authKey = `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID}-jwt`;

const getURLFromArgs = (...args: Parameters<typeof expoFetch>) => {
  const [urlArg] = args;
  let url: string | null;
  if (typeof urlArg === 'string') {
    url = urlArg;
  } else if (typeof urlArg === 'object' && urlArg !== null && 'url' in urlArg) {
    url = (urlArg as { url: string }).url;
  } else {
    url = null;
  }
  return url;
};

const isFirstPartyURL = (url: string) => {
  return (
    url.startsWith('/') ||
    (process.env.EXPO_PUBLIC_BASE_URL && url.startsWith(process.env.EXPO_PUBLIC_BASE_URL))
  );
};

const isSecondPartyURL = (url: string) => {
  return url.startsWith('/_create/');
};

type Params = Parameters<typeof expoFetch>;
const fetchToWeb = async function fetchWithHeaders(...args: Params) {
  const firstPartyURL = process.env.EXPO_PUBLIC_BASE_URL || "";
  const secondPartyURL = process.env.EXPO_PUBLIC_PROXY_BASE_URL || "";
  // If no base URL is configured, pass through to expoFetch without modification
  if (!firstPartyURL && !secondPartyURL) {
    return expoFetch(...args);
  }
  const [input, init] = args;
  const url = getURLFromArgs(input, init);
  if (!url) {
    // Type assertion needed due to slight differences between expo/fetch and standard fetch types
    // @ts-ignore - expo/fetch uses FetchRequestInit which is compatible but TypeScript doesn't recognize it
    return expoFetch(input, init);
  }

  const isExternalFetch = !isFirstPartyURL(url);
  // we should not add headers to requests that don't go to our own server
  if (isExternalFetch) {
    // @ts-ignore - expo/fetch uses FetchRequestInit which is compatible but TypeScript doesn't recognize it
    return expoFetch(input, init);
  }

  let finalInput = input;
  const baseURL = isSecondPartyURL(url) ? secondPartyURL : firstPartyURL;
  if (typeof input === 'string') {
    finalInput = input.startsWith('/') ? `${baseURL}${input}` : input;
  } else {
    return originalFetch(input, init as any);
  }

  const initHeaders = init?.headers ?? {};
  const finalHeaders = new Headers(initHeaders);

  const headers = {
    'x-createxyz-project-group-id': process.env.EXPO_PUBLIC_PROJECT_GROUP_ID,
    host: process.env.EXPO_PUBLIC_HOST,
    'x-forwarded-host': process.env.EXPO_PUBLIC_HOST,
    'x-createxyz-host': process.env.EXPO_PUBLIC_HOST,
  };

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      finalHeaders.set(key, value);
    }
  }

  const auth = await SecureStore.getItemAsync(authKey)
    .then((auth) => {
      return auth ? JSON.parse(auth) : null;
    })
    .catch(() => {
      return null;
    });

  if (auth) {
    finalHeaders.set('authorization', `Bearer ${auth.jwt}`);
  }

  return expoFetch(finalInput, {
    ...init,
    headers: finalHeaders,
  } as any);
};

export default fetchToWeb;
