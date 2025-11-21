import { usePathname, useRouter } from 'expo-router';
import { App } from 'expo-router/build/qualified-entry';
import React, { memo, useEffect, useState } from 'react';
import { ErrorBoundaryWrapper } from './__create/SharedErrorBoundary';
import './src/__create/polyfills';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import { AlertModal } from './polyfills/web/alerts.web';
import './global.css';

// Type declarations for web-only APIs (only available in web environment)
declare const window: (typeof globalThis & { 
  addEventListener?: (type: string, handler: (event: any) => void) => void;
  removeEventListener?: (type: string, handler: (event: any) => void) => void;
  parent?: any;
  postMessage?: (message: any, targetOrigin: string) => void;
  innerWidth?: number;
  innerHeight?: number;
}) | undefined;

const GlobalErrorReporter = () => {
  useEffect(() => {
    // Only run in web environment, not native
    if (typeof window === 'undefined' || !window.addEventListener) {
      return;
    }
    try {
      const errorHandler = (event: any) => {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        console.error(event.error);
      };
      // unhandled promises happen all the time, so we just log them
      const unhandledRejectionHandler = (event: any) => {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        console.error('Unhandled promise rejection:', event.reason);
      };
      if (window?.addEventListener) {
        window.addEventListener('error', errorHandler);
        window.addEventListener('unhandledrejection', unhandledRejectionHandler);
      }
      return () => {
        if (window?.removeEventListener) {
          window.removeEventListener('error', errorHandler);
          window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
        }
      };
    } catch (error) {
      console.error('Error setting up global error reporter:', error);
    }
  }, []);
  return null;
};

const Wrapper = memo(() => {
  return (
    <ErrorBoundaryWrapper>
      <SafeAreaProvider
        initialMetrics={{
          insets: { top: 64, bottom: 34, left: 0, right: 0 },
          frame: {
            x: 0,
            y: 0,
            width: typeof window === 'undefined' ? 390 : (window?.innerWidth ?? 390),
            height: typeof window === 'undefined' ? 844 : (window?.innerHeight ?? 844),
          },
        }}
      >
        <App />
        <GlobalErrorReporter />
        <Toaster />
      </SafeAreaProvider>
    </ErrorBoundaryWrapper>
  );
});
const healthyResponse = {
  type: 'sandbox:mobile:healthcheck:response',
  healthy: true,
};

const useHandshakeParent = () => {
  useEffect(() => {
    // Only run in web environment, not native
    if (typeof window === 'undefined' || !window.parent || !window.addEventListener) {
      return;
    }
    try {
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'sandbox:mobile:healthcheck') {
          window.parent.postMessage(healthyResponse, '*');
        }
      };
      if (window?.addEventListener) {
        window.addEventListener('message', handleMessage);
      }
      // Immediately respond to the parent window with a healthy response in
      // case we missed the healthcheck message
      if (window?.parent?.postMessage) {
        window.parent.postMessage(healthyResponse, '*');
      }
      return () => {
        if (window?.removeEventListener) {
          window.removeEventListener('message', handleMessage);
        }
      };
    } catch (error) {
      console.error('Error setting up handshake:', error);
    }
  }, []);
};

const CreateApp = () => {
  const router = useRouter();
  const pathname = usePathname();
  useHandshakeParent();

  useEffect(() => {
    // Only run in web environment, not native
    if (typeof window === 'undefined' || !window.parent || !window.addEventListener) {
      return;
    }
    try {
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'sandbox:navigation' && event.data.pathname !== pathname) {
          router.push(event.data.pathname);
        }
      };

      if (window?.addEventListener) {
        window.addEventListener('message', handleMessage);
      }
      if (window?.parent?.postMessage) {
        window.parent.postMessage({ type: 'sandbox:mobile:ready' }, '*');
      }
      return () => {
        if (window?.removeEventListener) {
          window.removeEventListener('message', handleMessage);
        }
      };
    } catch (error) {
      console.error('Error setting up navigation listener:', error);
    }
  }, [router, pathname]);

  useEffect(() => {
    // Only run in web environment, not native
    if (typeof window === 'undefined' || !window.parent) {
      return;
    }
    try {
      if (window?.parent?.postMessage) {
        window.parent.postMessage(
          {
            type: 'sandbox:mobile:navigation',
            pathname,
          },
          '*'
        );
      }
    } catch (error) {
      console.error('Error posting navigation message:', error);
    }
  }, [pathname]);

  return (
    <>
      <Wrapper />
      <AlertModal />
    </>
  );
};

export default CreateApp;
