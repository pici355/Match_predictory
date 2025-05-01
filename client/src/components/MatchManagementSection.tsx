import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Edit2, Trash2 } from 'lucide-react';
import { formatDateToLocalString } from '@/lib/dateUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Definizione dello schema per il form
const matchFormSchema = z.object({
  homeTeam: z.string().min(1, "Nome squadra di casa obbligatorio"),
  awayTeam: z.string().min(1, "Nome squadra in trasferta obbligatorio"),
  matchDate: z.date({
    required_error: "Data partita obbligatoria",
  }),
  matchDay: z.coerce.number().min(1, "Giornata deve essere un numero maggiore di 0"),
  description: z.string().optional(),
});

type MatchFormValues = z.infer<typeof matchFormSchema>;

type Match = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  matchDay: number;
  description?: string;
  hasResult?: boolean;
  result?: string | null;
  createdAt: string;
};

type Team = {
  id: number;
  name: string;
  logo?: string;
  managerName: string;
  credits: number;
};

export default function MatchManagementSection() {
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const { toast } = useToast();

  // Form per la gestione delle partite
  const matchForm = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      homeTeam: "",
      awayTeam: "",
      matchDay: 1,
      description: "",
    },
  });

  // Fetch partite
  const { 
    data: matches, 
    isLoading: isLoadingMatches,
  } = useQuery<Match[]>({
    queryKey: ['/api/matches'],
  });

  // Fetch squadre per le dropdown
  const { 
    data: teams, 
    isLoading: isLoadingTeams,
  } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  // Create match mutation
  const createMatch = useMutation({
    mutationFn: async (data: MatchFormValues) => {
      // Converti la data in formato ISO
      const matchData = {
        ...data,
        matchDate: data.matchDate.toISOString(),
      };
      const response = await apiRequest("POST", "/api/matches", matchData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      toast({
        title: "Partita aggiunta!",
        description: "La partita è stata aggiunta con successo.",
      });
      matchForm.reset({
        homeTeam: "",
        awayTeam: "",
        matchDay: 1,
        description: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'aggiunta della partita.",
        variant: "destructive",
      });
    }
  });

  // Update match mutation
  const updateMatch = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: MatchFormValues }) => {
      // Converti la data in formato ISO
      const matchData = {
        ...data,
        matchDate: data.matchDate.toISOString(),
      };
      const response = await apiRequest("PATCH", `/api/matches/${id}`, matchData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      toast({
        title: "Partita aggiornata!",
        description: "La partita è stata aggiornata con successo.",
      });
      matchForm.reset({
        homeTeam: "",
        awayTeam: "",
        matchDay: 1,
        description: "",
      });
      setEditingMatchId(null);
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'aggiornamento della partita.",
        variant: "destructive",
      });
    }
  });

  // Delete match mutation
  const deleteMatch = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/matches/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      toast({
        title: "Partita eliminata!",
        description: "La partita è stata eliminata con successo.",
      });
      setEditingMatchId(null);
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'eliminazione della partita.",
        variant: "destructive",
      });
    }
  });

  // Set match result mutation
  const setMatchResult = useMutation({
    mutationFn: async ({ matchId, result }: { matchId: number, result: string }) => {
      const response = await apiRequest("POST", `/api/matches/${matchId}/result`, { result });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      toast({
        title: "Risultato impostato!",
        description: "Il risultato della partita è stato impostato con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'impostazione del risultato.",
        variant: "destructive",
      });
    }
  });

  function onSubmitMatch(data: MatchFormValues) {
    if (editingMatchId) {
      updateMatch.mutate({ id: editingMatchId, data });
    } else {
      createMatch.mutate(data);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingMatchId ? "Modifica partita" : "Aggiungi una nuova partita"}</CardTitle>
          <CardDescription>{editingMatchId ? "Modifica i dettagli della partita" : "Inserisci i dettagli della nuova partita"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...matchForm}>
            <form onSubmit={matchForm.handleSubmit(onSubmitMatch)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Match Day */}
                <FormField
                  control={matchForm.control}
                  name="matchDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giornata</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          placeholder="Es. 1" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Match Date */}
                <FormField
                  control={matchForm.control}
                  name="matchDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Partita</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP HH:mm", { locale: it })
                              ) : (
                                <span>Seleziona data e ora</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                // Preserva l'ora se già impostata
                                const currentDate = field.value || new Date();
                                const newDate = new Date(date);
                                newDate.setHours(currentDate.getHours());
                                newDate.setMinutes(currentDate.getMinutes());
                                field.onChange(newDate);
                              }
                            }}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                          <div className="p-3 border-t">
                            <div className="flex items-center gap-2">
                              <label className="text-sm">Ora:</label>
                              <Input
                                type="time"
                                value={field.value ? format(field.value, "HH:mm") : ""}
                                onChange={(e) => {
                                  const timeValue = e.target.value;
                                  if (timeValue && field.value) {
                                    const [hours, minutes] = timeValue.split(':').map(Number);
                                    const newDate = new Date(field.value);
                                    newDate.setHours(hours);
                                    newDate.setMinutes(minutes);
                                    field.onChange(newDate);
                                  }
                                }}
                                className="w-24"
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Home Team */}
                <FormField
                  control={matchForm.control}
                  name="homeTeam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Squadra di Casa</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona squadra di casa" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams?.map(team => (
                              <SelectItem key={team.id} value={team.name}>
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full overflow-hidden">
                                    {team.logo ? (
                                      <img
                                        src={team.logo}
                                        alt={team.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          const parent = e.currentTarget.parentElement;
                                          if (parent) {
                                            parent.classList.add('bg-primary/20', 'flex', 'items-center', 'justify-center', 'text-primary', 'font-semibold');
                                            parent.innerHTML = `<span class="text-[10px]">${team.name.substring(0, 2).toUpperCase()}</span>`;
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-[10px]">
                                        {team.name.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <span>{team.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Away Team */}
                <FormField
                  control={matchForm.control}
                  name="awayTeam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Squadra in Trasferta</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona squadra in trasferta" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams?.map(team => (
                              <SelectItem key={team.id} value={team.name}>
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full overflow-hidden">
                                    {team.logo ? (
                                      <img
                                        src={team.logo}
                                        alt={team.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          const parent = e.currentTarget.parentElement;
                                          if (parent) {
                                            parent.classList.add('bg-primary/20', 'flex', 'items-center', 'justify-center', 'text-primary', 'font-semibold');
                                            parent.innerHTML = `<span class="text-[10px]">${team.name.substring(0, 2).toUpperCase()}</span>`;
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-[10px]">
                                        {team.name.substring(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <span>{team.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={matchForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione (Opzionale)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Es. Partita di Lega"
                        {...field}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createMatch.isPending || updateMatch.isPending}
                >
                  {createMatch.isPending || updateMatch.isPending 
                    ? "Salvataggio in corso..." 
                    : editingMatchId 
                      ? "Aggiorna Partita" 
                      : "Crea Partita"
                  }
                </Button>
                
                {editingMatchId && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setEditingMatchId(null);
                      matchForm.reset({
                        homeTeam: "",
                        awayTeam: "",
                        matchDay: 1,
                        description: "",
                      });
                    }}
                  >
                    Annulla
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partite</CardTitle>
          <CardDescription>Elenco delle partite programmate</CardDescription>
        </CardHeader>
        <CardContent className="max-h-96 overflow-auto">
          {isLoadingMatches ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : matches && matches.length > 0 ? (
            <div className="border rounded-md overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-sm font-medium text-left">Giornata</th>
                    <th className="px-3 py-2 text-sm font-medium text-left">Data</th>
                    <th className="px-3 py-2 text-sm font-medium text-left">Squadre</th>
                    <th className="px-3 py-2 text-sm font-medium text-left">Risultato</th>
                    <th className="px-3 py-2 text-sm font-medium text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((matchItem) => (
                    <tr key={matchItem.id} className="border-b">
                      <td className="px-3 py-2 text-sm">{matchItem.matchDay}</td>
                      <td className="px-3 py-2 text-sm whitespace-nowrap">
                        {formatDateToLocalString(matchItem.matchDate, {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <div className="flex flex-col gap-1">
                          <div>{matchItem.homeTeam}</div>
                          <div>{matchItem.awayTeam}</div>
                          {matchItem.description && (
                            <div className="text-xs text-gray-500">{matchItem.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {matchItem.hasResult ? (
                          <span className="font-medium">{matchItem.result}</span>
                        ) : (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => setMatchResult.mutate({ matchId: matchItem.id, result: "1" })}
                            >
                              1
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => setMatchResult.mutate({ matchId: matchItem.id, result: "X" })}
                            >
                              X
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => setMatchResult.mutate({ matchId: matchItem.id, result: "2" })}
                            >
                              2
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost" 
                            size="sm"
                            className="h-7 bg-blue-50 hover:bg-blue-100 text-blue-700"
                            onClick={() => {
                              matchForm.reset({
                                homeTeam: matchItem.homeTeam,
                                awayTeam: matchItem.awayTeam,
                                matchDay: matchItem.matchDay,
                                description: matchItem.description || "",
                                matchDate: new Date(matchItem.matchDate),
                              });
                              setEditingMatchId(matchItem.id);
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-1" /> Modifica
                          </Button>
                          <Button 
                            variant="ghost"
                            size="sm"
                            className="h-7 bg-red-50 hover:bg-red-100 text-red-700"
                            disabled={deleteMatch.isPending}
                            onClick={() => {
                              // Verifica che non ci siano previsioni collegate
                              if (confirm(`Sei sicuro di voler eliminare questa partita?\nNota: questa azione potrebbe influenzare i pronostici esistenti.`)) {
                                deleteMatch.mutate(matchItem.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Elimina
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nessuna partita trovata
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}