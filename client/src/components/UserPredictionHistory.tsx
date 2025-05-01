import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  formatDateToLocalString, 
  isDateInPast,
  USER_TIMEZONE
} from "@/lib/dateUtils";
import { 
  Check, 
  X, 
  Clock, 
  Trophy, 
  Coins, 
  AlertCircle
} from "lucide-react";

// Types
type User = {
  id: number;
  username: string;
  isAdmin: boolean;
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

type Prediction = {
  id: number;
  userId: number;
  matchId: number;
  prediction: string;
  credits: number;
  isCorrect: boolean | null;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
  match?: Match;
};

type WinnerPayout = {
  id: number;
  userId: number;
  matchDay: number;
  correctPercentage: number;
  predictionsCorrect: number;
  predictionsTotal: number;
  amount: number;
  createdAt: string;
};

export default function UserPredictionHistory() {
  const [activePredictions, setActivePredictions] = useState<Prediction[]>([]);
  const [pastPredictions, setPastPredictions] = useState<Prediction[]>([]);
  const [predictionsByMatchDay, setPredictionsByMatchDay] = useState<Record<number, Prediction[]>>({});
  const [matchDays, setMatchDays] = useState<number[]>([]);

  // Fetch user info
  const { data: user } = useQuery<User>({
    queryKey: ['/api/me'],
  });

  // Fetch all predictions for the current user
  const { data: userPredictions, isLoading: isLoadingPredictions } = useQuery<Prediction[]>({
    queryKey: ['/api/predictions/user'],
    enabled: !!user,
    retry: false,
  });

  // Fetch all matches to enrich the prediction data
  const { data: matches, isLoading: isLoadingMatches } = useQuery<Match[]>({
    queryKey: ['/api/matches'],
  });

  // Fetch user payouts (winnings)
  const { data: userPayouts, isLoading: isLoadingPayouts } = useQuery<WinnerPayout[]>({
    queryKey: ['/api/prizes/user'],
    enabled: !!user,
    retry: false,
  });

  // Process predictions and matches to create enhanced prediction objects
  useEffect(() => {
    if (userPredictions && matches) {
      // Enrich predictions with match data
      const enrichedPredictions = userPredictions.map(prediction => {
        const match = matches.find(m => m.id === prediction.matchId);
        return {
          ...prediction,
          match
        };
      });

      // Separate active and past predictions
      const active: Prediction[] = [];
      const past: Prediction[] = [];
      
      enrichedPredictions.forEach(prediction => {
        if (prediction.match) {
          if (
            isDateInPast(prediction.match.matchDate) && 
            prediction.match.hasResult
          ) {
            past.push(prediction);
          } else {
            active.push(prediction);
          }
        }
      });

      // Group predictions by match day
      const byMatchDay = enrichedPredictions.reduce((acc, prediction) => {
        if (prediction.match) {
          const matchDay = prediction.match.matchDay;
          if (!acc[matchDay]) {
            acc[matchDay] = [];
          }
          acc[matchDay].push(prediction);
        }
        return acc;
      }, {} as Record<number, Prediction[]>);

      // Sort match days
      const sortedMatchDays = Object.keys(byMatchDay)
        .map(Number)
        .sort((a, b) => b - a); // Newest first

      setActivePredictions(active);
      setPastPredictions(past);
      setPredictionsByMatchDay(byMatchDay);
      setMatchDays(sortedMatchDays);
    }
  }, [userPredictions, matches]);

  // Group payouts by match day
  const payoutsByMatchDay = userPayouts?.reduce((acc, payout) => {
    if (!acc[payout.matchDay]) {
      acc[payout.matchDay] = [];
    }
    acc[payout.matchDay].push(payout);
    return acc;
  }, {} as Record<number, WinnerPayout[]>) || {};

  // Prediction display function
  const renderPredictionCard = (prediction: Prediction) => {
    if (!prediction.match) return null;

    const predictionMap: Record<string, string> = {
      "1": "Vittoria Casa",
      "X": "Pareggio",
      "2": "Vittoria Trasferta"
    };

    return (
      <Card key={prediction.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-muted-foreground">
                Giornata {prediction.match.matchDay}
              </div>
              {prediction.isCorrect === null ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> In attesa
                </Badge>
              ) : prediction.isCorrect ? (
                <Badge className="bg-green-600 text-white flex items-center gap-1">
                  <Check className="h-3 w-3" /> Vinto
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <X className="h-3 w-3" /> Perso
                </Badge>
              )}
            </div>
            
            <h3 className="font-medium text-sm">
              {prediction.match.homeTeam} vs {prediction.match.awayTeam}
            </h3>
            
            <div className="text-xs text-muted-foreground mt-1">
              {formatDateToLocalString(prediction.match.matchDate, {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            
            <Separator className="my-3" />
            
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <div className="text-xs text-muted-foreground">Il tuo pronostico</div>
                <div className="font-medium">{predictionMap[prediction.prediction] || prediction.prediction}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Crediti</div>
                <div className="font-medium">{prediction.credits}</div>
              </div>
            </div>
            
            {prediction.match.result && (
              <div className="mt-3 p-2 bg-muted rounded-md">
                <div className="text-xs font-medium mb-1">Risultato finale</div>
                <div className="font-bold">
                  {predictionMap[prediction.match.result] || prediction.match.result}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Payout display function
  const renderPayoutInfo = (matchDay: number) => {
    const payoutsForDay = payoutsByMatchDay[matchDay] || [];
    
    if (payoutsForDay.length === 0) {
      return (
        <div className="mt-4 p-3 bg-muted rounded-md">
          <div className="flex items-center text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mr-2" />
            Nessun premio distribuito per questa giornata
          </div>
        </div>
      );
    }

    return payoutsForDay.map(payout => (
      <div key={payout.id} className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 text-primary mr-2" />
            <div>
              <div className="font-medium">Premio vinto</div>
              <div className="text-xs text-muted-foreground">
                {payout.predictionsCorrect} su {payout.predictionsTotal} corretti ({payout.correctPercentage}%)
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <Coins className="h-4 w-4 text-primary mr-1" />
            <span className="font-bold">{payout.amount} crediti</span>
          </div>
        </div>
      </div>
    ));
  };

  // Loading state
  if (isLoadingPredictions || isLoadingMatches || isLoadingPayouts) {
    return (
      <Card className="shadow-md mb-8">
        <CardHeader>
          <CardTitle>Le mie schedine</CardTitle>
          <CardDescription>
            Visualizza i tuoi pronostici e le tue vincite
          </CardDescription>
          <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-800">
            <p className="font-medium">Sistema premi fissi:</p>
            <ul className="mt-1 space-y-1 pl-2">
              <li>· 100% previsioni corrette = 10 crediti</li>
              <li>· 90% previsioni corrette = 8 crediti</li>
              <li>· 80% previsioni corrette = 6 crediti</li>
            </ul>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No predictions state
  if (!userPredictions || userPredictions.length === 0) {
    return (
      <Card className="shadow-md mb-8">
        <CardHeader>
          <CardTitle>Le mie schedine</CardTitle>
          <CardDescription>
            Visualizza i tuoi pronostici e le tue vincite
          </CardDescription>
          <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-800">
            <p className="font-medium">Sistema premi fissi:</p>
            <ul className="mt-1 space-y-1 pl-2">
              <li>· 100% previsioni corrette = 10 crediti</li>
              <li>· 90% previsioni corrette = 8 crediti</li>
              <li>· 80% previsioni corrette = 6 crediti</li>
            </ul>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Non hai ancora fatto pronostici. Inizia ora!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md mb-8">
      <CardHeader>
        <CardTitle>Le mie schedine</CardTitle>
        <CardDescription>
          Visualizza i tuoi pronostici e le tue vincite
        </CardDescription>
        <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-800">
          <p className="font-medium">Sistema premi fissi:</p>
          <ul className="mt-1 space-y-1 pl-2">
            <li>· 100% previsioni corrette = 10 crediti</li>
            <li>· 90% previsioni corrette = 8 crediti</li>
            <li>· 80% previsioni corrette = 6 crediti</li>
          </ul>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="by-matchday">
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="by-matchday">Per giornata</TabsTrigger>
            <TabsTrigger value="active">Attive ({activePredictions.length})</TabsTrigger>
            <TabsTrigger value="past">Concluse ({pastPredictions.length})</TabsTrigger>
          </TabsList>
          
          {/* Predictions by match day */}
          <TabsContent value="by-matchday">
            {matchDays.length > 0 ? (
              <Tabs defaultValue={matchDays[0].toString()} className="mt-2">
                <TabsList className="mb-4 w-full flex overflow-x-auto">
                  {matchDays.map(day => (
                    <TabsTrigger 
                      key={day}
                      value={day.toString()}
                      className="flex-shrink-0"
                    >
                      Giornata {day}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {matchDays.map(day => (
                  <TabsContent key={day} value={day.toString()}>
                    <h3 className="font-medium text-lg mb-4">Giornata {day}</h3>
                    
                    {/* Show count of predictions for this day */}
                    <div className="text-sm text-muted-foreground mb-4">
                      {predictionsByMatchDay[day]?.length || 0} pronostici in questa giornata
                    </div>
                    
                    {/* Render predictions */}
                    {predictionsByMatchDay[day]?.map(prediction => renderPredictionCard(prediction))}
                    
                    {/* Render payout information */}
                    {renderPayoutInfo(day)}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                Nessuna giornata disponibile
              </div>
            )}
          </TabsContent>
          
          {/* Active predictions */}
          <TabsContent value="active">
            <h3 className="font-medium text-lg mb-4">Pronostici attivi</h3>
            {activePredictions.length > 0 ? (
              <div>
                {activePredictions.map(prediction => renderPredictionCard(prediction))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                Non hai pronostici attivi al momento
              </div>
            )}
          </TabsContent>
          
          {/* Past predictions */}
          <TabsContent value="past">
            <h3 className="font-medium text-lg mb-4">Pronostici conclusi</h3>
            {pastPredictions.length > 0 ? (
              <div>
                {pastPredictions.map(prediction => renderPredictionCard(prediction))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                Non hai pronostici conclusi
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}