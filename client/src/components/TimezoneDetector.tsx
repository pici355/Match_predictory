import { useEffect, useState } from "react";
import { detectTimezoneFromIP, USER_TIMEZONE } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Common timezones for quick selection
const commonTimezones = [
  { label: "Europe/Rome (Italia)", value: "Europe/Rome" },
  { label: "Europe/London (UK)", value: "Europe/London" },
  { label: "America/New_York (USA Est)", value: "America/New_York" },
  { label: "America/Los_Angeles (USA Ovest)", value: "America/Los_Angeles" },
  { label: "Asia/Tokyo (Giappone)", value: "Asia/Tokyo" },
  { label: "Australia/Sydney (Australia)", value: "Australia/Sydney" },
];

export default function TimezoneDetector() {
  const [detectedTimezone, setDetectedTimezone] = useState<string>(USER_TIMEZONE);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    // Detect timezone on component mount
    async function detectTimezone() {
      setIsDetecting(true);
      try {
        const timezone = await detectTimezoneFromIP();
        setDetectedTimezone(timezone);
      } catch (error) {
        console.error("Failed to detect timezone:", error);
      } finally {
        setIsDetecting(false);
      }
    }

    detectTimezone();
  }, []);

  const handleTimezoneChange = (timezone: string) => {
    // This updates the global USER_TIMEZONE value
    (window as any).USER_TIMEZONE = timezone;

    // Also update our local state
    setDetectedTimezone(timezone);
    
    // Close dropdown
    setDropdownOpen(false);
    
    // Force refresh the page to apply the new timezone
    window.location.reload();
  };

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-xs flex items-center"
          >
            <Badge 
              variant="outline" 
              className="px-2 py-1 border-gray-300 text-xs font-normal flex items-center"
            >
              <span className="mr-1">🌐</span>
              {isDetecting ? "Rilevamento..." : `${detectedTimezone.split('/').pop()?.replace('_', ' ')}`}
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <div className="px-2 py-1.5 text-xs font-semibold">Fuso orario</div>
          {commonTimezones.map((tz) => (
            <DropdownMenuItem 
              key={tz.value}
              onClick={() => handleTimezoneChange(tz.value)}
              className={detectedTimezone === tz.value ? "bg-gray-100" : ""}
            >
              {tz.label}
              {detectedTimezone === tz.value && <span className="ml-1 text-primary">✓</span>}
            </DropdownMenuItem>
          ))}
          <div className="px-2 py-1.5 mt-2 text-xs text-gray-500">
            Il fuso orario viene usato per visualizzare gli orari delle partite
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}