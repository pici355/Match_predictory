import PredictionForm from "@/components/PredictionForm";
import MatchInfo from "@/components/MatchInfo";
import Footer from "@/components/Footer";
import UserPredictionHistory from "@/components/UserPredictionHistory";
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
      <div className="max-w-md mx-auto">
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
                    <span>Devi pronosticare <strong>minimo 5 partite</strong> per ogni giornata</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-1">•</span>
                    <span>Non è possibile selezionare partite dai giorni successivi</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-1">•</span>
                    <span>Puoi modificare i pronostici fino a 30 minuti prima dell'inizio della partita</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-1">•</span>
                    <span><strong>Solo 100% pronostici corretti:</strong> 10 crediti</span>
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
        
        {/* Match Information */}
        <MatchInfo />
        
        <Footer />
      </div>
    </div>
  );
}
