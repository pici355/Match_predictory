import React, { useState } from 'react';

// Logo dei "gufi piangenti" 
export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [fallbackActive, setFallbackActive] = useState(false);
  
  return (
    <div className={`flex items-center ${className}`}>
      {!fallbackActive ? (
        <img 
          src="/gufi-piangenti-logo.png"
          alt="Lega dei Gufi piangenti" 
          className={`object-contain h-12 ${className}`}
          onError={() => {
            setFallbackActive(true);
            console.error('Logo dei gufi piangenti non caricato.');
          }}
        />
      ) : (
        <div className="text-lg font-bold text-white bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">
          Lega dei Gufi piangenti
        </div>
      )}
    </div>
  );
};

export default Logo;