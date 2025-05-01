import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg 
      viewBox="0 0 200 60" 
      xmlns="http://www.w3.org/2000/svg"
      className={`w-auto h-10 ${className}`}
    >
      <defs>
        <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      
      {/* Stylized shield shape */}
      <path 
        d="M30,5 L50,5 C55,5 55,5 55,10 L55,35 C55,45 50,55 40,55 C30,55 25,45 25,35 L25,10 C25,5 25,5 30,5 Z" 
        fill="url(#headerGradient)" 
        stroke="#000" 
        strokeWidth="1"
      />
      
      {/* Football inside shield */}
      <ellipse cx="40" cy="30" rx="10" ry="12" fill="#fff" />
      <path 
        d="M33,25 Q40,20 47,25 M33,35 Q40,40 47,35 M30,30 L50,30" 
        stroke="#000" 
        strokeWidth="1.5" 
        fill="none" 
      />
      
      {/* Text */}
      <text x="65" y="25" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="bold" fill="url(#headerGradient)">
        Lega degli
      </text>
      <text x="65" y="45" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="url(#headerGradient)">
        Indistruttibili
      </text>
    </svg>
  );
};

export default Logo;