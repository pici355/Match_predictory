import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Il nome della tua squadra deve avere almeno 3 caratteri.",
  }),
  pin: z.string().length(4, {
    message: "Il PIN deve essere di 4 cifre.",
  }).regex(/^\d+$/, {
    message: "Il PIN deve contenere solo numeri.",
  }),
});

const registerSchema = z.object({
  username: z.string().min(3, {
    message: "Il nome della tua squadra deve avere almeno 3 caratteri.",
  }),
  pin: z.string().length(4, {
    message: "Il PIN deve essere di 4 cifre.",
  }).regex(/^\d+$/, {
    message: "Il PIN deve contenere solo numeri.",
  }),
  confirmPin: z.string().length(4, {
    message: "Conferma PIN deve essere di 4 cifre.",
  }).regex(/^\d+$/, {
    message: "Il PIN deve contenere solo numeri.",
  }),
}).refine((data) => data.pin === data.confirmPin, {
  message: "I PIN non corrispondono",
  path: ["confirmPin"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      pin: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      pin: "",
      confirmPin: "",
    },
  });

  // Login mutation
  const login = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Accesso effettuato!",
        description: `Bentornato, ${data.username}!`,
      });

      // Aggiungiamo un breve ritardo per garantire che la sessione venga correttamente impostata
      // prima di reindirizzare alla pagina admin (che richiede la sessione)
      setTimeout(() => {
        // Facciamo anche una chiamata addizionale a /api/me per confermare la sessione
        fetch('/api/me')
          .then(res => res.json())
          .then(() => {
            if (data.isAdmin) {
              window.location.href = "/admin"; // Utilizziamo un full redirect invece di navigate()
            } else {
              navigate("/");
            }
          })
          .catch(err => {
            console.error("Session verification error:", err);
            navigate("/");
          });
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Accesso fallito",
        description: error instanceof Error ? error.message : "Credenziali non valide",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const register = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      // Remove confirmPin before sending
      const { confirmPin, ...registerData } = data;
      const response = await apiRequest("POST", "/api/register", registerData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registrazione completata!",
        description: `Benvenuto, ${data.username}!`,
      });
      
      // Applichiamo la stessa logica anche per la registrazione
      setTimeout(() => {
        fetch('/api/me')
          .then(res => res.json())
          .then(() => {
            if (data.isAdmin) {
              window.location.href = "/admin";
            } else {
              navigate("/");
            }
          })
          .catch(err => {
            console.error("Session verification error after registration:", err);
            navigate("/");
          });
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Registrazione fallita",
        description: error instanceof Error ? error.message : "Si è verificato un errore durante la registrazione",
        variant: "destructive",
      });
    },
  });

  function onLoginSubmit(data: LoginFormValues) {
    login.mutate(data);
  }

  function onRegisterSubmit(data: RegisterFormValues) {
    register.mutate(data);
  }

  return (
    <div className="flex h-screen justify-center items-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">FantaSchedina</CardTitle>
          <CardDescription className="text-center">
            Accedi o crea un account per continuare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Accedi</TabsTrigger>
              <TabsTrigger value="register">Registrati</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Squadra</FormLabel>
                        <FormControl>
                          <Input placeholder="Inserisci il nome della tua squadra" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIN</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Inserisci il tuo PIN di 4 cifre" 
                            maxLength={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={login.isPending}
                  >
                    {login.isPending ? "Accesso in corso..." : "Accedi"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="register" className="mt-4">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Squadra</FormLabel>
                        <FormControl>
                          <Input placeholder="Scegli il nome della tua squadra" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIN</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Scegli un PIN di 4 cifre" 
                            maxLength={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conferma PIN</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Conferma il tuo PIN" 
                            maxLength={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={register.isPending}
                  >
                    {register.isPending ? "Registrazione in corso..." : "Crea Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-gray-500">
          Continuando, accetti i termini e le condizioni.
        </CardFooter>
      </Card>
    </div>
  );
}