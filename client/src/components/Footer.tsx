import React from 'react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t py-6 mt-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
            <Logo className="mb-2 h-16" />
            <p className="text-sm text-gray-600 mt-2">Il sistema di pronostici della Lega degli Indistruttibili</p>
          </div>
          
          <div className="text-sm text-gray-600 text-center md:text-right">
            <p className="mb-1">© {new Date().getFullYear()} Lega degli Indistruttibili</p>
            <p>Tutti i diritti riservati</p>
          </div>
        </div>
      </div>
    </footer>
  );
}