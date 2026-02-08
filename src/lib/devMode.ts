/**
 * Development Mode Utilities
 * 
 * Check if the app is running in development mode.
 * In development mode, certain features like print preview modal are enabled.
 */

// Check if running in development mode
export const isDevelopmentMode = (): boolean => {
  // Check Vite's mode
  return import.meta.env.DEV === true;
};

// Check if running in Electron
export const isElectronApp = (): boolean => {
  return typeof window !== 'undefined' && 
    'electron' in window && 
    window.electron !== undefined;
};

// Check if development print preview should be shown
// Only show on desktop (not mobile) and in development mode (not Electron/production)
export const shouldShowDevPrintPreview = (): boolean => {
  // Never show in Electron (production .exe)
  if (isElectronApp()) return false;
  
  // Only show in development mode
  if (!isDevelopmentMode()) return false;
  
  // Only show on desktop (screen width > 768px)
  if (typeof window !== 'undefined' && window.innerWidth <= 768) return false;
  
  return true;
};