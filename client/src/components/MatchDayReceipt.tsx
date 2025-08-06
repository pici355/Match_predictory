import React, { useEffect, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

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
  // Add toast notifications
  const { toast } = useToast();
  
  // Stato per il caricamento del logo
  const [logoLoaded, setLogoLoaded] = useState(true);
  
  // Add print styles
  useEffect(() => {
    // Add a <style> element for print styles
    const styleEl = document.createElement('style');
    styleEl.id = 'receipt-print-styles';
    styleEl.innerHTML = `
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
    `;
    document.head.appendChild(styleEl);
    
    // Clean up on unmount
    return () => {
      const existingStyle = document.getElementById('receipt-print-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);
  
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
      // Mostro un messaggio di elaborazione
      toast({
        title: "Generazione immagine...",
        description: "Sto creando l'immagine della schedina"
      });
      
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const image = canvas.toDataURL('image/png');
      
      // Testo per WhatsApp
      const text = `📋 i gufi piangenti Bet: Pronostici di ${username} per la Giornata ${matchDay}`;
      const fileName = `schedina_giornata_${matchDay}_${username}.png`;
      
      // Converti l'immagine in un file
      const response = await fetch(image);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      
      // Verifica il supporto per l'API di condivisione
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          // Usa l'API Web Share con supporto per file (funziona principalmente su mobile)
          await navigator.share({
            title: 'i gufi piangenti Bet',
            text: text,
            files: [file]
          });
          
          toast({
            title: "Condivisione avviata",
            description: "Seleziona WhatsApp dalla lista delle app"
          });
          return;
        } catch (err) {
          console.log('Web Share API error:', err);
          // Se fallisce, continua con il metodo alternativo
        }
      }
      
      // Metodo alternativo per dispositivi che non supportano API di condivisione con file
      // 1. Creiamo un link per scaricare l'immagine
      const downloadLink = document.createElement('a');
      downloadLink.href = image;
      downloadLink.download = fileName;
      downloadLink.click();
      
      toast({
        title: "Immagine scaricata",
        description: "La schedina è stata scaricata automaticamente"
      });
      
      // 2. Apriamo WhatsApp con un messaggio che include un link per aprire l'immagine
      setTimeout(() => {
        const whatsappText = `${text}\n\nTi ho inviato la mia schedina come immagine! 📊\nControlla nelle immagini scaricate.`;
        
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          window.open(`whatsapp://send?text=${encodeURIComponent(whatsappText)}`);
        } else {
          // WhatsApp Web per desktop
          window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`);
        }
      }, 500);
    } catch (error) {
      console.error("Error sharing receipt:", error);
      toast({
        title: "Errore di condivisione",
        description: "Si è verificato un errore nella condivisione. Prova a scaricare manualmente l'immagine.",
        variant: "destructive"
      });
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
          <div className="flex gap-2 items-center">
            <div className="h-12 w-12 flex items-center justify-center overflow-hidden">
              <Logo className="h-full w-full" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">i gufi piangenti Bet</CardTitle>
              <p className="text-sm mt-1">
                Giornata {matchDay} - Giocatore: {username}
              </p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Scarica</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleShareWhatsApp}
                    className="bg-green-500 text-white hover:bg-green-600 border-green-600"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Condividi su WhatsApp</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrint}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Stampa</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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
          {/* La regola del premio è stata rimossa secondo la richiesta */}
        </div>
        <div className="w-full mt-3 text-center text-xs text-muted-foreground">
          FantaSchedina Web - La Lega de i gufi piangenti
        </div>
      </CardFooter>
      
      {/* Stile per la stampa aggiunto via useEffect */}
    </Card>
  );
}