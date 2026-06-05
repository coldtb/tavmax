import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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

