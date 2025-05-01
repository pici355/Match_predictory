import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDateToLocalString, DEFAULT_TIMEZONE } from '@/lib/dateUtils';

// Schema definitions
const matchFormSchema = z.object({
  homeTeam: z.string().min(1, "Squadra casa è obbligatoria"),
  awayTeam: z.string().min(1, "Squadra ospite è obbligatoria"),
  matchDate: z.date(),
  matchDay: z.number().min(1, "Giornata deve essere almeno 1"),
  description: z.string().optional(),
});

const userFormSchema = z.object({
  username: z.string().min(1, "Nome utente è obbligatorio"),
  pin: z.string().min(4, "PIN deve essere di almeno 4 caratteri"),
  isAdmin: z.boolean().default(false),
});

const matchResultFormSchema = z.object({
  matchId: z.number(),
  result: z.enum(["1", "X", "2"]),
});

const teamFormSchema = z.object({
  name: z.string().min(1, "Nome squadra è obbligatorio"),
  managerName: z.string().min(1, "Nome allenatore è obbligatorio"),
  credits: z.number().min(0, "I crediti non possono essere negativi"),
  logo: z.string().optional(),
});

// Type definitions
type MatchFormValues = z.infer<typeof matchFormSchema>;
type UserFormValues = z.infer<typeof userFormSchema>;
type MatchResultFormValues = z.infer<typeof matchResultFormSchema>;
type TeamFormValues = z.infer<typeof teamFormSchema>;

type Match = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  matchDay: number;
  description?: string;
  result?: string;
  hasResult: boolean;
  createdAt: string;
};

type User = {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
};

type PrizeDistribution = {
  id: number;
  matchDay: number;
  totalPot: number;
  potFor4Correct: number;
  potFor5Correct: number;
  users4Correct: number;
  users5Correct: number;
  isDistributed: boolean;
};

