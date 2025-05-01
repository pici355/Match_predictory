import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  formatDateToLocalString, 
  isMatchPredictionEditable, 
  USER_TIMEZONE,
  convertToTimezone 
} from "@/lib/dateUtils";

type Match = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  matchDay: number;
  description?: string;
};

function formatTimeRemaining(timeInMs: number): string {
  if (timeInMs <= 0) return "Partita iniziata";
  
  const seconds = Math.floor((timeInMs / 1000) % 60);
  const minutes = Math.floor((timeInMs / (1000 * 60)) % 60);
  const hours = Math.floor((timeInMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(timeInMs / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days}g ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function MatchCard({ match }: { match: Match }) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isEditable, setIsEditable] = useState<boolean>(true);
  const [currentTimezone, setCurrentTimezone] = useState<string>(USER_TIMEZONE);
  
  // Update component when the global timezone changes
  useEffect(() => {
    // Set up a timer to check for timezone changes every second
    const timezoneCheck = setInterval(() => {
      if (USER_TIMEZONE !== currentTimezone) {
        setCurrentTimezone(USER_TIMEZONE);
      }
    }, 1000);
    
    return () => clearInterval(timezoneCheck);
  }, [currentTimezone]);
  
  useEffect(() => {
    // Always use user's current timezone preference
    const updateTimer = () => {
      const now = new Date();
      
      // Convert match date to the user's timezone for calculations
      const matchDateInUserTz = convertToTimezone(match.matchDate, USER_TIMEZONE);
      const nowInUserTz = convertToTimezone(now, USER_TIMEZONE);
      
      // Calculate time remaining in the user's timezone
      const timeInMs = matchDateInUserTz.getTime() - nowInUserTz.getTime();
      
      setTimeRemaining(formatTimeRemaining(timeInMs));
      setIsEditable(isMatchPredictionEditable(match.matchDate, USER_TIMEZONE));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [match.matchDate, currentTimezone]);
  
  return (
    <Card className="mb-4 hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-0">
        {/* Match day info and time banner */}
        <div className="bg-muted px-3 py-1 flex justify-between items-center text-xs">
          <div className="font-medium">Giornata {match.matchDay}</div>
          <div className={`text-xs px-2 py-0.5 rounded-sm ${isEditable ? 'bg-secondary text-secondary-foreground' : 'bg-destructive text-destructive-foreground'}`}>
            {isEditable ? `${timeRemaining}` : "Chiuso"}
          </div>
        </div>
        
        {/* Teams section */}
        <div className="p-4 flex justify-between items-center">
          {/* Home team */}
          <div className="text-center flex-1 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full overflow-hidden mb-2">
              <img 
                src={`/team-logos/${match.homeTeam.toLowerCase().replace(/\s+/g, '-')}.png`} 
                alt={match.homeTeam}
                onError={(e) => {
                  // Fallback se l'immagine non esiste
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    // Remove the img element
                    parent.removeChild(e.currentTarget);
                    // Update parent styling
                    parent.className = 'w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm mb-2';
                    // Add the text directly
                    parent.textContent = match.homeTeam.substring(0, 2).toUpperCase();
                  }
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="font-bold truncate">{match.homeTeam}</div>
          </div>
          
          {/* VS section */}
          <div className="text-center mx-2 font-bold text-gray-500 px-3">VS</div>
          
          {/* Away team */}
          <div className="text-center flex-1 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full overflow-hidden mb-2">
              <img 
                src={`/team-logos/${match.awayTeam.toLowerCase().replace(/\s+/g, '-')}.png`} 
                alt={match.awayTeam}
                onError={(e) => {
                  // Fallback se l'immagine non esiste
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    // Remove the img element
                    parent.removeChild(e.currentTarget);
                    // Update parent styling
                    parent.className = 'w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm mb-2';
                    // Add the text directly
                    parent.textContent = match.awayTeam.substring(0, 2).toUpperCase();
                  }
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="font-bold truncate">{match.awayTeam}</div>
          </div>
        </div>
        
        {/* Match info footer */}
        <div className="border-t px-4 py-2 bg-muted/20 text-sm">
          <div className="flex items-center">
            <span className="font-medium">Data:</span>
            <span className="ml-2">
              {formatDateToLocalString(match.matchDate, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }, USER_TIMEZONE)}
            </span>
          </div>
          {match.description && (
            <div className="text-indigo-600 text-xs mt-1 font-medium">
              {match.description}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MatchInfo() {
  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ['/api/matches'],
  });
  
  // Group matches by matchDay
  const matchesByDay = matches?.reduce((acc, match) => {
    if (!acc[match.matchDay]) {
      acc[match.matchDay] = [];
    }
    acc[match.matchDay].push(match);
    return acc;
  }, {} as Record<number, Match[]>) || {};
  
  const matchDays = Object.keys(matchesByDay).map(Number).sort((a, b) => a - b);
  
  return (
    <Card className="mb-8 shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Prossime partite</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : matches && matches.length > 0 ? (
          matchDays.length > 0 ? (
            <Tabs defaultValue={matchDays[0].toString()}>
              <TabsList className="mb-4 w-full">
                {matchDays.map(day => (
                  <TabsTrigger 
                    key={day}
                    value={day.toString()}
                    className="flex-1"
                  >
                    Giornata {day}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {matchDays.map(day => (
                <TabsContent key={day} value={day.toString()}>
                  {matchesByDay[day].map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Non ci sono partite disponibili
            </div>
          )
        ) : (
          <div className="text-center py-8 text-gray-500">
            Non ci sono partite disponibili
          </div>
        )}
      </CardContent>
    </Card>
  );
}
