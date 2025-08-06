# Guida al Deployment - FantaSchedina Web

## Deploy su Replit

L'applicazione è ottimizzata per Replit Deployments:

1. **Fork o Import** il progetto su Replit
2. **Configura le variabili d'ambiente** nel pannello Secrets:
   - `DATABASE_URL`: URL del database PostgreSQL
   - `SENDGRID_API_KEY`: API key per le email
   - `FROM_EMAIL`: Email mittente
   - `ADMIN_EMAIL`: Email amministratore

3. **Avvia il progetto** con `npm run dev`
4. **Deploy** tramite il pulsante "Deploy" di Replit

## Deploy su altre piattaforme

### Prerequisiti
- Node.js 18+
- Database PostgreSQL
- Account SendGrid (per email)

### Variabili d'ambiente richieste
```env
DATABASE_URL=postgresql://user:pass@host:port/db
SENDGRID_API_KEY=your_api_key
FROM_EMAIL=noreply@domain.com
ADMIN_EMAIL=admin@domain.com
```

### Comandi di build
```bash
npm install
npm run db:push  # Setup database
npm run dev      # Development
npm run build    # Production build
```

## Configurazione Post-Deploy

### 1. Creazione utente admin
L'utente admin viene creato automaticamente con:
- Nome squadra: `admin`
- PIN: `1234`

### 2. Configurazione Email
Configura SendGrid per ricevere notifiche amministrative.

### 3. Upload Loghi
I loghi delle squadre sono salvati nel database come base64.

## Manutenzione

### Backup Database
Esegui backup regolari del database PostgreSQL:
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Monitoring
Monitora i log per errori e performance:
- Connessioni WebSocket
- Query database
- Autenticazione utenti

### Aggiornamenti
Per aggiornare l'applicazione:
1. Pull delle modifiche
2. Restart del servizio
3. Verifica funzionalità

## Supporto

Per problemi tecnici, controlla:
1. Log dell'applicazione
2. Stato del database
3. Configurazione variabili d'ambiente
4. Connettività SendGrid