/**
 * Electron detection and utilities
 * This module provides helper functions for detecting Electron environment
 * and accessing Electron-specific features
 */

/**
 * Check if the app is running inside Electron
 */
export const isElectron = (): boolean => {
  // Check for the flag set by preload script
  if (typeof window !== 'undefined' && window.isElectronApp) {
    return true;
  }
  
  // Fallback checks
  if (typeof window !== 'undefined') {
    // Check for Electron-specific user agent
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('electron')) {
      return true;
    }
  }
  
  return false;
};

/**
 * Check if Electron API is available
 */
export const hasElectronAPI = (): boolean => {
  return typeof window !== 'undefined' && 
         window.electronAPI !== undefined &&
         typeof window.electronAPI.printToUSB === 'function';
};

/**
 * Get the current platform
 */
export const getPlatform = (): 'windows' | 'mac' | 'linux' | 'browser' => {
  if (!isElectron()) {
    return 'browser';
  }
  
  if (window.electronAPI?.isWindows) return 'windows';
  if (window.electronAPI?.isMac) return 'mac';
  if (window.electronAPI?.isLinux) return 'linux';
  
  return 'browser';
};

/**
 * Get Electron app version (or null if not in Electron)
 */
export const getAppVersion = async (): Promise<string | null> => {
  if (!hasElectronAPI()) {
    return null;
  }
  
  try {
    return await window.electronAPI!.getVersion();
  } catch {
    return null;
  }
};