type Team = {
  id: number;
  name: string;
  logo?: string;
  managerName: string;
  credits: number;
  createdAt: string;
};

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedMatchDay, setSelectedMatchDay] = useState<number | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const { toast } = useToast();

  // ======== FORMS ========
  // Match form
  const matchForm = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      homeTeam: "",
      awayTeam: "",
      matchDate: new Date(),
      matchDay: 1,
      description: "",
    },
  });

  // User form
  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      pin: "",
      isAdmin: false,
    },
  });

  // Match result form
  const resultForm = useForm<MatchResultFormValues>({
    resolver: zodResolver(matchResultFormSchema),
    defaultValues: {
      matchId: undefined,
      result: undefined,
    },
  });

  // Team form
  const teamForm = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: "",
      managerName: "",
      credits: 0,
      logo: "",
    },
  });

  // ======== QUERIES ========
  // Fetch matches
  const { 
    data: matches, 
    isLoading: isLoadingMatches 
  } = useQuery<Match[]>({
    queryKey: ['/api/matches'],
  });

  // Fetch users
  const { 
    data: users, 
    isLoading: isLoadingUsers 
  } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Fetch prize distribution for selected match day
  const {
    data: prizeDistribution,
    isLoading: isLoadingPrize,
    refetch: refetchPrize,
  } = useQuery<PrizeDistribution>({
    queryKey: ['/api/prizes/matchday', selectedMatchDay],
    enabled: !!selectedMatchDay,
  });
  
  // Fetch teams
  const { 
    data: teams, 
    isLoading: isLoadingTeams,
    refetch: refetchTeams
  } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  // ======== MUTATIONS ========
  // Create match mutation
  const createMatch = useMutation({
    mutationFn: async (data: MatchFormValues) => {
      console.log("Sending match data:", data);
      const response = await apiRequest("POST", "/api/matches", data);
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
        matchDate: new Date(),
        matchDay: matchForm.getValues("matchDay"),
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

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Utente aggiunto!",
        description: "L'utente è stato aggiunto con successo.",
      });
      userForm.reset({
        username: "",
        pin: "",
        isAdmin: false,
      });
      setEditingUserId(null);
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'aggiunta dell'utente.",
        variant: "destructive",
      });
    }
  });

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: UserFormValues }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Utente aggiornato!",
        description: "L'utente è stato aggiornato con successo.",
      });
      userForm.reset({
        username: "",
        pin: "",
        isAdmin: false,
      });
      setEditingUserId(null);
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'aggiornamento dell'utente.",
        variant: "destructive",
      });
    }
  });
  
  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Utente eliminato!",
        description: "L'utente è stato eliminato con successo.",
      });
      setEditingUserId(null);
      userForm.reset({
        username: "",
        pin: "",
        isAdmin: false,
      });
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'eliminazione dell'utente.",
        variant: "destructive",
      });
    }
  });

  // Update match result mutation
  const updateMatchResult = useMutation({
    mutationFn: async (data: MatchResultFormValues) => {
      const { matchId, result } = data;
      const response = await apiRequest("POST", `/api/matches/${matchId}/result`, { result });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      toast({
        title: "Risultato aggiornato!",
        description: "Il risultato della partita è stato aggiornato con successo.",
      });
      resultForm.reset({
        matchId: undefined,
        result: undefined,
      });
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'aggiornamento del risultato.",
        variant: "destructive",
      });
    }
  });

  // Upload Excel file mutation
  const uploadExcel = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/matches/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text || response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      toast({
        title: "Importazione completata!",
        description: `${data.matches.length} partite importate con successo.`,
      });
      setFile(null);
    },
    onError: (error) => {
      toast({
        title: "Errore di importazione!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'importazione del file Excel.",
        variant: "destructive",
      });
    }
  });

  // Calculate prize distribution mutation
  const calculatePrize = useMutation({
    mutationFn: async (matchDay: number) => {
      const response = await apiRequest("POST", `/api/prizes/matchday/${matchDay}/calculate`, {});
      return response.json();
    },
    onSuccess: () => {
      refetchPrize();
      toast({
        title: "Distribuzione dei premi calcolata!",
        description: "La distribuzione dei premi è stata calcolata con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante il calcolo della distribuzione dei premi.",
        variant: "destructive",
      });
    }
  });

  // Distribute prizes mutation
  const distributePrizes = useMutation({
    mutationFn: async (matchDay: number) => {
      const response = await apiRequest("POST", `/api/prizes/matchday/${matchDay}/distribute`, {});
      return response.json();
    },
    onSuccess: () => {
      refetchPrize();
      toast({
        title: "Premi distribuiti!",
        description: "I premi sono stati distribuiti con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante la distribuzione dei premi.",
        variant: "destructive",
      });
    }
  });
  
  // Create team mutation
  const createTeam = useMutation({
    mutationFn: async (data: TeamFormValues) => {
      const response = await apiRequest("POST", "/api/teams", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Squadra aggiunta!",
        description: "La squadra è stata aggiunta con successo.",
      });
      teamForm.reset({
        name: "",
        managerName: "",
        credits: 0,
        logo: "",
      });
      setTeamLogoFile(null);
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'aggiunta della squadra.",
        variant: "destructive",
      });
    }
  });
  
  // Update team mutation
  const updateTeam = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: TeamFormValues }) => {
      const response = await apiRequest("PATCH", `/api/teams/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Squadra aggiornata!",
        description: "La squadra è stata aggiornata con successo.",
      });
      teamForm.reset({
        name: "",
        managerName: "",
        credits: 0,
        logo: "",
      });
      setEditingTeamId(null);
      setTeamLogoFile(null);
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'aggiornamento della squadra.",
        variant: "destructive",
      });
    }
  });
  
  // Delete team mutation
  const deleteTeam = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/teams/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Squadra eliminata!",
        description: "La squadra è stata eliminata con successo.",
      });
      setEditingTeamId(null);
      teamForm.reset({
        name: "",
        managerName: "",
        credits: 0,
        logo: "",
      });
      setTeamLogoFile(null);
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'eliminazione della squadra.",
        variant: "destructive",
      });
    }
  });

  // ======== HANDLERS ========
  function onSubmitMatch(data: MatchFormValues) {
    createMatch.mutate(data);
  }

  function onSubmitUser(data: UserFormValues) {
    if (editingUserId) {
      // If we're editing an existing user
      updateUser.mutate({ id: editingUserId, data });
    } else {
      // If we're creating a new user
      createUser.mutate(data);
    }
  }

  function onSubmitResult(data: MatchResultFormValues) {
    updateMatchResult.mutate(data);
  }

  function onSubmitExcel(e: React.FormEvent) {
    e.preventDefault();
    if (file) {
      uploadExcel.mutate(file);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  }
  
  function onSubmitTeam(data: TeamFormValues) {
    if (editingTeamId) {
      updateTeam.mutate({ id: editingTeamId, data });
    } else {
      createTeam.mutate(data);
    }
  }
  
  function handleTeamLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTeamLogoFile(file);
      
      // Preview and prepare for upload
      const reader = new FileReader();
      reader.onload = function(event) {
        if (event.target && event.target.result) {
          teamForm.setValue('logo', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Pannello di Amministrazione</h1>
      
      <Accordion type="multiple" defaultValue={["matches", "users", "teams", "prizes"]} className="space-y-6">
        {/* Match management section */}
        <AccordionItem value="matches" className="border rounded-lg overflow-hidden shadow-sm">
          <AccordionTrigger className="p-4 bg-gray-50 hover:bg-gray-100">
            <h2 className="text-xl font-bold text-left">Gestione Partite</h2>
          </AccordionTrigger>
          <AccordionContent className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aggiungi Partita</CardTitle>
                  <CardDescription>Inserisci i dettagli della nuova partita</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...matchForm}>
                    <form onSubmit={matchForm.handleSubmit(onSubmitMatch)} className="space-y-4">
                      <FormField
                        control={matchForm.control}
                        name="homeTeam"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Squadra Casa</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona squadra casa" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teams ? teams.map(team => (
                                    <SelectItem key={`home-${team.id}`} value={team.name}>
                                      <div className="flex items-center">
                                        {team.logo ? (
                                          <div className="w-5 h-5 rounded-full overflow-hidden mr-2">
                                            <img 
                                              src={team.logo} 
                                              alt={`${team.name} logo`} 
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.innerHTML += `<span class="text-xs">${team.name.substring(0, 2).toUpperCase()}</span>`;
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                            <span className="text-xs">{team.name.substring(0, 2).toUpperCase()}</span>
                                          </div>
                                        )}
                                        {team.name}
                                      </div>
                                    </SelectItem>
                                  )) : null}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={matchForm.control}
                        name="awayTeam"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Squadra Ospite</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona squadra ospite" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teams ? teams.map(team => (
                                    <SelectItem key={`away-${team.id}`} value={team.name}>
                                      <div className="flex items-center">
                                        {team.logo ? (
                                          <div className="w-5 h-5 rounded-full overflow-hidden mr-2">
                                            <img 
                                              src={team.logo} 
                                              alt={`${team.name} logo`} 
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.innerHTML += `<span class="text-xs">${team.name.substring(0, 2).toUpperCase()}</span>`;
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                            <span className="text-xs">{team.name.substring(0, 2).toUpperCase()}</span>
                                          </div>
                                        )}
                                        {team.name}
                                      </div>
                                    </SelectItem>
                                  )) : null}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={matchForm.control}
                        name="matchDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data e Ora</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local" 
                                value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''} 
                                onChange={(e) => {
                                  // Parse the date in the default timezone (Italian)
                                  const dateString = e.target.value;
                                  
                                  // Creating date object (browser will handle timezone conversion)
                                  const localDate = new Date(dateString);
                                  
                                  console.log("Selected date input:", dateString);
                                  console.log("Date object (local):", localDate.toLocaleString());
                                  console.log("Date object (UTC):", localDate.toISOString());
                                  
                                  // Store date with proper timezone handling
                                  field.onChange(localDate);
                                }}
                              />
                            </FormControl>
                            <div className="mt-1 text-xs text-gray-500">
                              Nota: Gli orari sono impostati nel fuso orario italiano (Europe/Rome).
                              <br />
                              {field.value && (
                                <span>
                                  Data selezionata: <strong>{formatDateToLocalString(field.value, {
                                    weekday: 'long',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: DEFAULT_TIMEZONE
                                  })}</strong>
                                </span>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
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
                                {...field}
                                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={matchForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrizione (opzionale)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Es. Derby, Coppa, ecc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" disabled={createMatch.isPending}>
                        {createMatch.isPending ? "Aggiunta in corso..." : "Aggiungi Partita"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Inserisci Risultato</CardTitle>
                  <CardDescription>Seleziona una partita e inserisci il risultato</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...resultForm}>
                    <form onSubmit={resultForm.handleSubmit(onSubmitResult)} className="space-y-4">
                      <FormField
                        control={resultForm.control}
                        name="matchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Partita</FormLabel>
                            <FormControl>
                              <Select 
                                onValueChange={(value) => field.onChange(parseInt(value))} 
                                value={field.value?.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona una partita" />
                                </SelectTrigger>
                                <SelectContent>
                                  {matches ? 
                                    matches
                                      .filter(match => !match.hasResult)
                                      .map(match => (
                                        <SelectItem key={match.id} value={match.id.toString()}>
                                          {match.homeTeam} vs {match.awayTeam} - {formatDateToLocalString(match.matchDate, {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })} (Giornata {match.matchDay})
                                        </SelectItem>
                                      )) 
                                    : null}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={resultForm.control}
                        name="result"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Risultato</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex space-x-2"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="1" />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    Vittoria Casa (1)
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="X" />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    Pareggio (X)
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="2" />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    Vittoria Ospite (2)
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" disabled={updateMatchResult.isPending}>
                        {updateMatchResult.isPending ? "Aggiornamento in corso..." : "Inserisci Risultato"}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-6 border-t pt-6">
                    <h3 className="text-lg font-medium mb-3">Importa da Excel</h3>
                    <form onSubmit={onSubmitExcel} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          File Excel
                        </label>
                        <Input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileChange}
                          className="block w-full text-sm border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Il file deve contenere le colonne: homeTeam, awayTeam, matchDate, matchDay
                        </p>
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={!file || uploadExcel.isPending}
                        variant="outline"
                      >
                        {uploadExcel.isPending ? "Importazione in corso..." : "Importa Partite"}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* User management section */}
        <AccordionItem value="users" className="border rounded-lg overflow-hidden shadow-sm">
          <AccordionTrigger className="p-4 bg-gray-50 hover:bg-gray-100">
            <h2 className="text-xl font-bold text-left">Gestione Utenti</h2>
          </AccordionTrigger>
          <AccordionContent className="p-4">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{editingUserId ? "Modifica utente" : "Aggiungi nuovo utente"}</CardTitle>
                  <CardDescription>{editingUserId ? "Modifica i dettagli dell'utente" : "Inserisci i dettagli del nuovo utente"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...userForm}>
                    <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-5">
                      <FormField
                        control={userForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Utente</FormLabel>
                            <FormControl>
                              <Input placeholder="Es. Mario Rossi" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={userForm.control}
                        name="pin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PIN</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={editingUserId ? "Lascia vuoto per mantenere il PIN attuale" : "PIN di 4 cifre"}
                                maxLength={4}
                                {...field} 
                              />
                            </FormControl>
                            {editingUserId && (
                              <p className="text-sm text-gray-500 mt-1">
                                Se lasci vuoto questo campo, il PIN non verrà modificato.
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={userForm.control}
                        name="isAdmin"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Amministratore</FormLabel>
                              <p className="text-sm text-gray-500">
                                Questo utente avrà accesso al pannello di amministrazione
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex space-x-2">
                        <Button 
                          type="submit" 
                          className="flex-1"
                          disabled={createUser.isPending || updateUser.isPending}
                        >
                          {createUser.isPending || updateUser.isPending ? "Salvataggio in corso..." : 
                           editingUserId ? "Aggiorna Utente" : "Crea Utente"}
                        </Button>
                        
                        {editingUserId && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              setEditingUserId(null);
                              userForm.reset({
                                username: "",
                                pin: "",
                                isAdmin: false,
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
                  <CardTitle>Utenti</CardTitle>
                  <CardDescription>Elenco degli utenti registrati</CardDescription>
                </CardHeader>
                <CardContent className="max-h-96 overflow-auto">
                  {isLoadingUsers ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : users && users.length > 0 ? (
                    <div className="border rounded-md overflow-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-3 py-2 text-sm font-medium text-left">Nome</th>
                            <th className="px-3 py-2 text-sm font-medium text-left">PIN</th>
                            <th className="px-3 py-2 text-sm font-medium text-left">Ruolo</th>
                            <th className="px-3 py-2 text-sm font-medium text-center">Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id} className="border-b">
                              <td className="px-3 py-2 text-sm">{user.username}</td>
                              <td className="px-3 py-2 text-sm">••••</td>
                              <td className="px-3 py-2 text-sm">
                                {user.isAdmin ? (
                                  <Badge className="bg-amber-600">Admin</Badge>
                                ) : (
                                  <Badge variant="outline">Utente</Badge>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm text-center">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    variant="ghost" 
                                    size="sm"
                                    className="h-7 bg-blue-50 hover:bg-blue-100 text-blue-700"
                                    onClick={() => {
                                      userForm.reset({
                                        username: user.username,
                                        pin: "", // PIN is not returned from server
                                        isAdmin: user.isAdmin,
                                      });
                                      setEditingUserId(user.id);
                                    }}
                                  >
                                    Modifica
                                  </Button>
                                  <Button 
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 bg-red-50 hover:bg-red-100 text-red-700"
                                    disabled={deleteUser.isPending}
                                    onClick={() => {
                                      if (confirm(`Sei sicuro di voler eliminare l'utente ${user.username}?`)) {
                                        deleteUser.mutate(user.id);
                                      }
                                    }}
                                  >
                                    Elimina
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
                      Nessun utente trovato
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Team management section */}
        <AccordionItem value="teams" className="border rounded-lg overflow-hidden shadow-sm">
          <AccordionTrigger className="p-4 bg-gray-50 hover:bg-gray-100">
            <h2 className="text-xl font-bold text-left">Gestione Squadre</h2>
          </AccordionTrigger>
          <AccordionContent className="p-4">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{editingTeamId ? "Modifica squadra" : "Aggiungi una nuova squadra"}</CardTitle>
                  <CardDescription>{editingTeamId ? "Modifica i dettagli della squadra" : "Inserisci i dettagli della nuova squadra"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...teamForm}>
                    <form onSubmit={teamForm.handleSubmit(onSubmitTeam)} className="space-y-5">
                      <FormField
                        control={teamForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Squadra</FormLabel>
                            <FormControl>
                              <Input placeholder="Es. AC Milan" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={teamForm.control}
                        name="managerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allenatore</FormLabel>
                            <FormControl>
                              <Input placeholder="Es. El Loco Bielsa" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={teamForm.control}
                        name="credits"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Crediti</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                placeholder="Es. 100" 
                                {...field}
                                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div>
                        <FormLabel className="mb-2 block">Logo</FormLabel>
                        <Input
                          id="team-logo"
                          type="file"
                          accept="image/*"
                          onChange={handleTeamLogoChange}
                          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
                        />
                        {teamLogoFile && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-600">
                              Immagine selezionata: {teamLogoFile.name}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          type="submit" 
                          className="flex-1"
                          disabled={createTeam.isPending || updateTeam.isPending}
                        >
                          {createTeam.isPending || updateTeam.isPending ? "Salvataggio in corso..." : 
                           editingTeamId ? "Aggiorna Squadra" : "Crea Squadra"}
                        </Button>
                        
                        {editingTeamId && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              setEditingTeamId(null);
                              teamForm.reset({
                                name: "",
                                managerName: "",
                                credits: 0,
                                logo: "",
                              });
                              setTeamLogoFile(null);
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
                  <CardTitle>Squadre</CardTitle>
                  <CardDescription>Elenco delle squadre registrate</CardDescription>
                </CardHeader>
                <CardContent className="max-h-96 overflow-auto">
                  {isLoadingTeams ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : teams && teams.length > 0 ? (
                    <div className="border rounded-md overflow-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-3 py-2 text-sm font-medium text-left">Logo</th>
                            <th className="px-3 py-2 text-sm font-medium text-left">Nome</th>
                            <th className="px-3 py-2 text-sm font-medium text-left">Allenatore</th>
                            <th className="px-3 py-2 text-sm font-medium text-left">Crediti</th>
                            <th className="px-3 py-2 text-sm font-medium text-center">Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teams.map((team) => (
                            <tr key={team.id} className="border-b">
                              <td className="px-3 py-2 text-sm">
                                {team.logo ? (
                                  <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                                    <img 
                                      src={team.logo}
                                      alt={`${team.name} logo`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.classList.add('bg-primary/20', 'flex', 'items-center', 'justify-center', 'text-primary', 'font-semibold');
                                        e.currentTarget.parentElement!.innerHTML = `<span class="text-xs">${team.name.substring(0, 2).toUpperCase()}</span>`;
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                                    <span className="text-xs">
                                      {team.name.substring(0, 2).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm">{team.name}</td>
                              <td className="px-3 py-2 text-sm">{team.managerName}</td>
                              <td className="px-3 py-2 text-sm">{team.credits}</td>
                              <td className="px-3 py-2 text-sm text-center">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    variant="ghost" 
                                    size="sm"
                                    className="h-7 bg-blue-50 hover:bg-blue-100 text-blue-700"
                                    onClick={() => {
                                      teamForm.reset({
                                        name: team.name,
                                        managerName: team.managerName,
                                        credits: team.credits,
                                        logo: team.logo || "",
                                      });
                                      setEditingTeamId(team.id);
                                    }}
                                  >
                                    Modifica
                                  </Button>
                                  <Button 
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 bg-red-50 hover:bg-red-100 text-red-700"
                                    disabled={deleteTeam.isPending}
                                    onClick={() => {
                                      if (confirm(`Sei sicuro di voler eliminare la squadra ${team.name}?`)) {
                                        deleteTeam.mutate(team.id);
                                      }
                                    }}
                                  >
                                    Elimina
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
                      Nessuna squadra trovata
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Prize distribution section */}
        <AccordionItem value="prizes" className="border rounded-lg overflow-hidden shadow-sm">
          <AccordionTrigger className="p-4 bg-gray-50 hover:bg-gray-100">
            <h2 className="text-xl font-bold text-left">Gestione Premi</h2>
          </AccordionTrigger>
          <AccordionContent className="p-4">
            <Card>
              <CardHeader>
                <CardTitle>Calcola e Distribuisci Premi</CardTitle>
                <CardDescription>Seleziona una giornata per calcolare e distribuire i premi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Giornata</label>
                    <div className="flex space-x-2">
                      <Select
                        value={selectedMatchDay?.toString() || ''}
                        onValueChange={(value) => setSelectedMatchDay(parseInt(value))}
                      >
                        <SelectTrigger className="w-full md:w-52">
                          <SelectValue placeholder="Seleziona giornata" />
                        </SelectTrigger>
                        <SelectContent>
                          {matches ? 
                            Array.from(new Set(matches.map(m => m.matchDay))).sort((a, b) => a - b).map(day => (
                              <SelectItem key={day} value={day.toString()}>
                                Giornata {day}
                              </SelectItem>
                            )) 
                            : null}
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        variant="outline" 
                        disabled={!selectedMatchDay || calculatePrize.isPending}
                        onClick={() => {
                          if (selectedMatchDay) {
                            calculatePrize.mutate(selectedMatchDay);
                          }
                        }}
                      >
                        {calculatePrize.isPending ? "Calcolo in corso..." : "Calcola"}
                      </Button>
                      
                      <Button 
                        disabled={!selectedMatchDay || !prizeDistribution || prizeDistribution.isDistributed || distributePrizes.isPending}
                        onClick={() => {
                          if (selectedMatchDay) {
                            distributePrizes.mutate(selectedMatchDay);
                          }
                        }}
                      >
                        {distributePrizes.isPending ? "Distribuzione in corso..." : "Distribuisci"}
                      </Button>
                    </div>
                  </div>
                  
                  {isLoadingPrize ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : prizeDistribution ? (
                    <div className="border rounded-md p-4 space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Giornata</h3>
                          <p className="text-lg font-medium">{prizeDistribution.matchDay}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Montepremi totale</h3>
                          <p className="text-lg font-medium">{prizeDistribution.totalPot} crediti</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Premi distribuiti</h3>
                          <p className="text-lg font-medium">
                            {prizeDistribution.isDistributed ? (
                              <Badge className="bg-green-600">Sì</Badge>
                            ) : (
                              <Badge variant="outline">No</Badge>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <h3 className="text-md font-medium mb-2">Distribuzione</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span>4 pronostici corretti (35%)</span>
                            <div className="text-right">
                              <div>{prizeDistribution.potFor4Correct} crediti</div>
                              <div className="text-sm text-gray-500">
                                {prizeDistribution.users4Correct} utenti
                                {prizeDistribution.users4Correct > 0 && (
                                  <span> ({Math.floor(prizeDistribution.potFor4Correct / prizeDistribution.users4Correct)} per utente)</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>5 pronostici corretti (65%)</span>
                            <div className="text-right">
                              <div>{prizeDistribution.potFor5Correct} crediti</div>
                              <div className="text-sm text-gray-500">
                                {prizeDistribution.users5Correct} utenti
                                {prizeDistribution.users5Correct > 0 && (
                                  <span> ({Math.floor(prizeDistribution.potFor5Correct / prizeDistribution.users5Correct)} per utente)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : selectedMatchDay ? (
                    <div className="text-center py-8 text-gray-500">
                      Nessuna distribuzione calcolata per questa giornata. Clicca su "Calcola".
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Seleziona una giornata per visualizzare i dettagli della distribuzione dei premi.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}