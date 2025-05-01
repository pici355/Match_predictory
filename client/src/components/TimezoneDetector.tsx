import React, { useEffect, useState } from 'react';
import { 
  detectTimezoneFromIP, 
  USER_TIMEZONE, 
  DEFAULT_TIMEZONE,
  setUserTimezone,
  formatDateToLocalString 
} from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';

// List of common timezones for selection
const COMMON_TIMEZONES = [
  'Europe/Rome',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export default function TimezoneDetector() {
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTimezone, setSelectedTimezone] = useState(USER_TIMEZONE);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Detect timezone on initial load
  useEffect(() => {
    async function detectTimezone() {
      setIsDetecting(true);
      try {
        const tz = await detectTimezoneFromIP();
        setDetectedTimezone(tz);
        setSelectedTimezone(tz);
      } catch (error) {
        console.error('Error detecting timezone:', error);
      } finally {
        setIsDetecting(false);
      }
    }
    
    detectTimezone();
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
    // Calculate offset from UTC
    const now = new Date();
    const offset = -now.getTimezoneOffset() / 60; // Convert to hours
    const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
    
    // Convert timezone name to more readable format (e.g., Europe/Rome -> Rome)
    const cityName = timezone.split('/').pop()?.replace('_', ' ');
    
    return `${cityName} (UTC${offsetStr})`;
  }

  return (
    <div className="flex flex-col gap-2 p-2 rounded-md bg-muted/20">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {formatDateToLocalString(currentTime, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: selectedTimezone,
          })}
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2 items-center">
        <Label htmlFor="timezone-select" className="text-xs whitespace-nowrap">
          Fuso orario:
        </Label>
        <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
          <SelectTrigger className="h-8 text-xs min-w-[160px]" id="timezone-select">
            <SelectValue placeholder="Seleziona fuso orario" />
          </SelectTrigger>
          <SelectContent>
            {/* Show detected timezone at top if available */}
            {detectedTimezone && (
              <SelectItem value={detectedTimezone} className="text-xs">
                {formatTimezoneDisplay(detectedTimezone)} (rilevato)
              </SelectItem>
            )}
            
            {/* Divider if we have both detected and default */}
            {detectedTimezone && detectedTimezone !== DEFAULT_TIMEZONE && (
              <div className="h-px bg-muted my-1" />
            )}
            
            {/* Default timezone */}
            <SelectItem value={DEFAULT_TIMEZONE} className="text-xs font-medium">
              {formatTimezoneDisplay(DEFAULT_TIMEZONE)} (predefinito)
            </SelectItem>
            
            {/* Common timezones */}
            <div className="h-px bg-muted my-1" />
            
            {COMMON_TIMEZONES.filter(tz => 
              tz !== detectedTimezone && tz !== DEFAULT_TIMEZONE
            ).map(tz => (
              <SelectItem key={tz} value={tz} className="text-xs">
                {formatTimezoneDisplay(tz)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 text-xs"
          disabled={isDetecting}
          onClick={async () => {
            setIsDetecting(true);
            try {
              const tz = await detectTimezoneFromIP();
              setDetectedTimezone(tz);
              handleTimezoneChange(tz);
            } catch (error) {
              console.error('Error detecting timezone:', error);
            } finally {
              setIsDetecting(false);
            }
          }}
        >
          {isDetecting ? 'Rilevamento...' : 'Rileva automaticamente'}
        </Button>
      </div>
    </div>
  );
}