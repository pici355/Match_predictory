# Architecture Overview

## Overview

FantaSchedina Web is a full-stack web application for soccer match prediction competitions. The application allows users to make predictions for upcoming matches, assign credits to those predictions, and compete for prizes based on correct predictions. The system features user authentication, match management, prediction tracking, and prize distribution.

The application uses a modern stack with a clear separation between client and server components:

- **Frontend**: React with TypeScript
- **Backend**: Node.js/Express
- **Database**: PostgreSQL with Drizzle ORM
- **Build Tools**: Vite for frontend bundling, esbuild for backend bundling

## System Architecture

The application follows a traditional client-server architecture with a RESTful API layer connecting them:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │      │   Server    │      │  Database   │
│   (React)   │<────>│  (Express)  │<────>│ (PostgreSQL)│
└─────────────┘      └─────────────┘      └─────────────┘
```

### Key Architectural Decisions

1. **Monorepo Structure**
   - The project uses a monorepo approach, keeping both client and server code in a single repository
   - Shared types and schemas in the `shared` directory ensure type safety across the stack

2. **API-First Design**
   - RESTful API endpoints handle all data operations
   - Frontend components consume these APIs using React Query for data fetching and caching

3. **Schema-Driven Development**
   - Database schema defined using Drizzle ORM
   - Zod schemas for validation across frontend and backend

4. **Session-Based Authentication**
   - Uses Express sessions with PostgreSQL session store
   - Simple username/PIN authentication for ease of use

## Key Components

### Frontend Components

#### Core Structure
- Uses React with TypeScript
- State management via React Query
- UI built with shadcn/ui components (based on Radix UI primitives)
- Form handling with React Hook Form and Zod validation

#### Main Pages
- `HomePage` - Main user interface for predictions
- `LoginPage` - Authentication page
- `AdminPage` - Interface for system administration

#### Key Features
- Match prediction interface
- User prediction history
- Admin panels for match, user, and team management
- Timezone detection and handling
- Prediction receipt generation and sharing

### Backend Components

#### Core Structure
- Express.js server with TypeScript
- RESTful API endpoints
- Session-based authentication
- Database access via Drizzle ORM

#### API Routes
- User authentication and management
- Match and prediction handling
- Team management
- Admin functions

#### Services
- Email notifications via SendGrid
- File uploads for team logos
- Prize distribution calculations

### Database Schema

The database uses PostgreSQL with the following key tables:

1. **users**
   - Stores user accounts with authentication information
   - Includes admin flag for permission management

2. **matches**
   - Contains match information (teams, date, match day)
   - Tracks match results

3. **predictions**
   - Stores user predictions for matches
   - Links to users and matches
   - Tracks correctness and credits assigned

4. **teams**
   - Stores team information including logos and manager names

5. **prize_distributions**
   - Tracks prize calculations and distributions
   - Uses percentage-based scoring system

## Data Flow

### Authentication Flow
1. User submits username and PIN on login page
2. Server validates credentials against database
3. On success, server creates a session and returns user information
4. Client stores session cookie for subsequent requests

### Prediction Flow
1. User selects matches and makes predictions
2. Predictions are sent to the server and stored in the database
3. When matches conclude, admin enters results
4. System automatically marks predictions as correct/incorrect
5. Prize distributions are calculated based on prediction accuracy

### Admin Flow
1. Admin logs in with admin credentials
2. Admin can manage matches, users, and teams
3. Admin can import matches from Excel
4. Admin can calculate and distribute prizes

## External Dependencies

### Frontend Dependencies
- React and React DOM
- React Query for data fetching
- React Hook Form for form handling
- Radix UI for accessible UI components
- Tailwind CSS for styling
- Zod for schema validation
- date-fns for date manipulation

### Backend Dependencies
- Express for HTTP server
- Drizzle ORM for database access
- SendGrid for email notifications
- Multer for file uploads
- connect-pg-simple for session management

### Development Dependencies
- TypeScript
- Vite for frontend building
- esbuild for backend bundling
- ESLint and Prettier for code quality

## Deployment Strategy

The application is configured for deployment on Replit with auto-scaling capabilities:

```
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]
```

### Build Process
1. Frontend is built using Vite (`vite build`)
2. Backend is bundled using esbuild
3. Combined output is placed in the `/dist` directory

### Database Connection
- Uses Neon PostgreSQL (serverless Postgres)
- Connection details provided via environment variables

### Environment Configuration
- Development mode uses hot-reloading via Vite
- Production mode serves pre-built static assets

### Workflows
- Configured workflows for development and production
- Port 5000 is mapped to external port 80

## Security Considerations

- Session-based authentication with HTTP-only cookies
- PIN-based authentication (simpler than password, appropriate for a fantasy sports app)
- Database credentials stored in environment variables
- Input validation using Zod schemas

## Future Extensibility

The architecture supports future extensions in several ways:

1. **Component-Based Frontend**
   - New features can be added by creating new React components

2. **Modular API Design**
   - New API endpoints can be easily added to the Express server

3. **Schema-Driven Database**
   - Database schema can be extended with new tables or columns using Drizzle migrations

4. **Timezone Support**
   - Built-in support for different timezones allows for international user base