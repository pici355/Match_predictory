import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  const [activeTab, setActiveTab] = useState("add-match");
  const [file, setFile] = useState<File | null>(null);
  const [selectedMatchDay, setSelectedMatchDay] = useState<number | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
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
      // If we were editing the team that was just deleted, reset the form
      setEditingTeamId(null);
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
    if (editingTeamId) {
      // If we're editing an existing team
      updateTeam.mutate({ id: editingTeamId, data });
    } else {
      // If we're creating a new team
      createTeam.mutate(data);
    }
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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-primary mb-8">Admin Dashboard</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Vertical Navigation Menu */}
          <div className="w-full md:w-64 space-y-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-primary text-white p-4 font-semibold">Menu di Amministrazione</div>
              <div className="p-2">
                <button
                  onClick={() => setActiveTab("add-match")}
                  className={`w-full text-left px-4 py-3 rounded-md flex items-center space-x-2 transition-colors ${
                    activeTab === "add-match" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-gray-100"
                  }`}
                >
                  <span className="w-5">📆</span>
                  <span>Aggiungi Partita</span>
                </button>
                
                <button
                  onClick={() => setActiveTab("add-user")}
                  className={`w-full text-left px-4 py-3 rounded-md flex items-center space-x-2 transition-colors ${
                    activeTab === "add-user" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-gray-100"
                  }`}
                >
                  <span className="w-5">👤</span>
                  <span>Aggiungi Utente</span>
                </button>
                
                <button
                  onClick={() => setActiveTab("teams")}
                  className={`w-full text-left px-4 py-3 rounded-md flex items-center space-x-2 transition-colors ${
                    activeTab === "teams" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-gray-100"
                  }`}
                >
                  <span className="w-5">⚽</span>
                  <span>Squadre</span>
                </button>
                
                <button
                  onClick={() => setActiveTab("match-results")}
                  className={`w-full text-left px-4 py-3 rounded-md flex items-center space-x-2 transition-colors ${
                    activeTab === "match-results" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-gray-100"
                  }`}
                >
                  <span className="w-5">🏆</span>
                  <span>Risultati</span>
                </button>
                
                <button
                  onClick={() => setActiveTab("prizes")}
                  className={`w-full text-left px-4 py-3 rounded-md flex items-center space-x-2 transition-colors ${
                    activeTab === "prizes" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-gray-100"
                  }`}
                >
                  <span className="w-5">💰</span>
                  <span>Premi</span>
                </button>
                
                <button
                  onClick={() => setActiveTab("view-data")}
                  className={`w-full text-left px-4 py-3 rounded-md flex items-center space-x-2 transition-colors ${
                    activeTab === "view-data" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-gray-100"
                  }`}
                >
                  <span className="w-5">📊</span>
                  <span>Visualizza Dati</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="hidden">
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
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleziona squadra" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {isLoadingTeams ? (
                                        <SelectItem value="loading" disabled>
                                          Caricamento squadre...
                                        </SelectItem>
                                      ) : teams && teams.length > 0 ? (
                                        teams.map((team) => (
                                          <SelectItem key={team.id} value={team.name}>
                                            <div className="flex items-center gap-2">
                                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-[10px]">
                                                {team.name.substring(0, 2).toUpperCase()}
                                              </div>
                                              <span>{team.name}</span>
                                            </div>
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <SelectItem value="no-teams" disabled>
                                          Nessuna squadra disponibile
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
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
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleziona squadra" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {isLoadingTeams ? (
                                        <SelectItem value="loading" disabled>
                                          Caricamento squadre...
                                        </SelectItem>
                                      ) : teams && teams.length > 0 ? (
                                        teams.map((team) => (
                                          <SelectItem key={team.id} value={team.name}>
                                            <div className="flex items-center gap-2">
                                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-[10px]">
                                                {team.name.substring(0, 2).toUpperCase()}
                                              </div>
                                              <span>{team.name}</span>
                                            </div>
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <SelectItem value="no-teams" disabled>
                                          Nessuna squadra disponibile
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
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
                                <th className="px-4 py-3 text-sm font-medium">Nome</th>
                                <th className="px-4 py-3 text-sm font-medium">PIN</th>
                                <th className="px-4 py-3 text-sm font-medium">Ruolo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {users.map((user) => (
                                <tr key={user.id} className="border-b">
                                  <td className="px-4 py-3 text-sm">{user.username}</td>
                                  <td className="px-4 py-3 text-sm">••••</td>
                                  <td className="px-4 py-3 text-sm">
                                    {user.isAdmin ? (
                                      <Badge className="bg-amber-600">Admin</Badge>
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
                               editingTeamId ? "Aggiorna Squadra" : "Salva Squadra"}
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
                                <th className="px-4 py-3 text-sm font-medium">Allenatore</th>
                                <th className="px-4 py-3 text-sm font-medium">Crediti</th>
                                <th className="px-4 py-3 text-sm font-medium">Azioni</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teams.map((team) => (
                                <tr key={team.id} className="border-b">
                                  <td className="px-4 py-3 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                                      <span className="text-xs">
                                        {team.name.substring(0, 2).toUpperCase()}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm">{team.name}</td>
                                  <td className="px-4 py-3 text-sm">{team.managerName}</td>
                                  <td className="px-4 py-3 text-sm">{team.credits}</td>
                                  <td className="px-4 py-3 text-sm">
                                    <div className="flex space-x-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => {
                                          teamForm.reset({
                                            name: team.name,
                                            managerName: team.managerName,
                                            credits: team.credits,
                                            logo: team.logo || "",
                                          });
                                          // Set the editing team
                                          setEditingTeamId(team.id);
                                        }}
                                      >
                                        Modifica
                                      </Button>
                                      <Button 
                                        variant="destructive" 
                                        size="sm"
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
                                  
                                  <div>Stato:</div>
                                  <div className="font-medium">
                                    {prizeDistribution.isDistributed ? (
                                      <Badge className="bg-green-600">Distribuito</Badge>
                                    ) : (
                                      <Badge variant="outline">Non distribuito</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => calculatePrize.mutate(selectedMatchDay)}
                                  disabled={calculatePrize.isPending}
                                  className="flex-1"
                                >
                                  {calculatePrize.isPending ? "Calcolo in corso..." : "Calcola Premi"}
                                </Button>
                                
                                <Button
                                  onClick={() => distributePrizes.mutate(selectedMatchDay)}
                                  disabled={distributePrizes.isPending || prizeDistribution.isDistributed}
                                  variant={prizeDistribution.isDistributed ? "outline" : "default"}
                                  className="flex-1"
                                >
                                  {distributePrizes.isPending 
                                    ? "Distribuzione in corso..." 
                                    : prizeDistribution.isDistributed 
                                      ? "Già Distribuito" 
                                      : "Distribuisci Premi"
                                  }
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-500">
                              Nessuna distribuzione premi trovata per questa giornata.
                              <div className="mt-4">
                                <Button 
                                  onClick={() => calculatePrize.mutate(selectedMatchDay)}
                                  disabled={calculatePrize.isPending}
                                >
                                  {calculatePrize.isPending ? "Calcolo in corso..." : "Calcola Premi"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* View Data Tab */}
              <TabsContent value="view-data">
                <Card>
                  <CardHeader>
                    <CardTitle>Dati di sistema</CardTitle>
                    <CardDescription>Visualizza e analizza i dati del sistema</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border p-4 rounded-md">
                        <div className="text-lg font-semibold mb-1">Utenti</div>
                        <div className="text-3xl font-bold">{users?.length || 0}</div>
                      </div>
                      
                      <div className="border p-4 rounded-md">
                        <div className="text-lg font-semibold mb-1">Partite</div>
                        <div className="text-3xl font-bold">{matches?.length || 0}</div>
                      </div>
                      
                      <div className="border p-4 rounded-md">
                        <div className="text-lg font-semibold mb-1">Squadre</div>
                        <div className="text-3xl font-bold">{teams?.length || 0}</div>
                      </div>
                    </div>
                    
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">Partite per giornata</h3>
                      {matchDays.length > 0 ? (
                        <div className="space-y-2">
                          {matchDays.map((day) => {
                            const matchesForDay = matchesByDay[day] || [];
                            const matchesWithResult = matchesForDay.filter(m => m.hasResult).length;
                            
                            return (
                              <div key={day} className="border p-4 rounded-md">
                                <div className="flex justify-between items-center">
                                  <div className="font-medium">Giornata {day}</div>
                                  <div className="text-sm text-gray-500">
                                    {matchesWithResult} / {matchesForDay.length} partite completate
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                  <div 
                                    className="bg-primary h-2.5 rounded-full" 
                                    style={{ width: `${(matchesWithResult / matchesForDay.length) * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          Nessuna partita trovata
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}