import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { apiRequest, queryClient, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Edit2, Trash2, Key, User } from 'lucide-react';

// Definizione dello schema per il form
const userFormSchema = z.object({
  username: z.string().min(3, "Il nome utente deve avere almeno 3 caratteri"),
  pin: z.string().min(4, "Il PIN deve avere almeno 4 caratteri"),
  isAdmin: z.boolean().default(false),
});

type UserFormValues = z.infer<typeof userFormSchema>;

type User = {
  id: number;
  username: string;
  pin?: string;
  isAdmin: boolean;
  createdAt: string;
};

export default function UserManagementSection() {
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const { toast } = useToast();

  // Form per la gestione degli utenti
  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      pin: "",
      isAdmin: false,
    },
  });

  // Fetch utenti
  const { 
    data: users, 
    isLoading: isLoadingUsers,
    error: usersError
  } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Log errors for debugging
  useEffect(() => {
    if (usersError) {
      console.error("Error fetching users:", usersError);
    }
  }, [usersError]);

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
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante l'eliminazione dell'utente.",
        variant: "destructive",
      });
    }
  });

  // Reset PIN mutation
  const resetPin = useMutation({
    mutationFn: async ({ id, pin }: { id: number, pin: string }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, { pin });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "PIN reimpostato!",
        description: "Il PIN dell'utente è stato reimpostato con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore!",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante il reset del PIN.",
        variant: "destructive",
      });
    }
  });

  function onSubmitUser(data: UserFormValues) {
    if (editingUserId) {
      updateUser.mutate({ id: editingUserId, data });
    } else {
      createUser.mutate(data);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingUserId ? "Modifica utente" : "Aggiungi un nuovo utente"}</CardTitle>
          <CardDescription>{editingUserId ? "Modifica i dettagli dell'utente" : "Inserisci i dettagli del nuovo utente"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username */}
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

                {/* PIN */}
                <FormField
                  control={userForm.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PIN</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="Es. 1234" 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Is Admin */}
              <FormField
                control={userForm.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Amministratore</FormLabel>
                      <FormDescription>
                        Abilita i permessi di amministratore per questo utente
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createUser.isPending || updateUser.isPending}
                >
                  {createUser.isPending || updateUser.isPending 
                    ? "Salvataggio in corso..." 
                    : editingUserId 
                      ? "Aggiorna Utente" 
                      : "Crea Utente"
                  }
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
                    <th className="px-3 py-2 text-sm font-medium text-left">Stato</th>
                    <th className="px-3 py-2 text-sm font-medium text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="px-3 py-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs text-gray-500">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {user.isAdmin ? (
                          <Badge variant="default">Amministratore</Badge>
                        ) : (
                          <Badge variant="outline">Utente</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 bg-amber-50 hover:bg-amber-100 text-amber-700"
                            onClick={() => {
                              const newPin = prompt("Inserisci il nuovo PIN per " + user.username, "");
                              if (newPin) {
                                resetPin.mutate({ id: user.id, pin: newPin });
                              }
                            }}
                          >
                            <Key className="h-4 w-4 mr-1" /> PIN
                          </Button>
                          <Button
                            variant="ghost" 
                            size="sm"
                            className="h-7 bg-blue-50 hover:bg-blue-100 text-blue-700"
                            onClick={() => {
                              userForm.reset({
                                username: user.username,
                                pin: user.pin || "",
                                isAdmin: user.isAdmin,
                              });
                              setEditingUserId(user.id);
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-1" /> Modifica
                          </Button>
                          <Button 
                            variant="ghost"
                            size="sm"
                            className="h-7 bg-red-50 hover:bg-red-100 text-red-700"
                            disabled={deleteUser.isPending}
                            onClick={() => {
                              if (confirm(`Sei sicuro di voler eliminare l'utente "${user.username}"?\nQuesta azione è irreversibile.`)) {
                                deleteUser.mutate(user.id);
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
              Nessun utente trovato
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}