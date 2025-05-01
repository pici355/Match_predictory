import React from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatDateToLocalString } from "@/lib/dateUtils";
import { Printer, Download, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Types
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

interface MatchDayReceiptProps {
  matchDay: number;
  predictions: Prediction[];
  username: string;
}

const predictionMap: Record<string, string> = {
  "1": "Vittoria Casa",
  "X": "Pareggio",
  "2": "Vittoria Trasferta"
};

export default function MatchDayReceipt({ matchDay, predictions, username }: MatchDayReceiptProps) {
  // Order predictions by match date
  const orderedPredictions = [...predictions].sort((a, b) => {
    if (!a.match || !b.match) return 0;
    const dateA = new Date(a.match.matchDate);
    const dateB = new Date(b.match.matchDate);
    return dateA.getTime() - dateB.getTime();
  });
  
  const handlePrint = () => {
    window.print();
  };
  
  // Download the receipt as an image
  const handleDownload = async () => {
    const receiptElement = document.getElementById('receipt');
    if (!receiptElement) return;
    
    try {
      const canvas = await html2canvas(receiptElement, {
        scale: 2, // Better quality
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const image = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      
      downloadLink.href = image;
      downloadLink.download = `Scommessa_Giornata${matchDay}_${username}.png`;
      downloadLink.click();
    } catch (error) {
      console.error("Error generating receipt image:", error);
    }
  };
  
  // Share on WhatsApp
  const handleShareWhatsApp = async () => {
    const receiptElement = document.getElementById('receipt');
    if (!receiptElement) return;
    
    try {
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const image = canvas.toDataURL('image/png');
      const text = `Indistruttibili Bet: Pronostici di ${username} per la Giornata ${matchDay}`;
      
      // Share on WhatsApp (mobile)
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.open(`whatsapp://send?text=${encodeURIComponent(text)}`);
      } else {
        // WhatsApp Web for desktop users
        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`);
      }
    } catch (error) {
      console.error("Error sharing receipt:", error);
    }
  };
  
  // Format date for receipt header
  const receiptDate = new Date();
  const formattedDate = formatDateToLocalString(receiptDate.toISOString(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <Card className="mb-4 shadow-md receipt-card" id="receipt">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">Schedina Giornata {matchDay}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Giocatore: {username}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint} 
            className="print:hidden"
          >
            <Printer className="h-4 w-4 mr-1" />
            Stampa
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Data: {formattedDate}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="space-y-3">
          {orderedPredictions.map((prediction, index) => (
            <div key={prediction.id} className="pb-2">
              <div className="flex justify-between">
                <div className="font-medium">
                  {index + 1}. {prediction.match?.homeTeam} vs {prediction.match?.awayTeam}
                </div>
                <div className="font-bold">
                  {prediction.prediction}
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <div>
                  {prediction.match && formatDateToLocalString(prediction.match.matchDate, {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div>
                  {predictionMap[prediction.prediction] || prediction.prediction}
                </div>
              </div>
              
              {index < orderedPredictions.length - 1 && <Separator className="mt-2" />}
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="border-t bg-muted/20 flex-col items-start pt-3">
        <div className="w-full">
          <p className="text-sm font-semibold">Totale pronostici: {predictions.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Il 100% di previsioni corrette assegna 10 crediti
          </p>
        </div>
        <div className="w-full mt-3 text-center text-xs text-muted-foreground">
          FantaSchedina Web - La Lega degli Indistruttibili
        </div>
      </CardFooter>
      
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt, #receipt * {
            visibility: visible;
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 1rem;
          }
          .receipt-card {
            box-shadow: none !important;
            border: 1px solid #ddd;
          }
        }
      `}</style>
    </Card>
  );
}