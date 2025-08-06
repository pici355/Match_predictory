import PredictionForm from "@/components/PredictionForm";
import MatchInfo from "@/components/MatchInfo";
import UserPredictionHistory from "@/components/UserPredictionHistory";
import PredictionLeaderboard from "@/components/PredictionLeaderboard";
import { Card, CardContent } from "@/components/ui/card";
import { InfoIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function HomePage() {
  // Check if user is authenticated to show prediction history
  const { data: user } = useQuery({
    queryKey: ['/api/me'],
    retry: false
  });

  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 py-8 px-4">
      <div className="max-w-md mx-auto md:max-w-5xl">
        <div className="md:grid md:grid-cols-2 md:gap-6">
          {/* Colonna sinistra (mobile: sopra) */}
          <div className="md:col-span-1">
            {/* Info Banner */}
            <Card className="mb-6 shadow-sm border-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-start">
                  <InfoIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-lg text-blue-800">Regole della FantaSchedina</h3>
                    <ul className="mt-2 text-sm space-y-1.5 text-blue-700">
                      <li className="flex items-start">
                        <span className="font-bold mr-1">•</span>
                        <span>Devi pronosticare <strong>tutte le 3 partite</strong> per ogni giornata</span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-bold mr-1">•</span>
                        <span>Ogni esito corretto vale <strong>3 crediti</strong> (massimo 9 per schedina)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-bold mr-1">•</span>
                        <span>Puoi modificare i pronostici fino a 30 minuti prima dell'inizio della partita</span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-bold mr-1">•</span>
                        <span>I pronostici sono <strong>gratuiti</strong></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Prediction Form */}
            <PredictionForm />
            
            {/* User Prediction History (only for authenticated users) */}
            {isAuthenticated && <UserPredictionHistory />}
          </div>
          
          {/* Colonna destra (mobile: sotto) */}
          <div className="md:col-span-1 mt-6 md:mt-0">
            {/* Prediction Leaderboard */}
            <PredictionLeaderboard />
            
            {/* Match Information */}
            <div className="mt-6">
              <MatchInfo />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
