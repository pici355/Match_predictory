# Setup Guide - FantaSchedina Web

## Quick Start

1. **Clona il repository**
   ```bash
   git clone https://github.com/pici355/scommesse.git
   cd scommesse
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura l'ambiente**
   ```bash
   cp .env.example .env
   # Modifica .env con i tuoi valori
   ```

4. **Setup Database**
   ```bash
   npm run db:push
   ```

5. **Avvia l'applicazione**
   ```bash
   npm run dev
   ```

## Configurazione Database

### PostgreSQL Locale
```bash
# Installa PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Crea database
sudo -u postgres createdb fantaschedina

# Crea utente
sudo -u postgres createuser --interactive
```

### Database URL
```env
DATABASE_URL=postgresql://username:password@localhost:5432/fantaschedina
```

## Configurazione Email

### SendGrid
1. Registrati su [SendGrid](https://sendgrid.com/)
2. Crea una API Key
3. Aggiungi al file `.env`:
   ```env
   SENDGRID_API_KEY=your_api_key_here
   FROM_EMAIL=noreply@yourdomain.com
   ADMIN_EMAIL=admin@yourdomain.com
   ```

## Primo Accesso

### Admin
- **Nome squadra**: `admin`
- **PIN**: `1234`

L'utente admin viene creato automaticamente al primo avvio.

## Struttura del Progetto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Componenti UI
│   │   ├── pages/        # Pagine dell'app
│   │   ├── hooks/        # Custom hooks
│   │   └── lib/          # Utilities
├── server/                # Backend Express
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations  
│   └── index.ts          # Server entry point
├── shared/                # Codice condiviso
│   └── schema.ts         # Database schema
└── docs/                 # Documentazione
```

## Comandi Disponibili

```bash
npm run dev      # Sviluppo
npm run build    # Build produzione
npm run start    # Avvia produzione
npm run check    # Type checking
npm run db:push  # Sync database schema
```

## Risoluzione Problemi

### Database
- Verifica che PostgreSQL sia in esecuzione
- Controlla le credenziali in DATABASE_URL
- Esegui `npm run db:push` per sincronizzare lo schema

### Email
- Verifica la API Key SendGrid
- Controlla che FROM_EMAIL sia verificato su SendGrid

### Connessione
- L'app gira su porta 5000 di default
- WebSocket su `/ws` per aggiornamenti real-time

## Deploy su Replit

1. Import del progetto
2. Le dipendenze si installano automaticamente
3. Configura le variabili d'ambiente nei Secrets
4. Il database PostgreSQL è preconfigurato
5. Deploy automatico disponibile