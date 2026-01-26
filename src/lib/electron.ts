/**
 * Electron detection and utilities
 * Simplified for POSYTUDE YHD-8330 USB printer
 */

/**
 * Check if the app is running inside Electron
 */
export const isElectron = (): boolean => {
  if (typeof window !== 'undefined' && window.isElectronApp) {
    return true;
  }
  
  if (typeof window !== 'undefined') {
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
export const getPlatform = (): 'windows' | 'browser' => {
  if (!isElectron()) {
    return 'browser';
  }
  
  if (window.electronAPI?.isWindows) return 'windows';
  
  return 'browser';
};

/**
 * Get Electron app version
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
