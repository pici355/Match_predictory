import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { predictSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const formSchema = predictSchema.extend({
  name: z.string().min(1, { message: "Il nome è obbligatorio" }),
  matchId: z.coerce.number({
    required_error: "Seleziona una partita",
    invalid_type_error: "Seleziona una partita valida",
  }),
  prediction: z.enum(["1", "X", "2"], {
    required_error: "Seleziona un pronostico",
  }),
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
  const [submissionResult, setSubmissionResult] = useState<{ name: string; prediction: string; matchId: number } | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      matchId: undefined,
      prediction: undefined,
    },
  });

  // Fetch available matches
  const { data: matches, isLoading: isLoadingMatches } = useQuery<Match[]>({
    queryKey: ['/api/matches'],
  });

  // Submit prediction mutation
  const submitPrediction = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/predictions", data);
      return response.json();
    },
    onSuccess: (data) => {
      setSubmissionResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/predictions'] });
      toast({
        title: "Pronostico inviato!",
        description: "Il tuo pronostico è stato registrato con successo.",
      });
      form.reset();
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
  useState(() => {
    if (watchMatchId && matches) {
      const match = matches.find(m => m.id === watchMatchId);
      if (match) {
        setSelectedMatch(match);
      }
    }
  });

  return (
    <Card className="mb-8 shadow-md">
      <CardContent className="pt-6">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-center text-primary">FantaSchedina</h1>
          <h2 className="text-xl font-semibold text-center mt-2">Pronostica il risultato della partita</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-medium">Il tuo nome</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Inserisci il tuo nome" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 text-sm" />
                </FormItem>
              )}
            />

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
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleziona una partita" />
                        </SelectTrigger>
                        <SelectContent>
                          {matches && matches.length > 0 ? (
                            matches.map(match => (
                              <SelectItem key={match.id} value={match.id.toString()}>
                                {match.homeTeam} vs {match.awayTeam} (Giornata {match.matchDay})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-matches" disabled>Nessuna partita disponibile</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage className="text-red-500 text-sm" />
                </FormItem>
              )}
            />

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

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full py-3 px-4 bg-primary text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition shadow-sm"
                disabled={submitPrediction.isPending || isLoadingMatches || !matches || matches.length === 0}
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
                <span>{submissionResult.name}</span>: <span className="font-bold">{submissionResult.prediction}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
