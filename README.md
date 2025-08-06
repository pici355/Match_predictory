# FantaSchedina Web

Un'applicazione web per le previsioni delle partite di calcio della **Lega dei Gufi piangenti**. Il sistema permette agli utenti di fare pronostici sulle partite di calcio con un sistema di premi basato sulla precisione delle previsioni.

## 🚀 Caratteristiche

- **Sistema di previsioni**: Gli utenti devono pronosticare tutte le 3 partite per ogni giornata
- **Sistema premi**: Si vince la schedina solo indovinando tutte le partite
- **Crediti**: 3 crediti per ogni esito corretto (massimo 9 per schedina)
- **Limite temporale**: Modifiche consentite fino a 30 minuti prima dell'inizio della partita
- **Autenticazione PIN**: Sistema sicuro basato su PIN a 4 cifre
- **Leaderboard**: Classifiche settimanali e storiche
- **Ricevute condivisibili**: Download e condivisione via WhatsApp
- **Pannello amministratore**: Gestione completa di partite, utenti e premi

## 🛠 Tecnologie

### Frontend
- **React 18** con TypeScript
- **Wouter** per il routing
- **TanStack Query** per la gestione dello state
- **shadcn/ui** + **Tailwind CSS** per l'interfaccia
- **WebSocket** per aggiornamenti real-time

### Backend
- **Express.js** con TypeScript
- **PostgreSQL** con Drizzle ORM
- **express-session** per l'autenticazione
- **SendGrid** per le notifiche email
- **Multer** per l'upload dei loghi

## 📦 Installazione

1. **Clona il repository**
   ```bash
   git clone https://github.com/pici355/scommesse.git
   cd scommesse
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente**
   Crea un file `.env` con:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/fantaschedina
   SENDGRID_API_KEY=your_sendgrid_api_key
   FROM_EMAIL=your_from_email@domain.com
   ADMIN_EMAIL=admin@domain.com
   ```

4. **Configura il database**
   ```bash
   npm run db:push
   ```

5. **Avvia l'applicazione**
   ```bash
   npm run dev
   ```

L'applicazione sarà disponibile su `http://localhost:5000`

## 🔐 Accesso Amministratore

**Credenziali di default:**
- Nome squadra: `admin`
- PIN: `1234`

## 📝 Configurazione

### Limite Utenti
L'applicazione supporta un massimo di **6 utenti** registrati.

### Regole del Gioco
- Tutte le 3 partite per giornata devono essere pronosticate
- Si vince solo indovinando tutte le partite
- 3 crediti per ogni esito corretto (massimo 9 per schedina)
- Modifiche consentite fino a 30 minuti prima dell'inizio

## 🎯 Funzionalità Amministratore

- **Gestione partite**: Creazione manuale o import da Excel
- **Gestione utenti**: Creazione e gestione account
- **Inserimento risultati**: Aggiornamento risultati delle partite
- **Visualizzazione pronostici**: Vista completa di tutti i pronostici
- **Distribuzione premi**: Gestione automatica dei premi

## 📱 Funzionalità Utente

- **Ricevute condivisibili**: Export come immagine per WhatsApp
- **Storico previsioni**: Accessibile a tutti gli utenti
- **Leaderboard live**: Aggiornamenti in tempo reale
- **Interfaccia responsive**: Ottimizzata per mobile e desktop

## 🚀 Deploy

L'applicazione è configurata per il deploy su Replit Deployments con supporto automatico per:
- Build della applicazione
- Hosting e TLS
- Health checks
- Domini personalizzati

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT.

## 🤝 Contributi

I contributi sono benvenuti! Apri una issue o invia una pull request.

---

**Sviluppato per la Lega dei Gufi piangenti** 🦉