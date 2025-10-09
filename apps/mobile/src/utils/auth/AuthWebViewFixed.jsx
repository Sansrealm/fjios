import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuthStore } from './store';

const callbackUrl = '/api/auth/token';
const callbackQueryString = `callbackUrl=${callbackUrl}`;

/**
 * This renders a WebView for authentication and handles both web and native platforms.
 */
export const AuthWebView = ({ mode, proxyURL, baseURL }) => {
  const [currentURI, setURI] = useState(`${baseURL}/account/${mode}?${callbackQueryString}`);
  const { auth, setAuth, isReady } = useAuthStore();
  const isAuthenticated = isReady ? !!auth : null;
  const iframeRef = useRef(null);
  
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    if (isAuthenticated) {
      router.back();
    }
  }, [isAuthenticated]);
  
  useEffect(() => {
    if (isAuthenticated) {
      return;
    }
    setURI(`${baseURL}/account/${mode}?${callbackQueryString}`);
  }, [mode, baseURL, isAuthenticated]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) {
      return;
    }
    const handleMessage = (event) => {
      // Verify the origin for security
      if (event.origin !== process.env.EXPO_PUBLIC_PROXY_BASE_URL) {
        return;
      }
      if (event.data.type === 'AUTH_SUCCESS') {
        setAuth({
          jwt: event.data.jwt,
          user: event.data.user,
        });
      } else if (event.data.type === 'AUTH_ERROR') {
        console.error('Auth error:', event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setAuth]);

  if (Platform.OS === 'web') {
    const handleIframeError = () => {
      console.error('Failed to load auth iframe');
    };

    return (
      <iframe
        ref={iframeRef}
        title="Authentication"
        src={`${proxyURL}/account/${mode}?callbackUrl=/api/auth/expo-web-success`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        onError={handleIframeError}
      />
    );
  }
  
  return (
    <WebView
      sharedCookiesEnabled
      source={{
        uri: currentURI,
      }}
      headers={{
        'x-createxyz-project-group-id': process.env.EXPO_PUBLIC_PROJECT_GROUP_ID,
        host: process.env.EXPO_PUBLIC_HOST,
        'x-forwarded-host': process.env.EXPO_PUBLIC_HOST,
        'x-createxyz-host': process.env.EXPO_PUBLIC_HOST,
      }}
      onShouldStartLoadWithRequest={(request) => {
        console.log('🌐 WebView navigation:', request.url);
        
        if (request.url === `${baseURL}${callbackUrl}`) {
          console.log('🔄 Auth callback detected, fetching token...');
          
          fetch(request.url, {
            credentials: 'include', // Include cookies for auth
            headers: {
              'x-createxyz-project-group-id': process.env.EXPO_PUBLIC_PROJECT_GROUP_ID,
              'host': process.env.EXPO_PUBLIC_HOST,
              'x-forwarded-host': process.env.EXPO_PUBLIC_HOST,
              'x-createxyz-host': process.env.EXPO_PUBLIC_HOST,
            }
          }).then(async (response) => {
            console.log('📡 Token response status:', response.status);
            console.log('📡 Token response headers:', Object.fromEntries(response.headers.entries()));
            
            try {
              if (!response.ok) {
                console.error('❌ Auth token request failed:', response.status, response.statusText);
                
                // Try to get the error response
                const errorText = await response.text();
                console.error('❌ Error response body:', errorText);
                
                // Try to parse as JSON if it looks like JSON
                if (errorText.trim().startsWith('{')) {
                  try {
                    const errorData = JSON.parse(errorText);
                    console.error('❌ Parsed error:', errorData);
                  } catch (jsonError) {
                    console.error('❌ Could not parse error as JSON:', jsonError);
                  }
                }
                return;
              }
              
              const contentType = response.headers.get('content-type') || '';
              console.log('📄 Response content type:', contentType);
              
              if (!contentType.includes('application/json')) {
                console.error('❌ Expected JSON response but got:', contentType);
                const responseText = await response.text();
                console.error('❌ Response body:', responseText.substring(0, 500) + '...');
                return;
              }
              
              const data = await response.json();
              console.log('🎉 Auth success! Token received');
              console.log('👤 User:', data.user);
              
              setAuth({ jwt: data.jwt, user: data.user });
              
            } catch (error) {
              console.error('💥 Failed to process auth response:', error);
              
              // Try to get response text for debugging
              try {
                const responseText = await response.text();
                console.error('🔍 Raw response (first 500 chars):', responseText.substring(0, 500));
                
                // Check if it's HTML
                if (responseText.trim().startsWith('<')) {
                  console.error('💀 Received HTML instead of JSON - likely a server error page');
                }
              } catch (textError) {
                console.error('💥 Could not even get response text:', textError);
              }
            }
          }).catch((networkError) => {
            console.error('💥 Network error during auth fetch:', networkError);
          });
          
          return false; // Don't navigate to the token URL
        }
        
        if (request.url === currentURI) return true;

        // Add query string properly by checking if URL already has parameters
        const hasParams = request.url.includes('?');
        const separator = hasParams ? '&' : '?';
        const newURL = request.url.replaceAll(proxyURL, baseURL);
        
        if (newURL.endsWith(callbackUrl)) {
          setURI(newURL);
          return false;
        }
        
        setURI(`${newURL}${separator}${callbackQueryString}`);
        return false;
      }}
      style={{ flex: 1 }}
    />
  );
};