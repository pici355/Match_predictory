# FantaSchedina Web

## Overview
FantaSchedina Web è un'applicazione web per le previsioni delle partite di calcio della "Lega de i gufi piangenti". Il sistema permette agli utenti di fare pronostici sulle partite di calcio con un sistema di premi basato sulla precisione delle previsioni.

## Recent Changes
- **06/08/2025**: Aggiornate regole del gioco: richieste tutte le 3 partite per giornata invece di minimo 5
- **06/08/2025**: Cambiato sistema crediti: 3 crediti per ogni esito corretto (massimo 9 per schedina)
- **06/08/2025**: Corretto branding finale da "i gufi piangenti" a "Lega dei Gufi piangenti" 
- **06/08/2025**: Ridotto il limite massimo di utenti a 6 e cambiato branding da "Indistruttibili" a "i gufi piangenti"
- **06/08/2025**: Aggiunto controllo limite utenti nella registrazione e nuovo endpoint `/api/users/count`
- **06/08/2025**: Risolti problemi con visualizzazione pronostici amministratori tramite endpoint `/api/users/predictions` e `/api/prizes/payouts`
- **Maggio 2025**: Implementato sistema di autenticazione con PIN, gestione partite, sistema premi e leaderboard

## Project Architecture

### Frontend (React + TypeScript)
- **Autenticazione**: Sistema basato su PIN a 4 cifre
- **Routing**: Wouter per navigazione client-side
- **State Management**: TanStack Query per chiamate API e gestione cache
- **UI Components**: shadcn/ui con Tailwind CSS
- **Websockets**: Aggiornamenti real-time per leaderboard

### Backend (Express + TypeScript)
- **Database**: PostgreSQL con Drizzle ORM
- **Autenticazione**: Sessioni con express-session
- **Email**: SendGrid per notifiche
- **File Upload**: Multer per loghi squadre

### Key Features
1. **Sistema Previsioni**: 
   - Tutte le 3 partite per ogni giornata (no più minimo 5)
   - Modificabili fino a 30 minuti prima del match
   - Previsioni gratuite (nessun credito richiesto)

2. **Sistema Premi**:
   - 3 crediti per ogni esito corretto (massimo 9 per schedina)
   - Tre crediti per ogni previsione corretta nella leaderboard

3. **Gestione Amministrativa**:
   - Creazione/modifica partite e utenti
   - Import partite da Excel
   - Inserimento risultati
   - Visualizzazione pronostici e distribuzione premi

4. **Funzionalità Utenti**:
   - Ricevute condivisibili via WhatsApp
   - Download ricevute come immagini
   - Leaderboard settimanali e storiche
   - Storico previsioni accessibile a tutti

## User Preferences
- **Lingua**: Italiano
- **Branding**: "i gufi piangenti" (precedentemente "Indistruttibili")
- **Limite Utenti**: Massimo 6 utenti registrati
- **Interfaccia**: Semplice e intuitiva per utenti non tecnici
- **Colori**: Schema oro e rosso per abbinarsi al logo

## Technical Decisions
- **Database**: PostgreSQL scelto per persistenza dati e affidabilità
- **Autenticazione**: Sistema PIN personalizzato invece di email/password
- **Real-time**: WebSocket per aggiornamenti leaderboard live
- **File Storage**: Loghi squadre salvati come base64 nel database
- **Email Service**: SendGrid per notifiche amministrative
- **Deployment**: Compatibile con Replit Deployments

## Configuration
- **Max Users**: 6 utenti
- **Session Timeout**: 7 giorni
- **Prediction Cutoff**: 30 minuti prima del match
- **Required Predictions**: Tutte le 3 partite per giornata
- **Prize Amount**: 3 crediti per ogni esito corretto (max 9 per schedina)

## Security
- PIN basato su 4 cifre numeriche
- Validazione lato server per tutte le operazioni
- Controlli autorizzazione per funzioni admin
- Sessioni sicure con express-session