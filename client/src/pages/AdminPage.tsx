import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import TeamManagementSection from '@/components/TeamManagementSection';
import AdminUserPredictionsSection from '@/components/AdminUserPredictionsSection';

export default function AdminPage() {
  return (
    <div className="container mx-auto p-4 pb-24">
      <h1 className="text-3xl font-bold mb-6">Pannello Amministratore</h1>
      
      <Accordion
        type="single"
        collapsible
        defaultValue="teams"
        className="space-y-4"
      >
        {/* Matches management section */}
        <AccordionItem value="matches" className="border rounded-lg overflow-hidden shadow-sm">
          <AccordionTrigger className="p-4 bg-gray-50 hover:bg-gray-100">
            <h2 className="text-xl font-bold text-left">Gestione Partite</h2>
          </AccordionTrigger>
          <AccordionContent className="p-4">
            <div className="text-center py-12">
              <p className="text-gray-500">Sezione in costruzione</p>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* User management section */}
        <AccordionItem value="users" className="border rounded-lg overflow-hidden shadow-sm">
          <AccordionTrigger className="p-4 bg-gray-50 hover:bg-gray-100">
            <h2 className="text-xl font-bold text-left">Gestione Utenti</h2>
          </AccordionTrigger>
          <AccordionContent className="p-4">
            <div className="text-center py-12">
              <p className="text-gray-500">Sezione in costruzione</p>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Team management section */}
        <AccordionItem value="teams" className="border rounded-lg overflow-hidden shadow-sm">
          <AccordionTrigger className="p-4 bg-gray-50 hover:bg-gray-100">
            <h2 className="text-xl font-bold text-left">Gestione Squadre</h2>
          </AccordionTrigger>
          <AccordionContent className="p-4">
            <TeamManagementSection />
          </AccordionContent>
        </AccordionItem>
        
        {/* User predictions section */}
        <AccordionItem value="predictions" className="border rounded-lg overflow-hidden shadow-sm">
          <AccordionTrigger className="p-4 bg-gray-50 hover:bg-gray-100">
            <h2 className="text-xl font-bold text-left">Pronostici Utenti e Premi</h2>
          </AccordionTrigger>
          <AccordionContent className="p-4">
            <AdminUserPredictionsSection />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}