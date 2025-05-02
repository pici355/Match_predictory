import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import MatchDayReceipt from "./MatchDayReceipt";
import { 
  formatDateToLocalString, 
  isDateInPast,
  USER_TIMEZONE,
  isMatchPredictionEditable,
  getTimeUntilNonEditable
} from "@/lib/dateUtils";
import { 
  Check, 
  X, 
  Clock, 
  Trophy, 
  Coins, 
  AlertCircle,
  Receipt,
  Edit,
  Save
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const [showReceiptForDay, setShowReceiptForDay] = useState<number | null>(null);

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

  const { toast } = useToast();
  
  // Mutation for updating a prediction
  const updatePrediction = useMutation({
    mutationFn: async ({ id, newPrediction }: { id: number, newPrediction: string }) => {
      const response = await apiRequest("PUT", `/api/predictions/${id}`, {
        prediction: newPrediction
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/predictions/user'] });
      toast({
        title: "Pronostico aggiornato!",
        description: "Il tuo pronostico è stato modificato con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'aggiornamento del pronostico.",
        variant: "destructive",
      });
    }
  });

  // Prediction display function
  const renderPredictionCard = (prediction: Prediction) => {
    if (!prediction.match) return null;

    const predictionMap: Record<string, string> = {
      "1": "Vittoria Casa",
      "X": "Pareggio",
      "2": "Vittoria Trasferta"
    };
    
    // Check if prediction is still editable
    const editable = isMatchPredictionEditable(prediction.match.matchDate);

    return (
      <Card key={prediction.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-muted-foreground">
                Giornata {prediction.match.matchDay}
              </div>
              {prediction.isCorrect === true ? (
                <Badge className="bg-green-600 text-white flex items-center gap-1">
                  <Check className="h-3 w-3" /> Vinta
                </Badge>
              ) : prediction.isCorrect === false && prediction.match?.hasResult ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <X className="h-3 w-3" /> Persa
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> In corso
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
              {!editable && 
                <span className="ml-2 text-red-500">(Non modificabile - entro 30 min dall'inizio)</span>
              }
            </div>
            
            <Separator className="my-3" />
            
            <div className="mt-1 flex justify-between items-center">
              <div>
                <div className="text-xs text-muted-foreground">Il tuo pronostico</div>
                <div className="font-medium">{predictionMap[prediction.prediction] || prediction.prediction}</div>
              </div>
              
              {editable && !prediction.match.hasResult && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Modifica
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Modifica pronostico</DialogTitle>
                      <DialogDescription>
                        {prediction.match.homeTeam} vs {prediction.match.awayTeam} - {formatDateToLocalString(prediction.match.matchDate, {
                          weekday: 'long',
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <RadioGroup 
                        defaultValue={prediction.prediction}
                        className="space-y-3"
                        onValueChange={(value) => {
                          updatePrediction.mutate({ 
                            id: prediction.id, 
                            newPrediction: value 
                          });
                        }}
                      >
                        <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted/50">
                          <RadioGroupItem value="1" id="home-win" />
                          <Label htmlFor="home-win" className="flex-1 cursor-pointer">
                            <div className="font-medium">Vittoria Casa</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <div className="w-4 h-4 rounded-full overflow-hidden">
                                <img 
                                  src={`/team-logos/${prediction.match?.homeTeam?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}.jpg`} 
                                  alt={prediction.match?.homeTeam || 'Squadra'}
                                  onError={(e) => {
                                    const fileName = prediction.match?.homeTeam?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
                                    const pngSrc = `/team-logos/${fileName}.png`;
                                    e.currentTarget.src = pngSrc;
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span>({prediction.match?.homeTeam || 'Squadra'})</span>
                            </div>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted/50">
                          <RadioGroupItem value="X" id="draw" />
                          <Label htmlFor="draw" className="flex-1 cursor-pointer">
                            <div className="font-medium">Pareggio</div>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted/50">
                          <RadioGroupItem value="2" id="away-win" />
                          <Label htmlFor="away-win" className="flex-1 cursor-pointer">
                            <div className="font-medium">Vittoria Trasferta</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <div className="w-4 h-4 rounded-full overflow-hidden">
                                <img 
                                  src={`/team-logos/${prediction.match?.awayTeam?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}.jpg`} 
                                  alt={prediction.match?.awayTeam || 'Squadra'}
                                  onError={(e) => {
                                    const fileName = prediction.match?.awayTeam?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
                                    const pngSrc = `/team-logos/${fileName}.png`;
                                    e.currentTarget.src = pngSrc;
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span>({prediction.match?.awayTeam || 'Squadra'})</span>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <DialogFooter className="flex justify-between sm:justify-between">
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline">
                          Annulla
                        </Button>
                      </DialogTrigger>
                      {updatePrediction.isPending ? (
                        <Button disabled>
                          <Save className="h-4 w-4 mr-2 animate-spin" />
                          Salvataggio...
                        </Button>
                      ) : null}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            {prediction.match?.result && (
              <div className="mt-3 p-2 bg-muted rounded-md">
                <div className="text-xs font-medium mb-1">Risultato finale</div>
                <div className="font-bold">
                  {predictionMap[prediction.match.result || ''] || prediction.match.result}
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
            <p className="font-medium">Regole del gioco:</p>
            <ul className="mt-1 space-y-1 pl-2">
              <li>· I pronostici sono completamente gratuiti</li>
              <li>· Minimo 5 partite per schedina</li>
              <li>· Modifiche consentite fino a 30 minuti prima dell'inizio</li>
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
            <p className="font-medium">Regole del gioco:</p>
            <ul className="mt-1 space-y-1 pl-2">
              <li>· I pronostici sono completamente gratuiti</li>
              <li>· Minimo 5 partite per schedina</li>
              <li>· Modifiche consentite fino a 30 minuti prima dell'inizio</li>
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
          <p className="font-medium">Regole del gioco:</p>
          <ul className="mt-1 space-y-1 pl-2">
            <li>· I pronostici sono completamente gratuiti</li>
            <li>· Minimo 5 partite per schedina</li>
            <li>· Modifiche consentite fino a 30 minuti prima dell'inizio</li>
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
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-lg mb-4">Giornata {day}</h3>
                      
                      {predictionsByMatchDay[day]?.length >= 1 && (
                        <Button 
                          variant={predictionsByMatchDay[day]?.length >= 5 ? "outline" : "ghost"}
                          size="sm"
                          className={`mb-4 flex items-center gap-1 ${predictionsByMatchDay[day]?.length < 5 ? 'text-gray-400 border-gray-200' : ''}`}
                          onClick={() => setShowReceiptForDay(showReceiptForDay === day ? null : day)}
                          disabled={predictionsByMatchDay[day]?.length < 5}
                          title={predictionsByMatchDay[day]?.length < 5 ? "Devi pronosticare almeno 5 partite" : ""}
                        >
                          <Receipt className="h-4 w-4" />
                          {showReceiptForDay === day ? 'Nascondi schedina' : 'Visualizza schedina'}
                          {predictionsByMatchDay[day]?.length < 5 && (
                            <span className="ml-1 text-xs">
                              (Min. 5 partite)
                            </span>
                          )}
                        </Button>
                      )}
                    </div>
                    
                    {/* Show count of predictions for this day */}
                    <div className="text-sm text-muted-foreground mb-4">
                      {predictionsByMatchDay[day]?.length || 0} pronostici in questa giornata
                    </div>
                    
                    {/* Show receipt for this match day */}
                    {showReceiptForDay === day && user && predictionsByMatchDay[day]?.length >= 5 ? (
                      <MatchDayReceipt 
                        matchDay={day}
                        predictions={predictionsByMatchDay[day] || []}
                        username={user.username}
                      />
                    ) : showReceiptForDay === day && predictionsByMatchDay[day]?.length < 5 && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <div className="flex items-center text-amber-700">
                          <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                          <div>
                            <p className="font-medium">Impossibile generare la schedina</p>
                            <p className="text-sm mt-1">Devi aver pronosticato almeno 5 partite in questa giornata.</p>
                            <p className="text-sm mt-1">Attualmente hai pronosticato {predictionsByMatchDay[day]?.length || 0} partite.</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
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