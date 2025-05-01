const fs = require('fs');
const path = require('path');

// Team names from the application
const teams = [
  'us-lecce',
  'as-pizzighettone',
  'boca-juniors',
  'tenerife',
  'como',
  'liverpool',
  'nocerina',
  'newells',
  'real-madrid',
  'pergolettese'
];

// Create the directory if it doesn't exist
const logoDir = path.join('attached_assets', 'team-logos');
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

// Generate a simple SVG for each team
for (const team of teams) {
  // Create a unique color based on the team name
  const hash = team.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const color = `#${Math.abs(hash).toString(16).padStart(6, '0').substring(0, 6)}`;
  
  // First two letters of the team name in uppercase
  const letters = team.split('-')[0].substring(0, 2).toUpperCase();
  
  // Create a simple SVG
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="45" fill="${color}" />
    <text x="50" y="50" font-family="Arial" font-size="40" fill="white" text-anchor="middle" dominant-baseline="central">
      ${letters}
    </text>
  </svg>
  `;
  
  // Save the SVG
  fs.writeFileSync(path.join(logoDir, `${team}.png`), svg);
  console.log(`Created logo for ${team}`);
}

console.log('All logos created successfully!');