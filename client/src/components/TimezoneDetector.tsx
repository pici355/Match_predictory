import React, { useEffect, useState } from 'react';
import { 
  USER_TIMEZONE, 
  DEFAULT_TIMEZONE,
  setUserTimezone,
  formatDateToLocalString 
} from '@/lib/dateUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';

// List of common timezones for selection
const COMMON_TIMEZONES = [
  'Europe/Rome',
  'Europe/Bucharest',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Australia/Sydney',
];

// Romania timezone constant
const ROMANIA_TIMEZONE = 'Europe/Bucharest';

export default function TimezoneDetector() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTimezone, setSelectedTimezone] = useState(USER_TIMEZONE);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Update the global timezone when user changes it
  function handleTimezoneChange(timezone: string) {
    // Update the global timezone using our helper function
    setUserTimezone(timezone);
    
    // Also set the selected state for the component
    setSelectedTimezone(timezone);
  }

  // Format function for timezone display
  function formatTimezoneDisplay(timezone: string): string {
    // Get current date object
    const now = new Date();
    
    // Convert timezone name to more readable format (e.g., Europe/Rome -> Rome)
    const cityName = timezone.split('/').pop()?.replace('_', ' ');
    
    // Get the offset string for this specific timezone (not the browser's timezone)
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    // Extract the timezone abbreviation (e.g., "EEST" for Eastern European Summer Time)
    const formatted = formatter.format(now);
    const tzAbbr = formatted.split(' ').pop();
    
    return `${cityName} (${tzAbbr})`;
  }

  return (
    <div className="flex items-center gap-1 ml-auto">
      <div className="hidden md:flex items-center pr-2 border-r border-primary-foreground/20">
        <Clock className="h-4 w-4 text-primary-foreground/70 mr-1" />
        <span className="text-xs font-medium">
          {formatDateToLocalString(currentTime, {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: selectedTimezone,
          })}
        </span>
      </div>
      
      <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
        <SelectTrigger className="h-7 text-xs w-[120px] bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10 text-primary-foreground" id="timezone-select">
          <SelectValue placeholder="Fuso orario" />
        </SelectTrigger>
        <SelectContent>
          {/* Default timezone */}
          <SelectItem value={DEFAULT_TIMEZONE} className="text-xs font-medium">
            {formatTimezoneDisplay(DEFAULT_TIMEZONE)} (predefinito)
          </SelectItem>
          
          {/* Romania timezone special highlight */}
          {String(DEFAULT_TIMEZONE) !== String(ROMANIA_TIMEZONE) && (
            <SelectItem value={ROMANIA_TIMEZONE} className="text-xs font-medium bg-amber-50">
              {formatTimezoneDisplay(ROMANIA_TIMEZONE)} (Romania)
            </SelectItem>
          )}
          
          {/* Common timezones */}
          <div className="h-px bg-muted my-1" />
          
          {COMMON_TIMEZONES
            .filter(tz => String(tz) !== String(DEFAULT_TIMEZONE) && String(tz) !== String(ROMANIA_TIMEZONE))
            .map(tz => (
              <SelectItem key={tz} value={tz} className="text-xs">
                {formatTimezoneDisplay(tz)}
              </SelectItem>
            ))
          }
        </SelectContent>
      </Select>
    </div>
  );
}