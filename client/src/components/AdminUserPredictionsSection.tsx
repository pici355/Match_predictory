import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TabsContent, TabsList, TabsTrigger, Tabs } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDateToLocalString, USER_TIMEZONE } from '@/lib/dateUtils';
import { getQueryFn } from '@/lib/queryClient';

type User = {
  id: number;
  username: string;
  isAdmin: boolean;
};

type Match = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  matchDay: number;
  description?: string;
  result?: string | null;
  hasResult?: boolean;
};

type Prediction = {
  id: number;
  userId: number;
  matchId: number;
  prediction: string;
  credits: number;
  isCorrect: boolean | null;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
  match?: Match;
};

type WinnerPayout = {
  id: number;
  userId: number;
  matchDay: number;
  correctPercentage: number;
  predictionsCorrect: number;
  predictionsTotal: number;
  amount: number;
  createdAt: string;
};

type UserWithPredictions = {
  user: User;
  predictions: Prediction[];
};

export default function AdminUserPredictionsSection() {
  const [selectedMatchDay, setSelectedMatchDay] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [manualUsers, setManualUsers] = useState<User[]>([]);
  const [manualPredictions, setManualPredictions] = useState<Prediction[]>([]);
  
  // Fetch all users
  const { 
    data: users, 
    isLoading: isLoadingUsers,
    error: usersError 
  } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Fetch all matches
  const { 
    data: matches, 
    isLoading: isLoadingMatches,
    error: matchesError 
  } = useQuery<Match[]>({
    queryKey: ['/api/matches'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Fetch user predictions from our new endpoint
  const { 
    data: userPredictions, 
    isLoading: isLoadingUserPredictions,
    error: userPredictionsError 
  } = useQuery<UserWithPredictions[]>({
    queryKey: ['/api/users/predictions'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Ottieni le previsioni singole da userPredictions
  const predictions = React.useMemo(() => {
    if (!userPredictions) return [];
    
    const allPredictions: Prediction[] = [];
    userPredictions.forEach(up => {
      allPredictions.push(...up.predictions);
    });
    
    return allPredictions;
  }, [userPredictions]);
  
  // Fetch all payouts
  const { 
    data: payouts, 
    isLoading: isLoadingPayouts,
    error: payoutsError 
  } = useQuery<WinnerPayout[]>({
    queryKey: ['/api/prizes/payouts'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Log errors for debugging
  useEffect(() => {
    if (usersError) {
      console.error("Error fetching users in AdminUserPredictionsSection:", usersError);
    }
  }, [usersError]);
  
  // Log match errors
  useEffect(() => {
    if (matchesError) {
      console.error("Error fetching matches:", matchesError);
    }
  }, [matchesError]);
  
  // Log prediction errors
  useEffect(() => {
    if (predictionsError) {
      console.error("Error fetching predictions:", predictionsError);
    }
  }, [predictionsError]);
  
  // Log payout errors
  useEffect(() => {
    if (payoutsError) {
      console.error("Error fetching payouts:", payoutsError);
    }
  }, [payoutsError]);
  
  // Effettuiamo una seconda richiesta specifica per gli users in caso la prima fallisca
  useEffect(() => {
    if (usersError || !users) {
      console.log("Trying alternative method to fetch users...");
      fetch('/api/users')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log("Alternative user fetch succeeded:", data.length);
          setManualUsers(data);
        })
        .catch(error => {
          console.error("Alternative user fetch failed:", error);
        });
    }
  }, [usersError, users]);
  
  // Carica anche tutte le previsioni quando necessario
  useEffect(() => {
    if (predictionsError || !predictions) {
      console.log("Trying alternative method to fetch predictions...");
      fetch('/api/predictions')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log("Alternative predictions fetch succeeded:", data.length);
          setManualPredictions(data);
        })
        .catch(error => {
          console.error("Alternative predictions fetch failed:", error);
        });
    }
  }, [predictionsError, predictions]);
  
  // Debug logging per verificare i dati
  useEffect(() => {
    if (users) console.log("Users fetched:", users.length);
    if (matches) console.log("Matches fetched:", matches.length);
    if (predictions) console.log("Predictions fetched:", predictions.length);
    if (payouts) console.log("Payouts fetched:", payouts ? payouts.length : 0);
  }, [users, matches, predictions, payouts]);
  
  // Get unique match days
  const matchDays = React.useMemo(() => {
    if (!matches) return [];
    
    const uniqueDays = new Set(matches.map(match => match.matchDay));
    return Array.from(uniqueDays).sort((a, b) => a - b);
  }, [matches]);
  
  // Filter predictions based on selection
  const filteredPredictions = React.useMemo(() => {
    if (!predictions || !matches) return [];
    
    // First apply match day filter if not "all"
    let filtered = [...predictions];
    
    if (selectedMatchDay !== 'all') {
      const matchDay = parseInt(selectedMatchDay);
      const matchIdsInDay = matches
        .filter(match => match.matchDay === matchDay)
        .map(match => match.id);
      
      filtered = filtered.filter(prediction => 
        matchIdsInDay.includes(prediction.matchId)
      );
    }
    
    // Then apply user filter if not "all"
    if (selectedUser !== 'all') {
      const userId = parseInt(selectedUser);
      filtered = filtered.filter(prediction => prediction.userId === userId);
    }
    
    return filtered;
  }, [predictions, matches, selectedMatchDay, selectedUser]);
  
  // Group predictions by user for display
  const predictionsByUser = React.useMemo(() => {
    // Usa i dati manuali se i dati da React Query non sono disponibili
    const usersList = users || manualUsers;
    const predictionsList = filteredPredictions.length > 0 ? filteredPredictions : manualPredictions;
    
    if ((!predictionsList || predictionsList.length === 0) || !usersList || usersList.length === 0) {
      console.log("Dati insufficienti per creare predictionsByUser");
      return [];
    }
    
    console.log(`Creazione predictionsByUser: ${predictionsList.length} predizioni, ${usersList.length} utenti`);
    
    const result: UserWithPredictions[] = [];
    
    // Group predictions by userId
    const groupedByUserId = predictionsList.reduce((acc, prediction) => {
      if (!acc[prediction.userId]) {
        acc[prediction.userId] = [];
      }
      acc[prediction.userId].push(prediction);
      return acc;
    }, {} as Record<number, Prediction[]>);
    
    // Convert grouped predictions to UserWithPredictions array
    Object.keys(groupedByUserId).forEach(userIdStr => {
      const userId = parseInt(userIdStr);
      const user = usersList.find(u => u.id === userId);
      
      if (user) {
        result.push({
          user,
          predictions: groupedByUserId[userId]
        });
      }
    });
    
    console.log(`Creati ${result.length} gruppi di previsioni per gli utenti`);
    return result;
  }, [filteredPredictions, users, manualUsers, manualPredictions]);
  
  // Get user payouts based on selection
  const filteredPayouts = React.useMemo(() => {
    if (!payouts) return [];
    
    let filtered = [...payouts];
    
    if (selectedMatchDay !== 'all') {
      const matchDay = parseInt(selectedMatchDay);
      filtered = filtered.filter(payout => payout.matchDay === matchDay);
    }
    
    if (selectedUser !== 'all') {
      const userId = parseInt(selectedUser);
      filtered = filtered.filter(payout => payout.userId === userId);
    }
    
    return filtered;
  }, [payouts, selectedMatchDay, selectedUser]);
  
  if (isLoadingUsers || isLoadingMatches || isLoadingPredictions || isLoadingPayouts) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="match-day-filter">Filtra per giornata</Label>
          <Select
            value={selectedMatchDay}
            onValueChange={setSelectedMatchDay}
          >
            <SelectTrigger id="match-day-filter">
              <SelectValue placeholder="Tutte le giornate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le giornate</SelectItem>
              {matchDays.map(day => (
                <SelectItem key={day} value={day.toString()}>
                  Giornata {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="user-filter">Filtra per utente</Label>
          <Select
            value={selectedUser}
            onValueChange={setSelectedUser}
          >
            <SelectTrigger id="user-filter">
              <SelectValue placeholder="Tutti gli utenti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli utenti</SelectItem>
              {users?.map(user => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="predictions" className="flex-1">Pronostici</TabsTrigger>
          <TabsTrigger value="payouts" className="flex-1">Premi vinti</TabsTrigger>
        </TabsList>
        
        <TabsContent value="predictions">
          {predictionsByUser.length > 0 ? (
            <div className="space-y-6">
              {predictionsByUser.map(({ user, predictions }) => (
                <Card key={user.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/20 py-3">
                    <CardTitle className="text-lg flex items-center">
                      <span className="mr-2">{user.username}</span>
                      {user.isAdmin && (
                        <Badge variant="secondary" className="mr-2">Admin</Badge>
                      )}
                      <Badge variant="outline">{predictions.length} pronostici</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[300px]">
                      <div className="p-4 space-y-4">
                        {predictions.map(prediction => {
                          const match = matches?.find(m => m.id === prediction.matchId);
                          if (!match) return null;
                          
                          return (
                            <div key={prediction.id} className="border rounded-md p-3">
                              <div className="flex justify-between items-center mb-2">
                                <div className="font-medium">
                                  <span className="text-sm text-muted-foreground mr-2">Giornata {match.matchDay}</span>
                                  {match.homeTeam} vs {match.awayTeam}
                                </div>
                                <div>
                                  {prediction.isCorrect === true && (
                                    <Badge className="bg-green-600 text-white">Vinta</Badge>
                                  )}
                                  {prediction.isCorrect === false && match.hasResult && (
                                    <Badge variant="destructive">Persa</Badge>
                                  )}
                                  {(prediction.isCorrect === null || (prediction.isCorrect === false && !match.hasResult)) && (
                                    <Badge variant="secondary" className="bg-gray-200 text-gray-700">In corso</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-between text-sm">
                                <div>
                                  <span className="text-muted-foreground mr-1">Pronostico:</span>
                                  <span className="font-semibold">{prediction.prediction}</span>
                                </div>
                                {match.result && (
                                  <div>
                                    <span className="text-muted-foreground mr-1">Risultato:</span>
                                    <span className="font-semibold">{match.result}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                                <span>Creato: {formatDateToLocalString(prediction.createdAt, { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  hour: '2-digit', 
                                  minute: '2-digit'
                                }, USER_TIMEZONE)}</span>
                                {prediction.updatedAt !== prediction.createdAt && (
                                  <span>Aggiornato: {formatDateToLocalString(prediction.updatedAt, { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    hour: '2-digit', 
                                    minute: '2-digit'
                                  }, USER_TIMEZONE)}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nessun pronostico trovato con i filtri selezionati
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="payouts">
          {filteredPayouts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Premi vinti</CardTitle>
                <CardDescription>Elenco dei premi vinti dagli utenti</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted text-sm">
                      <tr>
                        <th className="text-left p-2">Utente</th>
                        <th className="text-left p-2">Giornata</th>
                        <th className="text-left p-2">Crediti</th>
                        <th className="text-left p-2">% Pronostici corretti</th>
                        <th className="text-left p-2">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayouts.map(payout => {
                        const user = users?.find(u => u.id === payout.userId);
                        return (
                          <tr key={payout.id} className="border-t">
                            <td className="p-2">{user?.username || `Utente #${payout.userId}`}</td>
                            <td className="p-2">{payout.matchDay}</td>
                            <td className="p-2">{payout.amount}</td>
                            <td className="p-2">
                              {payout.correctPercentage}% ({payout.predictionsCorrect}/{payout.predictionsTotal})
                            </td>
                            <td className="p-2">
                              {formatDateToLocalString(payout.createdAt, { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              }, USER_TIMEZONE)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nessun premio trovato con i filtri selezionati
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}