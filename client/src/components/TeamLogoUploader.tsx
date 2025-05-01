import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

export function TeamLogoUploader() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    const teamLogoInput = document.getElementById('teamLogo') as HTMLInputElement;
    const teamNameInput = document.getElementById('teamLogoName') as HTMLInputElement;
    
    if (!teamNameInput.value) {
      toast({
        title: "Nome squadra obbligatorio",
        description: "Inserisci il nome della squadra",
        variant: "destructive"
      });
      return;
    }
    
    if (!teamLogoInput.files || teamLogoInput.files.length === 0) {
      toast({
        title: "Nessun file selezionato",
        description: "Seleziona un'immagine da caricare",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("teamName", teamNameInput.value);
    formData.append("logo", teamLogoInput.files[0]);
    
    fetch("/api/teams/logo", {
      method: "POST",
      body: formData,
      credentials: "include" // Importante per inviare i cookies di autenticazione
    })
    .then(response => response.json())
    .then(data => {
      setIsUploading(false);
      if (data.success) {
        // Invalida la cache dei team per forzare un reload
        queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
        
        toast({
          title: "Logo caricato!",
          description: data.teamFound 
            ? "Il logo è stato caricato e associato alla squadra con successo." 
            : "Il logo è stato caricato ma nessuna squadra trovata con questo nome esatto.",
          variant: data.teamFound ? "default" : "destructive"
        });
        
        teamNameInput.value = "";
        teamLogoInput.value = "";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carica Logo Squadra</CardTitle>
        <CardDescription>Carica il logo di una squadra per visualizzarlo nell'app</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="teamLogoName">
              Nome Squadra
            </label>
            <Input
              id="teamLogoName"
              placeholder="Inserisci il nome esatto della squadra"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Inserisci il nome esatto della squadra come appare nell'app
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="teamLogo">
              Logo
            </label>
            <div className="flex items-center justify-center w-full">
              <label 
                htmlFor="teamLogo" 
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-1 text-sm text-gray-500">Clicca per caricare</p>
                  <p className="text-xs text-gray-500">PNG, JPG (MAX. 2MB)</p>
                </div>
                <input id="teamLogo" type="file" className="hidden" accept="image/*" />
              </label>
            </div>
          </div>
          
          <Button
            type="button"
            className="w-full"
            disabled={isUploading}
            onClick={handleUpload}
          >
            {isUploading ? "Caricamento in corso..." : "Carica Logo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default TeamLogoUploader;