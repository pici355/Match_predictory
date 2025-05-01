import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { predictSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatDateToLocalString, isMatchPredictionEditable } from "@/lib/dateUtils";

// Custom form schema that extends the predict schema
const formSchema = predictSchema.extend({
  matchId: z.coerce.number({
    required_error: "Seleziona una partita",
    invalid_type_error: "Seleziona una partita valida",
  }),
  prediction: z.enum(["1", "X", "2"], {
    required_error: "Seleziona un pronostico",
  }),
  // Valore fisso per i crediti
  credits: z.number().default(1),
});

type FormValues = z.infer<typeof formSchema>;
type Match = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  matchDay: number;
  description?: string;
};

export default function PredictionForm() {
  const [submissionResult, setSubmissionResult] = useState<Partial<FormValues> | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedMatchDay, setSelectedMatchDay] = useState<number | null>(null);
  const [allPredicted, setAllPredicted] = useState(false);
  const [predictionsRemaining, setPredictionsRemaining] = useState(5);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: 0, // This will be overridden by the server
      matchId: undefined,
      prediction: undefined,
      credits: 1, // Valore fisso per le scommesse
    },
  });

  // Fetch available matches
  const { data: matches, isLoading: isLoadingMatches } = useQuery<Match[]>({
    queryKey: ['/api/matches'],
  });

  // Fetch user predictions
  const { data: userPredictions, isLoading: isLoadingPredictions } = useQuery({
    queryKey: ['/api/predictions/user'],
    retry: (failureCount, error: any) => {
      // Don't retry if user is not authenticated
      if (error?.status === 401) return false;
      return failureCount < 3;
    }
  });

  // Group matches by match day for easier selection
  const matchesByDay = matches ? 
    matches.reduce((acc: Record<number, Match[]>, match) => {
      acc[match.matchDay] = acc[match.matchDay] || [];
      acc[match.matchDay].push(match);
      return acc;
    }, {}) : {};

  // Get available match days
  const matchDays = Object.keys(matchesByDay).map(Number).sort((a, b) => a - b);

  // Check if enough matches in a match day have predictions (minimum 5)
  useEffect(() => {
    if (selectedMatchDay && matches && userPredictions && Array.isArray(userPredictions)) {
      const matchesForDay = matches.filter(m => m.matchDay === selectedMatchDay);
      const predictionsForDay = userPredictions.filter((p) => 
        matchesForDay.some(m => m.id === p.matchId)
      );
      
      // Calculate how many more predictions are needed to reach minimum of 5
      const predictionsNeeded = 5 - predictionsForDay.length;
      setPredictionsRemaining(predictionsNeeded > 0 ? predictionsNeeded : 0);
      
      // All predicted if we have at least 5 predictions for this match day
      setAllPredicted(predictionsForDay.length >= 5);
    }
  }, [selectedMatchDay, matches, userPredictions]);

  // Filtered matches based on selected match day
  const filteredMatches = selectedMatchDay && matches ? 
    matches.filter(match => match.matchDay === selectedMatchDay) : [];

  // Submit prediction mutation
  const submitPrediction = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/predictions", data);
      return response.json();
    },
    onSuccess: (data) => {
      setSubmissionResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/predictions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/predictions/user'] });
      toast({
        title: "Pronostico inviato!",
        description: "Il tuo pronostico è stato registrato con successo.",
      });
      form.reset({ credits: 1 }); // Reset ma mantiene il valore fisso dei crediti
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'invio del pronostico.",
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: FormValues) {
    submitPrediction.mutate(data);
  }

  const predictionOptions = [
    { value: "1", label: "Vince Squadra Casa" },
    { value: "X", label: "Pareggio" },
    { value: "2", label: "Vince Squadra Ospite" },
  ];

  // Update selected match when matchId changes
  const watchMatchId = form.watch("matchId");
  useEffect(() => {
    if (watchMatchId && matches) {
      const match = matches.find(m => m.id === watchMatchId);
      if (match) {
        setSelectedMatch(match);
      }
    }
  }, [watchMatchId, matches]);

  return (
    <Card className="mb-8 shadow-md">
      <CardContent className="pt-6">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-center text-primary">FantaSchedina</h1>
          <h2 className="text-xl font-semibold text-center mt-2">Pronostica i risultati delle partite</h2>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
            <h3 className="text-md font-semibold text-blue-800">Sistema premi</h3>
            <ul className="mt-1 text-sm text-blue-700">
              <li className="flex items-center">
                <span className="inline-block w-4 h-4 mr-1 rounded-full bg-blue-800 text-white text-xs text-center">✓</span> 
                I pronostici sono completamente gratuiti
              </li>
              <li className="text-xs mt-1 text-blue-600">
                Pronosticare almeno 5 partite per giornata. Tutti i pronostici sono gratuiti.
              </li>
            </ul>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Match Day Selection */}
            <div className="space-y-2">
              <label className="font-medium">Seleziona giornata</label>
              <Select
                onValueChange={(value) => {
                  const matchDay = parseInt(value);
                  setSelectedMatchDay(matchDay);
                  // Reset the match selection when changing match day
                  form.setValue("matchId", undefined as any);
                  setSelectedMatch(null);
                }}
                value={selectedMatchDay?.toString()}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona giornata" />
                </SelectTrigger>
                <SelectContent>
                  {matchDays.length > 0 ? (
                    matchDays.map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        Giornata {day}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-days" disabled>Nessuna giornata disponibile</SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              {selectedMatchDay && (
                <div className="mt-2">
                  {allPredicted ? (
                    <div className="text-green-600 font-medium flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Complimenti! Hai pronosticato tutte le 5 partite di questa giornata.
                    </div>
                  ) : (
                    <div>
                      <div className="text-amber-600 font-medium">
                        Devi pronosticare minimo 5 partite per questa giornata.
                        {predictionsRemaining > 0 && (
                          <span className="ml-1">Ancora {predictionsRemaining} da pronosticare.</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <div 
                            key={i}
                            className={`h-2 w-1/5 rounded-sm ${
                              i < 5 - predictionsRemaining ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Match Selection */}
            <FormField
              control={form.control}
              name="matchId"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-medium">Seleziona la partita</FormLabel>
                  <FormControl>
                    {isLoadingMatches ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                          const match = matches?.find(m => m.id === parseInt(value));
                          if (match) setSelectedMatch(match);
                        }}
                        value={field.value?.toString()}
                        disabled={!selectedMatchDay || filteredMatches.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={
                            !selectedMatchDay 
                              ? "Prima seleziona una giornata" 
                              : allPredicted 
                                ? "Hai già pronosticato tutte le partite di questa giornata!" 
                                : "Seleziona una partita"
                          } />
                        </SelectTrigger>
                        <SelectContent className="max-w-none w-[400px]">
                          {filteredMatches.length > 0 ? (
                            filteredMatches.map(match => {
                              // Check if user already predicted this match
                              const alreadyPredicted = userPredictions && Array.isArray(userPredictions) && userPredictions.some(
                                (p) => p.matchId === match.id
                              );
                              
                              return (
                                <SelectItem 
                                  key={match.id} 
                                  value={match.id.toString()}
                                  disabled={!!alreadyPredicted}
                                  className="p-0 focus:bg-slate-100"
                                >
                                  <div className="flex flex-col w-full p-2">
                                    {/* Layout completamente rivisto per evitare i contenuti dai bordi */}
                                    <div className="grid grid-cols-5 items-center w-full">
                                      {/* Home Team - Layout fisso */}
                                      <div className="col-span-2 flex items-center gap-2 overflow-hidden">
                                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                          <img 
                                            src={`/team-logos/${match.homeTeam.toLowerCase().replace(/\s+/g, '-')}.jpg`} 
                                            alt={match.homeTeam}
                                            onError={(e) => {
                                              // Prova prima con .png
                                              const fileName = match.homeTeam.toLowerCase().replace(/\s+/g, '-');
                                              const pngSrc = `/team-logos/${fileName}.png`;
                                              
                                              // Cambia il src dell'immagine per provare con .png
                                              e.currentTarget.src = pngSrc;
                                              
                                              // Se ancora fallisce, mostra le iniziali
                                              e.currentTarget.onerror = () => {
                                                const parent = e.currentTarget.parentElement;
                                                if (parent) {
                                                  // Remove the img element
                                                  parent.removeChild(e.currentTarget);
                                                  // Update parent styling
                                                  parent.className = 'w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0';
                                                  // Add the text directly
                                                  parent.textContent = match.homeTeam.substring(0, 2).toUpperCase();
                                                }
                                              };
                                            }}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <span className="truncate font-medium text-sm">{match.homeTeam}</span>
                                      </div>
                                      
                                      {/* VS - Spazio dedicato e centrato */}
                                      <div className="text-gray-500 flex-shrink-0 text-center font-bold text-sm">VS</div>
                                      
                                      {/* Away Team - Layout fisso */}
                                      <div className="col-span-2 flex items-center justify-end gap-2 overflow-hidden">
                                        <span className="truncate font-medium text-sm text-right">{match.awayTeam}</span>
                                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                          <img 
                                            src={`/team-logos/${match.awayTeam.toLowerCase().replace(/\s+/g, '-')}.jpg`} 
                                            alt={match.awayTeam}
                                            onError={(e) => {
                                              // Prova prima con .png
                                              const fileName = match.awayTeam.toLowerCase().replace(/\s+/g, '-');
                                              const pngSrc = `/team-logos/${fileName}.png`;
                                              
                                              // Cambia il src dell'immagine per provare con .png
                                              e.currentTarget.src = pngSrc;
                                              
                                              // Se ancora fallisce, mostra le iniziali
                                              e.currentTarget.onerror = () => {
                                                const parent = e.currentTarget.parentElement;
                                                if (parent) {
                                                  // Remove the img element
                                                  parent.removeChild(e.currentTarget);
                                                  // Update parent styling
                                                  parent.className = 'w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0';
                                                  // Add the text directly
                                                  parent.textContent = match.awayTeam.substring(0, 2).toUpperCase();
                                                }
                                              };
                                            }}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {!!alreadyPredicted && (
                                      <div className="text-gray-400 text-xs text-center mt-1">
                                        (già pronosticata)
                                      </div>
                                    )}
                                    
                                    {/* Informazioni aggiuntive */}
                                    <div className="mt-1 grid grid-cols-2 gap-2">
                                      <div className="text-xs text-gray-500">
                                        {formatDateToLocalString(match.matchDate, {
                                          weekday: 'short',
                                          day: '2-digit',
                                          month: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                        {!isMatchPredictionEditable(match.matchDate) && 
                                          <span className="ml-1 text-red-500 font-medium">(Chiuso)</span>
                                        }
                                      </div>
                                      
                                      {match.description && (
                                        <div className="text-xs text-indigo-600 font-medium text-right">
                                          {match.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })
                          ) : (
                            <SelectItem value="no-matches" disabled>
                              {selectedMatchDay ? "Nessuna partita disponibile" : "Seleziona prima una giornata"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage className="text-red-500 text-sm" />
                </FormItem>
              )}
            />

            {/* Match Details */}
            {selectedMatch && (
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <h3 className="font-medium text-gray-700">Dettagli partita:</h3>
                <div className="mt-1 text-sm">
                  <div>
                    <span className="font-semibold">Data:</span> {formatDateToLocalString(selectedMatch.matchDate, {
                      weekday: 'long',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {!isMatchPredictionEditable(selectedMatch.matchDate) && 
                      <span className="ml-2 text-red-500 font-medium">(Chiuso)</span>
                    }
                  </div>
                  <div className="mt-2">
                    <span className="font-semibold mb-1 block">Squadre:</span>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden">
                          <img 
                            src={`/team-logos/${selectedMatch.homeTeam.toLowerCase().replace(/\s+/g, '-')}.jpg`} 
                            alt={selectedMatch.homeTeam}
                            onError={(e) => {
                              // Prova prima con .png
                              const fileName = selectedMatch.homeTeam.toLowerCase().replace(/\s+/g, '-');
                              const pngSrc = `/team-logos/${fileName}.png`;
                              
                              // Cambia il src dell'immagine per provare con .png
                              e.currentTarget.src = pngSrc;
                              
                              // Se ancora fallisce, mostra le iniziali
                              e.currentTarget.onerror = () => {
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  // Remove the img element
                                  parent.removeChild(e.currentTarget);
                                  // Update parent styling
                                  parent.className = 'w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-[10px]';
                                  // Add the text directly
                                  parent.textContent = selectedMatch.homeTeam.substring(0, 2).toUpperCase();
                                }
                              };
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span>{selectedMatch.homeTeam}</span>
                      </div>
                      <span className="text-gray-500">vs</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden">
                          <img 
                            src={`/team-logos/${selectedMatch.awayTeam.toLowerCase().replace(/\s+/g, '-')}.jpg`} 
                            alt={selectedMatch.awayTeam}
                            onError={(e) => {
                              // Prova prima con .png
                              const fileName = selectedMatch.awayTeam.toLowerCase().replace(/\s+/g, '-');
                              const pngSrc = `/team-logos/${fileName}.png`;
                              
                              // Cambia il src dell'immagine per provare con .png
                              e.currentTarget.src = pngSrc;
                              
                              // Se ancora fallisce, mostra le iniziali
                              e.currentTarget.onerror = () => {
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  // Remove the img element
                                  parent.removeChild(e.currentTarget);
                                  // Update parent styling
                                  parent.className = 'w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-[10px]';
                                  // Add the text directly
                                  parent.textContent = selectedMatch.awayTeam.substring(0, 2).toUpperCase();
                                }
                              };
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span>{selectedMatch.awayTeam}</span>
                      </div>
                    </div>
                  </div>
                  {selectedMatch.description && (
                    <div className="mt-2"><span className="font-semibold">Descrizione:</span> {selectedMatch.description}</div>
                  )}
                </div>
              </div>
            )}

            {/* Prediction Selection */}
            <FormField
              control={form.control}
              name="prediction"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-medium">Il tuo pronostico</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-3"
                    >
                      {predictionOptions.map((option) => (
                        <div key={option.value} className="prediction-option">
                          <label 
                            htmlFor={`prediction-${option.value}`}
                            className={`flex items-center p-3 border ${field.value === option.value ? 'border-primary bg-primary/5' : 'border-gray-200'} rounded-md hover:bg-gray-50 cursor-pointer transition group`}
                          >
                            <FormControl>
                              <RadioGroupItem 
                                value={option.value} 
                                id={`prediction-${option.value}`}
                                className="sr-only"
                              />
                            </FormControl>
                            <div className="relative">
                              <div className={`w-5 h-5 border-2 rounded-full ${field.value === option.value ? 'border-primary border-4' : 'border-gray-300'}`}></div>
                            </div>
                            <div className="ml-3 font-medium group-hover:text-primary peer-checked:text-primary">
                              {option.label}
                              {selectedMatch && option.value === "1" && (
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-4 h-4 rounded-full overflow-hidden">
                                    <img 
                                      src={`/team-logos/${selectedMatch.homeTeam.toLowerCase().replace(/\s+/g, '-')}.jpg`} 
                                      alt={selectedMatch.homeTeam}
                                      onError={(e) => {
                                        // Prova prima con .png
                                        const fileName = selectedMatch.homeTeam.toLowerCase().replace(/\s+/g, '-');
                                        const pngSrc = `/team-logos/${fileName}.png`;
                                        
                                        // Cambia il src dell'immagine per provare con .png
                                        e.currentTarget.src = pngSrc;
                                        
                                        // Se ancora fallisce, mostra le iniziali
                                        e.currentTarget.onerror = () => {
                                          const parent = e.currentTarget.parentElement;
                                          if (parent) {
                                            // Remove the img element
                                            parent.removeChild(e.currentTarget);
                                            // Update parent styling
                                            parent.className = 'w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-[8px]';
                                            // Add the text directly
                                            parent.textContent = selectedMatch.homeTeam.substring(0, 2).toUpperCase();
                                          }
                                        };
                                      }}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span className="text-sm text-gray-600">({selectedMatch.homeTeam})</span>
                                </div>
                              )}
                              {selectedMatch && option.value === "2" && (
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-4 h-4 rounded-full overflow-hidden">
                                    <img 
                                      src={`/team-logos/${selectedMatch.awayTeam.toLowerCase().replace(/\s+/g, '-')}.jpg`} 
                                      alt={selectedMatch.awayTeam}
                                      onError={(e) => {
                                        // Prova prima con .png
                                        const fileName = selectedMatch.awayTeam.toLowerCase().replace(/\s+/g, '-');
                                        const pngSrc = `/team-logos/${fileName}.png`;
                                        
                                        // Cambia il src dell'immagine per provare con .png
                                        e.currentTarget.src = pngSrc;
                                        
                                        // Se ancora fallisce, mostra le iniziali
                                        e.currentTarget.onerror = () => {
                                          const parent = e.currentTarget.parentElement;
                                          if (parent) {
                                            // Remove the img element
                                            parent.removeChild(e.currentTarget);
                                            // Update parent styling
                                            parent.className = 'w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-[8px]';
                                            // Add the text directly
                                            parent.textContent = selectedMatch.awayTeam.substring(0, 2).toUpperCase();
                                          }
                                        };
                                      }}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span className="text-sm text-gray-600">({selectedMatch.awayTeam})</span>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="text-red-500 text-sm" />
                </FormItem>
              )}
            />

            {/* Hidden credits field - impostato fisso a 1 */}
            <input type="hidden" name="credits" value="1" />

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full py-3 px-4 bg-primary text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition shadow-sm"
                disabled={
                  submitPrediction.isPending || 
                  isLoadingMatches || 
                  !matches || 
                  matches.length === 0 || 
                  !selectedMatch
                }
              >
                {submitPrediction.isPending ? "Invio in corso..." : "Invia il pronostico"}
              </Button>
            </div>
          </form>
        </Form>

        {submissionResult && (
          <div className="mt-8">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800">Pronostico Registrato</h3>
              <div className="mt-2 text-green-700">
                <div>Risultato: <span className="font-bold">{submissionResult.prediction}</span></div>
                {/* I crediti sono ora fissi a 1 */}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
