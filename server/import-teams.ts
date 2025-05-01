import { db } from "./db";
import { teams } from "@shared/schema";
import { eq } from "drizzle-orm";

const teamData = [
  {
    name: "US Lecce",
    managerName: "Paride Ficiente & Pio delle Sberle",
    credits: 35,
    logo: "/team-logos/us-lecce.png"
  },
  {
    name: "AS PIZZIGHETTONE CALCIO 2K22",
    managerName: "Franluca & Granatiero",
    credits: 33,
    logo: "/team-logos/as-pizzighettone.png"
  },
  {
    name: "BOCA JUNIORS",
    managerName: "DDR",
    credits: 0,
    logo: "/team-logos/boca-juniors.png"
  },
  {
    name: "Club Deportivo Tenerife",
    managerName: "Pablo Gavira & Ninolr",
    credits: 18,
    logo: "/team-logos/tenerife.png"
  },
  {
    name: "Fc Como",
    managerName: "Fabregas & Fabregas bis",
    credits: 12,
    logo: "/team-logos/como.png"
  },
  {
    name: "LIVERPOOL FC",
    managerName: "Henry&Victor Gambero",
    credits: 12,
    logo: "/team-logos/liverpool.png"
  },
  {
    name: "NOCERINA",
    managerName: "mikeRaf & RaffMike",
    credits: 2,
    logo: "/team-logos/nocerina.png"
  },
  {
    name: "Newells Old Boys",
    managerName: "El Loco Bielsa & Magnato",
    credits: 6,
    logo: "/team-logos/newells.png"
  },
  {
    name: "Real Madrid",
    managerName: "Micione",
    credits: 26,
    logo: "/team-logos/real-madrid.png"
  },
  {
    name: "US PERGOLETTESE 1932",
    managerName: "I capelloni & pasqualeprudente7",
    credits: 16,
    logo: "/team-logos/pergolettese.png"
  }
];

async function importTeams() {
  try {
    console.log("Starting team import...");
    
    for (const team of teamData) {
      // Check if team already exists
      const existingTeam = await db.select().from(teams).where(eq(teams.name, team.name));
      
      if (existingTeam.length === 0) {
        // Insert new team
        const [newTeam] = await db.insert(teams).values(team).returning();
        console.log(`Created team: ${newTeam.name}`);
      } else {
        console.log(`Team already exists: ${team.name}`);
      }
    }
    
    console.log("Team import completed!");
  } catch (error) {
    console.error("Error importing teams:", error);
  }
}

importTeams().then(() => process.exit(0));