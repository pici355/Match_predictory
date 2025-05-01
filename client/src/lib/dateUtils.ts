/**
 * Utility functions for date/time manipulation with timezone awareness
 */

/**
 * Default timezone for the application (Italian timezone)
 */
export const DEFAULT_TIMEZONE = 'Europe/Rome';

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
  timezone: string = DEFAULT_TIMEZONE
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
  timezone: string = DEFAULT_TIMEZONE
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
  timezone: string = DEFAULT_TIMEZONE
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
export function getTimezoneOffset(timezone: string = DEFAULT_TIMEZONE): number {
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
  timezone: string = DEFAULT_TIMEZONE
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