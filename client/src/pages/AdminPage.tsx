import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { matchSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

const formSchema = matchSchema.extend({
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

type FormValues = z.infer<typeof formSchema>;
type Match = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  matchDay: number;
  description?: string;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("add-match");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      homeTeam: "",
      awayTeam: "",
      matchDay: 1,
      description: "",
    },
  });

  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ['/api/matches'],
  });

  // Create match mutation
  const createMatch = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/matches", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      toast({
        title: "Partita aggiunta!",
        description: "La partita è stata aggiunta con successo.",
      });
      form.reset({
        homeTeam: "",
        awayTeam: "",
        matchDay: form.getValues("matchDay"),
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

  function onSubmitMatch(data: FormValues) {
    createMatch.mutate(data);
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-primary mb-8">Admin Dashboard</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add-match">Aggiungi Partita</TabsTrigger>
            <TabsTrigger value="import-excel">Importa Excel</TabsTrigger>
            <TabsTrigger value="view-matches">Visualizza Partite</TabsTrigger>
          </TabsList>
          
          {/* Add Match Tab */}
          <TabsContent value="add-match">
            <Card>
              <CardHeader>
                <CardTitle>Aggiungi una nuova partita</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitMatch)} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="homeTeam"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Squadra di casa</FormLabel>
                            <FormControl>
                              <Input placeholder="Es. Newell's" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
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
                        control={form.control}
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
                        control={form.control}
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
                      control={form.control}
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
          </TabsContent>
          
          {/* Import Excel Tab */}
          <TabsContent value="import-excel">
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
                    <Input
                      id="excel-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="w-full"
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
          </TabsContent>
          
          {/* View Matches Tab */}
          <TabsContent value="view-matches">
            <Card>
              <CardHeader>
                <CardTitle>Elenco partite</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
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
                          <th className="px-4 py-3 text-sm font-medium">Squadre</th>
                          <th className="px-4 py-3 text-sm font-medium">Data</th>
                          <th className="px-4 py-3 text-sm font-medium">Giornata</th>
                          <th className="px-4 py-3 text-sm font-medium">Descrizione</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matches.map((match) => (
                          <tr key={match.id} className="border-b">
                            <td className="px-4 py-3 text-sm">{match.homeTeam} vs {match.awayTeam}</td>
                            <td className="px-4 py-3 text-sm">
                              {new Date(match.matchDate).toLocaleString('it-IT')}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">{match.matchDay}</td>
                            <td className="px-4 py-3 text-sm">{match.description || "-"}</td>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}