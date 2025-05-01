import React from 'react';
import legaLogo from '../assets/lega-logo.png';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src={legaLogo} 
        alt="Lega degli Indistruttibili" 
        className={`object-contain h-12 ${className}`}
      />
    </div>
  );
};

export default Logo;