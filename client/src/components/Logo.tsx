import React, { useState, useEffect } from 'react';
import logoImage from '@assets/lega-logo.png'; // Importiamo il logo dal nostro progetto

// Utilizziamo l'immagine importata come base
export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [fallbackActive, setFallbackActive] = useState(false);
  
  // Usiamo l'immagine importata direttamente
  return (
    <div className={`flex items-center ${className}`}>
      {!fallbackActive ? (
        <img 
          src={logoImage}
          alt="Lega degli Indistruttibili" 
          className={`object-contain h-12 ${className}`}
          onError={(e) => {
            // Se l'immagine importata non si carica, proviamo con l'URL diretto
            console.warn('Logo importato non caricato, tentativo con URL diretto');
            e.currentTarget.src = `/lega-logo.png?t=${Date.now()}`;
            
            // Se anche l'URL diretto fallisce, mostriamo il fallback testuale
            e.currentTarget.onerror = () => {
              setFallbackActive(true);
              console.error('Tutti i tentativi di caricamento logo falliti.');
            };
          }}
        />
      ) : (
        <div className="text-lg font-bold text-white bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">
          FantaSchedina
        </div>
      )}
    </div>
  );
};

export default Logo;