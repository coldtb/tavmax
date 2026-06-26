import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Safe Storage Polyfill for mobile browsers/private modes where storage throws errors
(() => {
  if (typeof window === 'undefined' || typeof Storage === 'undefined') return;

  const storageMock: Record<string, Record<string, string>> = {
    localStorage: {},
    sessionStorage: {}
  };

  const checkSupport = (type: 'localStorage' | 'sessionStorage') => {
    try {
      const storage = window[type];
      if (!storage) return false;
      const x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      return true;
    } catch (e) {
      return false;
    }
  };

  const isLocalSupported = checkSupport('localStorage');
  const isSessionSupported = checkSupport('sessionStorage');

  // Redefine Storage.prototype methods to safely catch and fallback
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalClear = Storage.prototype.clear;

  Storage.prototype.getItem = function(key: string) {
    let isSession = false;
    try { isSession = this === window.sessionStorage; } catch (e) {}
    const type = isSession ? 'sessionStorage' : 'localStorage';
    if (type === 'localStorage' && !isLocalSupported) {
      return key in storageMock.localStorage ? storageMock.localStorage[key] : null;
    }
    if (type === 'sessionStorage' && !isSessionSupported) {
      return key in storageMock.sessionStorage ? storageMock.sessionStorage[key] : null;
    }
    try {
      return originalGetItem.call(this, key);
    } catch (e) {
      return key in storageMock[type] ? storageMock[type][key] : null;
    }
  };

  Storage.prototype.setItem = function(key: string, value: string) {
    let isSession = false;
    try { isSession = this === window.sessionStorage; } catch (e) {}
    const type = isSession ? 'sessionStorage' : 'localStorage';
    const valStr = String(value);
    if (type === 'localStorage' && !isLocalSupported) {
      storageMock.localStorage[key] = valStr;
      return;
    }
    if (type === 'sessionStorage' && !isSessionSupported) {
      storageMock.sessionStorage[key] = valStr;
      return;
    }
    try {
      originalSetItem.call(this, key, valStr);
    } catch (e) {
      storageMock[type][key] = valStr;
    }
  };

  Storage.prototype.removeItem = function(key: string) {
    let isSession = false;
    try { isSession = this === window.sessionStorage; } catch (e) {}
    const type = isSession ? 'sessionStorage' : 'localStorage';
    if (type === 'localStorage' && !isLocalSupported) {
      delete storageMock.localStorage[key];
      return;
    }
    if (type === 'sessionStorage' && !isSessionSupported) {
      delete storageMock.sessionStorage[key];
      return;
    }
    try {
      originalRemoveItem.call(this, key);
    } catch (e) {
      delete storageMock[type][key];
    }
  };

  Storage.prototype.clear = function() {
    let isSession = false;
    try { isSession = this === window.sessionStorage; } catch (e) {}
    const type = isSession ? 'sessionStorage' : 'localStorage';
    if (type === 'localStorage' && !isLocalSupported) {
      storageMock.localStorage = {};
      return;
    }
    if (type === 'sessionStorage' && !isSessionSupported) {
      storageMock.sessionStorage = {};
      return;
    }
    try {
      originalClear.call(this);
    } catch (e) {
      storageMock[type] = {};
    }
  };
})();


import './index.css'
import App from './App.tsx'

// Global error overlay for debugging async / Three.js crashes in development
if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    const errorStack = event.error?.stack || '';
    const errorFilename = event.filename || '';
    const errorMessage = event.message || '';
    if (
      errorStack.includes('chrome-extension://') ||
      errorFilename.includes('chrome-extension://') ||
      errorMessage.includes('chrome-extension://')
    ) {
      // Ignore extension injected script errors
      return;
    }

    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:rgba(127,0,0,0.95);color:white;padding:24px;z-index:999999;font-family:monospace;white-space:pre-wrap;font-size:13px;max-height:50vh;overflow:auto;border-bottom:4px solid red;box-shadow:0 10px 30px rgba(0,0,0,0.5);';
    errDiv.innerHTML = `<h3 style="margin-top:0;color:#ff8888;">Unhandled Runtime Exception</h3><pre style="margin:0;">${event.error?.stack || event.error || event.message}</pre>`;
    document.body.appendChild(errDiv);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (!reason) return;

    const reasonStack = reason.stack || '';
    const reasonMessage = typeof reason === 'string' ? reason : (reason.message || '');
    
    if (
      reasonStack.includes('chrome-extension://') ||
      reasonMessage.includes('chrome-extension://')
    ) {
      // Ignore extension promise rejections
      return;
    }

    // If it is not a real Error instance and does not have a stack trace, it is likely extension or browser noise.
    if (!(reason instanceof Error) && !reason.stack) {
      return;
    }

    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:rgba(127,0,0,0.95);color:white;padding:24px;z-index:999999;font-family:monospace;white-space:pre-wrap;font-size:13px;max-height:50vh;overflow:auto;border-bottom:4px solid red;box-shadow:0 10px 30px rgba(0,0,0,0.5);';
    errDiv.innerHTML = `<h3 style="margin-top:0;color:#ff8888;">Unhandled Promise Rejection</h3><pre style="margin:0;">${reason.stack || reason}</pre>`;
    document.body.appendChild(errDiv);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

