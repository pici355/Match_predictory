import React from 'react';

// Utilizziamo direttamente il path pubblico invece di importare
export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/lega-logo.png" 
        alt="Lega degli Indistruttibili" 
        className={`object-contain h-12 ${className}`}
        onError={(e) => {
          // Se l'immagine non si carica, mostriamo un fallback testuale
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const textNode = document.createElement('div');
            textNode.innerHTML = 'FantaSchedina';
            textNode.className = 'text-lg font-bold text-white';
            parent.appendChild(textNode);
          }
        }}
      />
    </div>
  );
};

export default Logo;