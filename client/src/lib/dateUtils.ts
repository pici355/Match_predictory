/**
 * Utility functions for date/time manipulation with timezone awareness
 */

/**
 * Default timezone for the application (Italian timezone)
 */
export const DEFAULT_TIMEZONE = 'Europe/Rome';

/**
 * User's detected timezone (initialized with browser's timezone)
 */
export let USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Store for detected timezone from IP address
 */
let detectedTimezoneFromIP: string | null = null;

/**
 * Flag to track if we've attempted to detect timezone
 */
let hasAttemptedTimezoneDetection = false;

/**
 * Detect user's timezone from their IP address
 * @returns Promise that resolves when timezone detection is complete
 */
export async function detectTimezoneFromIP(): Promise<string> {
  if (detectedTimezoneFromIP || hasAttemptedTimezoneDetection) {
    return detectedTimezoneFromIP || USER_TIMEZONE;
  }
  
  hasAttemptedTimezoneDetection = true;
  
  try {
    // Use a free IP geolocation service with timezone info
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      throw new Error('Failed to fetch IP data');
    }
    
    const data = await response.json();
    if (data.timezone) {
      detectedTimezoneFromIP = data.timezone;
      USER_TIMEZONE = data.timezone;
      console.log('Detected timezone from IP:', USER_TIMEZONE);
      return USER_TIMEZONE;
    } else {
      throw new Error('No timezone in response');
    }
  } catch (error) {
    console.error('Failed to detect timezone from IP:', error);
    return USER_TIMEZONE; // Fallback to browser timezone
  }
}

/**
 * Format a date to a string representation with proper timezone handling
 * @param date The date to format
 * @param format The format options
 * @param timezone Optional timezone override
 * @returns Formatted date string in the specified timezone
 */
export function formatDateToLocalString(
  date: Date | string,
  format: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  },
  timezone: string = USER_TIMEZONE
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('it-IT', {
    ...format,
    timeZone: timezone
  });
}

/**
 * Convert a date to display in the user's timezone
 * @param date Date to convert (either Date object or ISO string)
 * @param timezone Target timezone (defaults to Italian timezone)
 * @returns Date adjusted for the specified timezone
 */
export function convertToTimezone(
  date: Date | string,
  timezone: string = USER_TIMEZONE
): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Get the date string in the target timezone
  const dateStr = dateObj.toLocaleString('en-US', { timeZone: timezone });
  // Create a new date object from this string
  return new Date(dateStr);
}

/**
 * Checks if a date is in the past relative to now in the specified timezone
 * @param date Date to check
 * @param timezone Target timezone
 * @returns True if the date is in the past
 */
export function isDateInPast(
  date: Date | string,
  timezone: string = USER_TIMEZONE
): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // Convert both dates to the same timezone for comparison
  const localDateStr = dateObj.toLocaleString('en-US', { timeZone: timezone });
  const localNowStr = now.toLocaleString('en-US', { timeZone: timezone });
  
  return new Date(localDateStr) < new Date(localNowStr);
}

/**
 * Get the timezone offset in minutes for a specific timezone
 * @param timezone The timezone to get the offset for
 * @returns Offset in minutes
 */
export function getTimezoneOffset(timezone: string = USER_TIMEZONE): number {
  const now = new Date();
  
  // Get the time string in the user's timezone
  const timeStr = now.toLocaleString('en-US', { timeZone: timezone });
  const localDate = new Date(timeStr);
  
  // Compare with UTC
  return (localDate.getTime() - now.getTime()) / (60 * 1000);
}

/**
 * Check if a match is still editable (more than 30 mins until start time)
 * @param matchDate The match start date
 * @param timezone The timezone to check in
 * @returns True if the match prediction is still editable
 */
export function isMatchPredictionEditable(
  matchDate: string | Date,
  timezone: string = USER_TIMEZONE
): boolean {
  const date = typeof matchDate === 'string' ? new Date(matchDate) : matchDate;
  const now = new Date();
  
  // Convert both to the same timezone for comparison
  const matchDateLocal = date.toLocaleString('en-US', { timeZone: timezone });
  const nowLocal = now.toLocaleString('en-US', { timeZone: timezone });
  
  const matchTime = new Date(matchDateLocal).getTime();
  const currentTime = new Date(nowLocal).getTime();
  
  // 30 minutes in milliseconds
  const thirtyMinutes = 30 * 60 * 1000;
  
  return (matchTime - currentTime) > thirtyMinutes;
}