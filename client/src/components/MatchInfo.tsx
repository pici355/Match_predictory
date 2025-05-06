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
  result?: string | null;
  hasResult?: boolean;
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

// Carica i loghi delle squadre o mostra le iniziali come fallback
function TeamLogo({ teamName, size = "md" }: { teamName: string, size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "w-6 h-6" : "w-7 h-7";
  const fontSize = size === "sm" ? "text-[10px]" : "text-xs";
  const { data: teams } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });
  
  // Tenta di trovare la squadra nel database per ottenere il logo
  const team = teams?.find(t => t.name === teamName || 
                           teamName.includes(t.name) || 
                           t.name.includes(teamName));
  
  if (team?.logo) {
    return (
      <div className={`${dimensions} rounded-full overflow-hidden border border-gray-200`}>
        <img 
          src={team.logo}
          alt={`${teamName} logo`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            // Assicuriamoci che l'elemento parent esista prima di manipolarlo
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.classList.add('bg-primary/20', 'flex', 'items-center', 'justify-center', 'text-primary', 'font-semibold');
              parent.innerHTML = `<span class="${fontSize}">${teamName.substring(0, 2).toUpperCase()}</span>`;
            }
          }}
        />
      </div>
    );
  }
  
  // Fallback alle iniziali se nessun logo è disponibile
  return (
    <div className={`${dimensions} rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold ${fontSize}`}>
      {teamName.substring(0, 2).toUpperCase()}
    </div>
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
        <div className="bg-muted px-2 py-0.5 flex justify-between items-center text-xs">
          <div className="font-medium">G. {match.matchDay}</div>
          <div className={`text-xs px-1.5 py-0.5 rounded-sm ${isEditable ? 'bg-secondary text-secondary-foreground' : 'bg-destructive text-destructive-foreground'}`}>
            {isEditable ? `${timeRemaining}` : "Chiuso"}
          </div>
        </div>
        
        {/* Teams and match info in a more compact layout */}
        <div className="px-2 py-1.5 flex justify-between items-center">
          <div className="flex flex-row items-center gap-1.5 flex-1">
            {/* Home team with logo and name side by side */}
            <TeamLogo teamName={match.homeTeam} size="sm" />
            <div className="font-semibold text-xs truncate max-w-[70px]">{match.homeTeam}</div>
          </div>
          
          {/* VS section */}
          <div className="text-center mx-1 font-semibold text-muted-foreground text-[10px]">VS</div>
          
          <div className="flex flex-row-reverse items-center gap-1.5 flex-1 text-right">
            {/* Away team with logo and name side by side */}
            <TeamLogo teamName={match.awayTeam} size="sm" />
            <div className="font-semibold text-xs truncate max-w-[70px]">{match.awayTeam}</div>
          </div>
        </div>
        
        {/* Match info footer */}
        <div className="border-t px-2 py-0.5 bg-muted/20 text-xs flex items-center justify-between">
          <div className="text-[10px] flex items-center">
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
            <div className="text-primary-foreground text-[10px] font-medium truncate max-w-[120px]">
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
  
  console.log("Partite totali:", matches?.length);
  
  // Filtrare solo le partite future (partite che non sono ancora iniziate e non hanno risultato)
  const futureMatches = matches?.filter(match => {
    // Verifichiamo se la partita ha già un risultato (è già stata giocata)
    if (match.hasResult === true) {
      console.log("Esclusa partita con risultato:", match.homeTeam, "vs", match.awayTeam, "risultato:", match.result);
      return false; // Escludiamo le partite già giocate
    }
    
    // Verifichiamo anche se la partita è nel futuro
    const matchDate = new Date(match.matchDate);
    const now = new Date();
    
    // Includiamo solo partite future o senza risultato (in corso)
    return matchDate > now;
  });
  
  // Group future matches by matchDay
  const matchesByDay = futureMatches?.reduce((acc, match) => {
    if (!acc[match.matchDay]) {
      acc[match.matchDay] = [];
    }
    acc[match.matchDay].push(match);
    return acc;
  }, {} as Record<number, Match[]>) || {};
  
  const matchDays = Object.keys(matchesByDay).map(Number).sort((a, b) => a - b);
  
  return (
    <Card className="mb-6 shadow-md">
      <CardHeader className="px-3 py-1.5">
        <CardTitle className="text-base">Prossime partite</CardTitle>
      </CardHeader>
      <CardContent className="px-2 py-1.5">
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
            <div className="text-center py-6 text-gray-500 space-y-1">
              <div className="font-medium">Nessuna partita in programma</div>
              <p className="text-xs">Le partite già giocate sono state archiviate</p>
            </div>
          )
        ) : (
          <div className="text-center py-6 text-gray-500 space-y-1">
            <div className="font-medium">Nessuna partita in programma</div>
            <p className="text-xs">Le partite già giocate sono state archiviate</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}