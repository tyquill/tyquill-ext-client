import { browser } from 'wxt/browser';

export async function getAuthToken(): Promise<string | null> {
    return new Promise((resolve) => {
      browser.storage.local.get(['authState'], (result) => {
        const authState = result.authState;
        resolve(authState?.accessToken || null);
      });
    });
  }