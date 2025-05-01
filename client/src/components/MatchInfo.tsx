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

// Diamo anche accesso ai team per ottenere i loghi corretti
type Team = {
  id: number;
  name: string;
  logo?: string;
  managerName: string;
  credits: number;
};

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

// Componente per il logo della squadra con fallback sicuro
function TeamLogo({ teamName, size = "md" }: { teamName: string, size?: "sm" | "md" }) {
  const [logoError, setLogoError] = useState(false);
  const { data: teams } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  // Trova il team corrispondente in modo flessibile
  const teamData = teams?.find(team => 
    team.name.toLowerCase() === teamName.toLowerCase() || 
    teamName.toLowerCase().includes(team.name.toLowerCase()) || 
    team.name.toLowerCase().includes(teamName.toLowerCase())
  );

  const dimensions = size === "sm" ? "w-6 h-6" : "w-7 h-7";
  const fontSize = size === "sm" ? "text-[10px]" : "text-xs";

  // Se c'è un errore o non c'è logo, mostra le iniziali
  if (logoError || !teamData?.logo) {
    return (
      <div className={`${dimensions} rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold ${fontSize}`}>
        {teamName.substring(0, 2).toUpperCase()}
      </div>
    );
  }

  // Altrimenti mostra il logo con gestione errori
  return (
    <img
      src={teamData.logo}
      alt={teamName}
      onError={(e) => {
        try {
          // Prova con JPG
          const fileName = teamName.toLowerCase().replace(/\s+/g, '-');
          const jpgSrc = `/team-logos/${fileName}.jpg`;
          e.currentTarget.src = jpgSrc;
          
          // Se fallisce con JPG, prova con PNG
          e.currentTarget.onerror = () => {
            try {
              const pngSrc = `/team-logos/${fileName}.png`;
              e.currentTarget.src = pngSrc;
              
              // Se ancora fallisce, imposta lo stato di errore
              e.currentTarget.onerror = () => setLogoError(true);
            } catch {
              setLogoError(true);
            }
          };
        } catch {
          setLogoError(true);
        }
      }}
      className="w-full h-full object-cover"
    />
  );
}

function MatchCard({ match }: { match: Match }) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isEditable, setIsEditable] = useState<boolean>(true);
  const [currentTimezone, setCurrentTimezone] = useState<string>(USER_TIMEZONE);
  
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
    <Card className="mb-2 hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-0">
        {/* Match day info and time banner */}
        <div className="bg-muted px-3 py-1 flex justify-between items-center text-xs">
          <div className="font-medium">Giornata {match.matchDay}</div>
          <div className={`text-xs px-2 py-0.5 rounded-sm ${isEditable ? 'bg-secondary text-secondary-foreground' : 'bg-destructive text-destructive-foreground'}`}>
            {isEditable ? `${timeRemaining}` : "Chiuso"}
          </div>
        </div>
        
        {/* Teams section */}
        <div className="px-3 py-2 flex justify-between items-center">
          {/* Home team */}
          <div className="text-center flex-1 flex flex-col items-center">
            <div className="w-7 h-7 rounded-full overflow-hidden mb-1">
              <TeamLogo teamName={match.homeTeam} />
            </div>
            <div className="font-bold text-sm truncate max-w-[90px]">{match.homeTeam}</div>
          </div>
          
          {/* VS section */}
          <div className="text-center mx-1 font-semibold text-muted-foreground text-xs px-1">VS</div>
          
          {/* Away team */}
          <div className="text-center flex-1 flex flex-col items-center">
            <div className="w-7 h-7 rounded-full overflow-hidden mb-1">
              <TeamLogo teamName={match.awayTeam} />
            </div>
            <div className="font-bold text-sm truncate max-w-[90px]">{match.awayTeam}</div>
          </div>
        </div>
        
        {/* Match info footer */}
        <div className="border-t px-2 py-1 bg-muted/20 text-xs">
          <div className="flex items-center">
            <span className="font-medium">Data:</span>
            <span className="ml-1">
              {formatDateToLocalString(match.matchDate, {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }, USER_TIMEZONE)}
            </span>
          </div>
          {match.description && (
            <div className="text-primary-foreground text-xs mt-0.5 font-medium truncate">
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
    <Card className="mb-6 shadow-md">
      <CardHeader className="px-4 py-2">
        <CardTitle className="text-lg">Prossime partite</CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-2">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : matches && matches.length > 0 ? (
          matchDays.length > 0 ? (
            <Tabs defaultValue={matchDays[0].toString()}>
              <TabsList className="mb-2 w-full">
                {matchDays.map(day => (
                  <TabsTrigger 
                    key={day}
                    value={day.toString()}
                    className="flex-1"
                  >
                    G. {day}
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
            <div className="text-center py-6 text-gray-500">
              Non ci sono partite disponibili
            </div>
          )
        ) : (
          <div className="text-center py-6 text-gray-500">
            Non ci sono partite disponibili
          </div>
        )}
      </CardContent>
    </Card>
  );
}