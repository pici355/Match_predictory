import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Award, Medal } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

// Tipi per i dati della classifica
interface LeaderboardUser {
  id: number;
  username: string;
  correctPredictions: number;
  totalPredictions: number;
  successRate: number;
  creditsWon: number;
  position: number;
  previousPosition?: number;
}

interface LeaderboardData {
  matchDay: number;
  lastUpdated: string;
  users: LeaderboardUser[];
}

export default function PredictionLeaderboard() {
  const [activeTab, setActiveTab] = useState<string>('current');
  const queryClient = useQueryClient();
  
  // Fetch dei dati della classifica
  const { data: leaderboardData, isLoading } = useQuery<LeaderboardData>({
    queryKey: ['/api/leaderboard', activeTab],
    refetchInterval: 30000, // Aggiorna ogni 30 secondi
  });
  
  // Setup WebSocket per gli aggiornamenti in tempo reale
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Se riceviamo un aggiornamento della classifica, invalidiamo la cache
        if (data.type === 'leaderboard_update') {
          queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    // Cleanup alla disconnessione
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [queryClient]);
  
  // Rendering dello stato di caricamento
  if (isLoading) {
    return (
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle>Classifica Pronostici</CardTitle>
          <CardDescription>Caricamento...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const renderPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Award className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="h-5 w-5 flex items-center justify-center font-bold text-sm text-muted-foreground">{position}</span>;
    }
  };
  
  // Calcola la variazione di posizione
  const getPositionChange = (user: LeaderboardUser) => {
    if (!user.previousPosition) return null;
    
    const change = user.previousPosition - user.position;
    
    if (change > 0) {
      return <Badge className="bg-green-600 ml-2">+{change}</Badge>;
    } else if (change < 0) {
      return <Badge className="bg-red-600 ml-2">{change}</Badge>;
    }
    
    return <Badge className="bg-gray-400 ml-2">0</Badge>;
  };
  
  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle>Classifica Pronostici</CardTitle>
        <CardDescription>
          Gli utenti con le previsioni più accurate
          {leaderboardData?.lastUpdated && (
            <span className="block text-xs mt-1">
              Ultimo aggiornamento: {new Date(leaderboardData.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </CardDescription>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Giornata Attuale</TabsTrigger>
            <TabsTrigger value="overall">Classifica Generale</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {leaderboardData?.users.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { type: 'spring', stiffness: 100 }
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                layoutId={`user-${user.id}`}
                className="flex items-center p-3 rounded-md border border-border"
              >
                <div className="flex-shrink-0 mr-3">
                  {renderPositionIcon(user.position)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="font-medium">{user.username}</h3>
                    {getPositionChange(user)}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <span>Tasso successo: {user.successRate}%</span>
                    <span className="mx-1">•</span>
                    <span>Vinti: {user.creditsWon} crediti</span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="font-bold">{user.correctPredictions}/{user.totalPredictions}</div>
                  <div className="text-xs text-muted-foreground">previsioni corrette</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {leaderboardData?.users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nessun dato disponibile per la classifica.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}