/**
 * KOT Number Manager
 * Manages auto-incrementing KOT numbers that reset daily
 * Stored in localStorage for persistence across sessions
 */

const KOT_STORAGE_KEY = 'pos_kot_counter';

interface KOTCounterData {
  date: string; // YYYY-MM-DD format
  counter: number;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getStoredData(): KOTCounterData | null {
  try {
    const stored = localStorage.getItem(KOT_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('[KOTManager] Error reading from localStorage:', e);
  }
  return null;
}

function saveData(data: KOTCounterData): void {
  try {
    localStorage.setItem(KOT_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[KOTManager] Error saving to localStorage:', e);
  }
}

/**
 * Get the next KOT number
 * Resets to 1 at the start of each day
 * @returns The next KOT number as a formatted string (e.g., "01", "02")
 */
export function getNextKOTNumber(): string {
  const today = getTodayDate();
  const stored = getStoredData();
  
  let nextNumber: number;
  
  if (stored && stored.date === today) {
    // Same day, increment counter
    nextNumber = stored.counter + 1;
  } else {
    // New day or no data, start from 1
    nextNumber = 1;
  }
  
  // Save the new counter
  saveData({ date: today, counter: nextNumber });
  
  // Return formatted number (padded to 2 digits minimum)
  return nextNumber.toString().padStart(2, '0');
}

/**
 * Get the current KOT count for today (without incrementing)
 */
export function getCurrentKOTCount(): number {
  const today = getTodayDate();
  const stored = getStoredData();
  
  if (stored && stored.date === today) {
    return stored.counter;
  }
  
  return 0;
}

/**
 * Reset KOT counter (for testing or manual reset)
 */
export function resetKOTCounter(): void {
  saveData({ date: getTodayDate(), counter: 0 });
}
