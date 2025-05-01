import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { matchSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ======== FORM SCHEMAS ========
const matchFormSchema = matchSchema.extend({
  homeTeam: z.string().min(1, { message: "La squadra di casa è obbligatoria" }),
  awayTeam: z.string().min(1, { message: "La squadra ospite è obbligatoria" }),
  matchDate: z.coerce.date({
    required_error: "La data della partita è obbligatoria",
    invalid_type_error: "Data non valida",
  }),
  matchDay: z.coerce.number({
    required_error: "La giornata è obbligatoria",
    invalid_type_error: "Numero di giornata non valido",
  }).min(1, { message: "La giornata deve essere almeno 1" }),
  description: z.string().optional(),
});

const userFormSchema = z.object({
  username: z.string().min(3, { message: "Il nome della squadra deve avere almeno 3 caratteri" }),
  pin: z.string().length(4, { message: "Il PIN deve essere di 4 cifre" })
    .regex(/^\d+$/, { message: "Il PIN deve contenere solo numeri" }),
  isAdmin: z.boolean().default(false),
});

const matchResultFormSchema = z.object({
  matchId: z.number({
    required_error: "Seleziona una partita",
    invalid_type_error: "Partita non valida",
  }),
  result: z.enum(["1", "X", "2"], {
    required_error: "Seleziona un risultato",
  }),
});

const teamFormSchema = z.object({
  name: z.string().min(2, { message: "Il nome della squadra deve avere almeno 2 caratteri" }),
  managerName: z.string().min(2, { message: "Il nome del gestore deve avere almeno 2 caratteri" }),
  credits: z.coerce.number().min(0, { message: "I crediti non possono essere negativi" }),
  logo: z.string().optional(),
});

// ======== TYPES ========
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
  const [activeTab, setActiveTab] = useState("add-match");
  const [file, setFile] = useState<File | null>(null);
  const [selectedMatchDay, setSelectedMatchDay] = useState<number | null>(null);
  const { toast } = useToast();

  // ======== FORMS ========
  // Match form
  const matchForm = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      homeTeam: "",
      awayTeam: "",
      matchDate: new Date(), // Set a default date to now
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
        matchDate: new Date(), // Reset with a new date
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
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'aggiunta dell'utente.",
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
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'aggiunta della squadra.",
        variant: "destructive",
      });
    }
  });

  // ======== HANDLERS ========
  function onSubmitMatch(data: MatchFormValues) {
    createMatch.mutate(data);
  }

  function onSubmitUser(data: UserFormValues) {
    createUser.mutate(data);
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
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  }
  
  function onSubmitTeam(data: TeamFormValues) {
    createTeam.mutate(data);
  }
  
  // Handle team logo file selection
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  
  function handleTeamLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setTeamLogoFile(file);
      
      // Read file as base64 to store in form
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          teamForm.setValue('logo', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Group matches by match day
  const matchesByDay = matches ? 
    matches.reduce((acc: {[key: number]: Match[]}, match) => {
      acc[match.matchDay] = acc[match.matchDay] || [];
      acc[match.matchDay].push(match);
      return acc;
    }, {}) : {};

  // Get available match days
  const matchDays = Object.keys(matchesByDay).map(Number).sort((a, b) => a - b);

  // Get matches without results for the result form
  const matchesWithoutResults = matches ? 
    matches.filter(match => !match.hasResult) : [];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-primary mb-8">Admin Dashboard</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="add-match">Aggiungi Partita</TabsTrigger>
            <TabsTrigger value="add-user">Aggiungi Utente</TabsTrigger>
            <TabsTrigger value="teams">Squadre</TabsTrigger>
            <TabsTrigger value="match-results">Risultati</TabsTrigger>
            <TabsTrigger value="prizes">Premi</TabsTrigger>
            <TabsTrigger value="view-data">Visualizza Dati</TabsTrigger>
          </TabsList>
          
          {/* Add Match Tab */}
          <TabsContent value="add-match">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Aggiungi una nuova partita</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...matchForm}>
                    <form onSubmit={matchForm.handleSubmit(onSubmitMatch)} className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={matchForm.control}
                          name="homeTeam"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Squadra casa</FormLabel>
                              <FormControl>
                                <Input placeholder="Es. Newell's" {...field} />
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
                              <FormLabel>Squadra ospite</FormLabel>
                              <FormControl>
                                <Input placeholder="Es. Como" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={matchForm.control}
                          name="matchDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data e ora</FormLabel>
                              <FormControl>
                                <Input 
                                  type="datetime-local" 
                                  {...field} 
                                  value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ''} 
                                />
                              </FormControl>
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
                                <Input type="number" min="1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={matchForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrizione (opzionale)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Es. Amichevole, Trofeo, Campionato..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createMatch.isPending}
                      >
                        {createMatch.isPending ? "Salvataggio in corso..." : "Salva Partita"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Importa partite da Excel</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onSubmitExcel} className="space-y-5">
                    <div>
                      <label htmlFor="excel-file" className="block text-sm font-medium mb-2">
                        File Excel
                      </label>
                      <input
                        id="excel-file"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Il file deve contenere le colonne: homeTeam, awayTeam, matchDate, matchDay (e opzionalmente description)
                      </p>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={uploadExcel.isPending || !file}
                    >
                      {uploadExcel.isPending ? "Importazione in corso..." : "Importa File"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Add User Tab */}
          <TabsContent value="add-user">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Aggiungi un nuovo utente</CardTitle>
                  <CardDescription>Crea un account per un nuovo giocatore</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...userForm}>
                    <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-5">
                      <FormField
                        control={userForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Squadra</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome della squadra Fantacalcio" {...field} />
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
                                placeholder="PIN di 4 cifre" 
                                maxLength={4}
                                {...field} 
                              />
                            </FormControl>
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
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createUser.isPending}
                      >
                        {createUser.isPending ? "Creazione in corso..." : "Crea Utente"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Utenti</CardTitle>
                  <CardDescription>Elenco degli utenti registrati</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingUsers ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : users && users.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-sm font-medium">Nome Squadra</th>
                            <th className="px-4 py-3 text-sm font-medium">Ruolo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id} className="border-b">
                              <td className="px-4 py-3 text-sm">{user.username}</td>
                              <td className="px-4 py-3 text-sm">
                                {user.isAdmin ? (
                                  <Badge variant="default">Admin</Badge>
                                ) : (
                                  <Badge variant="outline">Utente</Badge>
                                )}
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
          </TabsContent>
          
          {/* Teams Tab */}
          <TabsContent value="teams">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Aggiungi una nuova squadra</CardTitle>
                  <CardDescription>Aggiungi una squadra di calcio con il suo logo</CardDescription>
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
                              <Input placeholder="Es. Newell's Old Boys" {...field} />
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
                            <FormLabel>Gestore</FormLabel>
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
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createTeam.isPending}
                      >
                        {createTeam.isPending ? "Salvataggio in corso..." : "Salva Squadra"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Squadre</CardTitle>
                  <CardDescription>Elenco delle squadre registrate</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingTeams ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : teams && teams.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-sm font-medium">Logo</th>
                            <th className="px-4 py-3 text-sm font-medium">Nome</th>
                            <th className="px-4 py-3 text-sm font-medium">Gestore</th>
                            <th className="px-4 py-3 text-sm font-medium">Crediti</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teams.map((team) => (
                            <tr key={team.id} className="border-b">
                              <td className="px-4 py-3 text-sm">
                                {team.logo ? (
                                  <div className="w-8 h-8 rounded-full overflow-hidden">
                                    <img 
                                      src={team.logo} 
                                      alt={`Logo ${team.name}`} 
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-xs font-bold text-gray-500">
                                      {team.name.substring(0, 2).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">{team.name}</td>
                              <td className="px-4 py-3 text-sm">{team.managerName}</td>
                              <td className="px-4 py-3 text-sm">{team.credits}</td>
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
          </TabsContent>
          
          {/* Match Results Tab */}
          <TabsContent value="match-results">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Inserisci risultato</CardTitle>
                  <CardDescription>Imposta il risultato di una partita completata</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...resultForm}>
                    <form onSubmit={resultForm.handleSubmit(onSubmitResult)} className="space-y-5">
                      <FormField
                        control={resultForm.control}
                        name="matchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seleziona partita</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona una partita" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {matchesWithoutResults.length > 0 ? (
                                  matchesWithoutResults.map((match) => (
                                    <SelectItem key={match.id} value={match.id.toString()}>
                                      {match.homeTeam} vs {match.awayTeam} (Giornata {match.matchDay})
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-matches" disabled>
                                    Nessuna partita senza risultato
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
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
                                value={field.value}
                                className="flex space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="1" id="result-1" />
                                  </FormControl>
                                  <FormLabel htmlFor="result-1" className="cursor-pointer">
                                    Vince Squadra Casa (1)
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="X" id="result-x" />
                                  </FormControl>
                                  <FormLabel htmlFor="result-x" className="cursor-pointer">
                                    Pareggio (X)
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="2" id="result-2" />
                                  </FormControl>
                                  <FormLabel htmlFor="result-2" className="cursor-pointer">
                                    Vince Squadra Ospite (2)
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={updateMatchResult.isPending || !resultForm.getValues().matchId}
                      >
                        {updateMatchResult.isPending ? "Aggiornamento in corso..." : "Salva Risultato"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Risultati partite</CardTitle>
                  <CardDescription>Visualizza i risultati delle partite già inseriti</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingMatches ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : matches && matches.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-sm font-medium">Partita</th>
                            <th className="px-4 py-3 text-sm font-medium">Giornata</th>
                            <th className="px-4 py-3 text-sm font-medium">Risultato</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matches.map((match) => (
                            <tr key={match.id} className="border-b">
                              <td className="px-4 py-3 text-sm">{match.homeTeam} vs {match.awayTeam}</td>
                              <td className="px-4 py-3 text-sm text-center">{match.matchDay}</td>
                              <td className="px-4 py-3 text-sm">
                                {match.hasResult ? (
                                  <Badge className="bg-green-600">
                                    {match.result === "1" && `1 (${match.homeTeam})`}
                                    {match.result === "X" && "X (Pareggio)"}
                                    {match.result === "2" && `2 (${match.awayTeam})`}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Non disponibile</Badge>
                                )}
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
          </TabsContent>
          
          {/* Prizes Tab */}
          <TabsContent value="prizes">
            <Card>
              <CardHeader>
                <CardTitle>Distribuzione Premi</CardTitle>
                <CardDescription>Calcola e distribuisci i premi per ogni giornata</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Seleziona Giornata</label>
                    <Select
                      onValueChange={(value) => setSelectedMatchDay(parseInt(value))}
                      value={selectedMatchDay?.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona giornata" />
                      </SelectTrigger>
                      <SelectContent>
                        {matchDays.length > 0 ? (
                          matchDays.map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              Giornata {day}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-days" disabled>
                            Nessuna giornata disponibile
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedMatchDay && (
                    <div className="space-y-4">
                      {isLoadingPrize ? (
                        <Skeleton className="h-32 w-full" />
                      ) : prizeDistribution ? (
                        <div className="space-y-4">
                          <div className="bg-gray-50 p-4 rounded-md border">
                            <h3 className="font-semibold text-lg mb-2">Distribuzione Premi - Giornata {prizeDistribution.matchDay}</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>Crediti totali:</div>
                              <div className="font-medium">{prizeDistribution.totalPot}</div>
                              
                              <div>Premio per 4 esatti (35%):</div>
                              <div className="font-medium">{prizeDistribution.potFor4Correct}</div>
                              
                              <div>Premio per 5 esatti (65%):</div>
                              <div className="font-medium">{prizeDistribution.potFor5Correct}</div>
                              
                              <div>Vincitori con 4 esatti:</div>
                              <div className="font-medium">{prizeDistribution.users4Correct}</div>
                              
                              <div>Vincitori con 5 esatti:</div>
                              <div className="font-medium">{prizeDistribution.users5Correct}</div>
                              
                              <div>Stato distribuzione:</div>
                              <div>
                                {prizeDistribution.isDistributed ? (
                                  <Badge className="bg-green-600">Distribuito</Badge>
                                ) : (
                                  <Badge variant="outline">In attesa</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline"
                              onClick={() => calculatePrize.mutate(selectedMatchDay)}
                              disabled={calculatePrize.isPending}
                              className="flex-1"
                            >
                              {calculatePrize.isPending ? "Calcolo..." : "Ricalcola"}
                            </Button>
                            
                            <Button 
                              onClick={() => distributePrizes.mutate(selectedMatchDay)}
                              disabled={distributePrizes.isPending || prizeDistribution.isDistributed}
                              className="flex-1"
                            >
                              {distributePrizes.isPending ? "Distribuzione..." : "Distribuisci Premi"}
                            </Button>
                          </div>
                          
                          {!prizeDistribution.users4Correct && !prizeDistribution.users5Correct && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Attenzione</AlertTitle>
                              <AlertDescription>
                                Non ci sono vincitori per questa giornata. Assicurati che tutti i risultati delle partite siano stati inseriti.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Nessun dato disponibile</AlertTitle>
                          <AlertDescription>
                            Non sono disponibili informazioni sui premi per questa giornata. Clicca "Ricalcola" per generare la distribuzione.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* View Data Tab */}
          <TabsContent value="view-data">
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tutte le partite</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMatches ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : matches && matches.length > 0 ? (
                    <div className="border rounded-md overflow-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-sm font-medium">Squadre</th>
                            <th className="px-4 py-3 text-sm font-medium">Data</th>
                            <th className="px-4 py-3 text-sm font-medium">Giornata</th>
                            <th className="px-4 py-3 text-sm font-medium">Descrizione</th>
                            <th className="px-4 py-3 text-sm font-medium">Risultato</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matches.map((match) => (
                            <tr key={match.id} className="border-b">
                              <td className="px-4 py-3 text-sm whitespace-nowrap">{match.homeTeam} vs {match.awayTeam}</td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap">
                                {new Date(match.matchDate).toLocaleString('it-IT')}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">{match.matchDay}</td>
                              <td className="px-4 py-3 text-sm">{match.description || "-"}</td>
                              <td className="px-4 py-3 text-sm">
                                {match.hasResult ? (
                                  <span className="inline-flex items-center">
                                    <Check className="h-4 w-4 text-green-600 mr-1" />{match.result}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center">
                                    <X className="h-4 w-4 text-gray-400 mr-1" />Non disponibile
                                  </span>
                                )}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}