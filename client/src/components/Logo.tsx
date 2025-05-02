import React, { useState, useEffect } from 'react';

// Utilizziamo direttamente il path pubblico invece di importare
export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [logoKey, setLogoKey] = useState(Date.now());
  const [fallbackActive, setFallbackActive] = useState(false);
  
  // Force logo refresh on login
  useEffect(() => {
    // Recarica il logo quando il componente viene montato
    setLogoKey(Date.now());
    setFallbackActive(false);
  }, []);
  
  return (
    <div className={`flex items-center ${className}`}>
      {!fallbackActive ? (
        <img 
          key={logoKey}
          src={`/lega-logo.png?v=${logoKey}`} 
          alt="Lega degli Indistruttibili" 
          className={`object-contain h-12 ${className}`}
          onError={(e) => {
            // Se l'immagine non si carica, mostriamo un fallback testuale
            setFallbackActive(true);
            console.log('Logo non caricato. Mostrando testo fallback.');
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