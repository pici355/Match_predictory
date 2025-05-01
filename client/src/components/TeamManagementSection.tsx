import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { RefreshCw } from 'lucide-react';

const teamFormSchema = z.object({
  name: z.string().min(1, "Nome squadra è obbligatorio"),
  managerName: z.string().min(1, "Nome allenatore è obbligatorio"),
  credits: z.number().min(0, "I crediti non possono essere negativi"),
  logo: z.string().optional(),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

type Team = {
  id: number;
  name: string;
  logo?: string;
  managerName: string;
  credits: number;
  createdAt: string;
};

export default function TeamManagementSection() {
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { toast } = useToast();

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

  // Fetch teams
  const { 
    data: teams, 
    isLoading: isLoadingTeams,
  } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
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
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'eliminazione della squadra.",
        variant: "destructive",
      });
    }
  });

  function handleTeamLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setTeamLogoFile(files[0]);
      
      // Se si sta modificando un team esistente, puoi caricare subito il logo
      if (editingTeamId) {
        const team = teams?.find(t => t.id === editingTeamId);
        if (team) {
          uploadTeamLogo(files[0], team.name);
        }
      }
    }
  }
  
  function uploadTeamLogo(file: File, teamName: string) {
    setIsUploading(true);
    
    // Converti il file in base64 per salvarlo direttamente nel database
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Image = reader.result as string;
      
      const formData = new FormData();
      formData.append("teamName", teamName);
      formData.append("logo", file);
      formData.append("base64Logo", base64Image);
      
      toast({
        title: "Caricamento logo...",
        description: "Caricamento in corso...",
      });
      
      fetch("/api/teams/logo", {
        method: "POST",
        body: formData,
        credentials: "include"
      })
      .then(response => response.json())
      .then(data => {
        setIsUploading(false);
        if (data.success) {
          queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
          toast({
            title: "Logo caricato!",
            description: data.teamFound 
              ? "Il logo è stato caricato e associato alla squadra con successo." 
              : "Il logo è stato caricato ma nessuna squadra trovata con questo nome esatto.",
          });
        } else {
          throw new Error(data.message || "Errore durante il caricamento del logo");
        }
      })
      .catch(error => {
        setIsUploading(false);
        toast({
          title: "Errore!",
          description: error.message || "Si è verificato un errore durante il caricamento del logo.",
          variant: "destructive",
        });
      });
    };
    
    reader.onerror = () => {
      setIsUploading(false);
      toast({
        title: "Errore!",
        description: "Si è verificato un errore durante la lettura del file.",
        variant: "destructive",
      });
    };
  }
  
  // Funzione per aggiornare la lista dei team e verificare i loghi
  function refreshTeamLogos() {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['/api/teams'] })
      .then(() => {
        toast({
          title: "Aggiornamento completato",
          description: "I loghi delle squadre sono stati aggiornati correttamente.",
        });
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }

  function onSubmitTeam(data: TeamFormValues) {
    if (editingTeamId) {
      updateTeam.mutate({ id: editingTeamId, data });
    } else {
      // Quando si crea una nuova squadra
      createTeam.mutate(data, {
        onSuccess: (newTeam) => {
          // Se è stato selezionato un file immagine, caricalo dopo aver creato la squadra
          if (teamLogoFile) {
            uploadTeamLogo(teamLogoFile, newTeam.name);
          }
        }
      });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{editingTeamId ? "Modifica squadra" : "Aggiungi una nuova squadra"}</CardTitle>
                <CardDescription>{editingTeamId ? "Modifica i dettagli della squadra" : "Inserisci i dettagli della nuova squadra"}</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshTeamLogos}
                disabled={isRefreshing}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Aggiorna</span>
              </Button>
            </div>
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
                
                {/* Campo Credits rimosso come richiesto */}
                
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
      </div>
      
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
                                // Assicuriamoci che l'elemento parent esista prima di manipolarlo
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.classList.add('bg-primary/20', 'flex', 'items-center', 'justify-center', 'text-primary', 'font-semibold');
                                  parent.innerHTML = `<span class="text-xs">${team.name.substring(0, 2).toUpperCase()}</span>`;
                                }
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
  );
}