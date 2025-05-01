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
import { Slider } from "@/components/ui/slider";
import { predictSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Custom form schema that extends the predict schema
const formSchema = predictSchema.extend({
  matchId: z.coerce.number({
    required_error: "Seleziona una partita",
    invalid_type_error: "Seleziona una partita valida",
  }),
  prediction: z.enum(["1", "X", "2"], {
    required_error: "Seleziona un pronostico",
  }),
  credits: z.number({
    required_error: "Assegna i crediti",
    invalid_type_error: "I crediti devono essere un numero",
  }).min(2, { message: "Minimo 2 crediti" }).max(8, { message: "Massimo 8 crediti" }),
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
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: 0, // This will be overridden by the server
      matchId: undefined,
      prediction: undefined,
      credits: 2, // Default value
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

  // Check if all matches in a match day have predictions
  useEffect(() => {
    if (selectedMatchDay && matches && userPredictions) {
      const matchesForDay = matches.filter(m => m.matchDay === selectedMatchDay);
      const predictionsForDay = userPredictions.filter((p: any) => 
        matchesForDay.some(m => m.id === p.matchId)
      );
      
      setAllPredicted(matchesForDay.length > 0 && predictionsForDay.length === matchesForDay.length);
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
      form.reset({ credits: 2 }); // Reset but keep the credits slider at its default
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
                        <SelectContent>
                          {filteredMatches.length > 0 ? (
                            filteredMatches.map(match => {
                              // Check if user already predicted this match
                              const alreadyPredicted = userPredictions && userPredictions.some(
                                (p: any) => p.matchId === match.id
                              );
                              
                              return (
                                <SelectItem 
                                  key={match.id} 
                                  value={match.id.toString()}
                                  disabled={alreadyPredicted}
                                >
                                  {match.homeTeam} vs {match.awayTeam} 
                                  {alreadyPredicted && " (già pronosticata)"}
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
                  <div><span className="font-semibold">Data:</span> {new Date(selectedMatch.matchDate).toLocaleString('it-IT')}</div>
                  <div><span className="font-semibold">Squadre:</span> {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}</div>
                  {selectedMatch.description && (
                    <div><span className="font-semibold">Descrizione:</span> {selectedMatch.description}</div>
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
                          <label className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition group">
                            <FormControl>
                              <RadioGroupItem 
                                value={option.value} 
                                id={option.value}
                                className="sr-only peer"
                              />
                            </FormControl>
                            <div className="relative">
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full peer-checked:border-primary peer-checked:border-4"></div>
                            </div>
                            <span className="ml-3 font-medium group-hover:text-primary peer-checked:text-primary">
                              {option.label} {selectedMatch && option.value === "1" && `(${selectedMatch.homeTeam})`}
                              {selectedMatch && option.value === "2" && `(${selectedMatch.awayTeam})`}
                            </span>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="text-red-500 text-sm" />
                </FormItem>
              )}
            />

            {/* Credits Slider */}
            <FormField
              control={form.control}
              name="credits"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className="flex justify-between items-center">
                    <FormLabel className="font-medium">Crediti</FormLabel>
                    <span className="font-bold text-lg text-primary">{field.value}</span>
                  </div>
                  <FormControl>
                    <Slider
                      min={2}
                      max={8}
                      step={1}
                      value={[field.value]}
                      onValueChange={(values) => field.onChange(values[0])}
                      className="pt-2"
                    />
                  </FormControl>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>2</span>
                    <span>8</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Assegna da 2 a 8 crediti a questo pronostico in base alla tua fiducia nel risultato.
                  </p>
                  <FormMessage className="text-red-500 text-sm" />
                </FormItem>
              )}
            />

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
                <div>Crediti assegnati: <span className="font-bold">{submissionResult.credits}</span></div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
