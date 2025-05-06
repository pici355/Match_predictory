import React, { useState, useEffect } from 'react';
import logo from '../assets/lega-logo.png'; // Importiamo il logo dal nostro progetto

// Utilizziamo direttamente il path pubblico invece di importare
export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [fallbackActive, setFallbackActive] = useState(false);
  
  // Impostiamo l'URL assoluto per il logo
  const logoUrl = `/lega-logo.png?cache=${Math.random().toString(36).substring(7)}`;
  
  return (
    <div className={`flex items-center ${className}`}>
      {!fallbackActive ? (
        <img 
          src={logoUrl}
          alt="Lega degli Indistruttibili" 
          className={`object-contain h-12 ${className}`}
          onError={(e) => {
            // Se l'immagine non si carica, mostriamo un fallback testuale
            setFallbackActive(true);
            console.error('Logo non caricato. Mostrando testo fallback.');
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