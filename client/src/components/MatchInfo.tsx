import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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

function isEditablePrediction(matchDate: string): boolean {
  const now = new Date();
  // Create the match date with Italian timezone
  const match = new Date(matchDate);
  const thirtyMinutesBeforeMatch = new Date(match.getTime() - 30 * 60 * 1000);
  
  console.log(`Match time: ${match.toLocaleString()}, Current time: ${now.toLocaleString()}, Editable until: ${thirtyMinutesBeforeMatch.toLocaleString()}`);
  
  return now < thirtyMinutesBeforeMatch;
}

function MatchCard({ match }: { match: Match }) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isEditable, setIsEditable] = useState<boolean>(true);
  
  useEffect(() => {
    const matchDate = new Date(match.matchDate);
    
    const updateTimer = () => {
      const now = new Date();
      const timeInMs = matchDate.getTime() - now.getTime();
      setTimeRemaining(formatTimeRemaining(timeInMs));
      setIsEditable(isEditablePrediction(match.matchDate));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [match.matchDate]);
  
  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex justify-between items-center">
          <div className="text-center w-2/5">
            <div className="font-bold">{match.homeTeam}</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-gray-500">VS</div>
            <div className="text-xs mt-1 text-gray-400">Giornata {match.matchDay}</div>
          </div>
          <div className="text-center w-2/5">
            <div className="font-bold">{match.awayTeam}</div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center text-sm border-t pt-3">
          <div>
            <span className="font-medium">Data:</span>{" "}
            {new Date(match.matchDate).toLocaleString('it-IT', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Rome' // Use Italian timezone for consistent display
            })}
          </div>
          <Badge variant={isEditable ? "secondary" : "outline"}>
            {isEditable ? `Tempo: ${timeRemaining}` : "Chiuso"}
          </Badge>
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
