const fs = require('fs');
const path = require('path');

const LOGO_GREEN = '#0c9344';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace hardcoded greens
  content = content.replace(/#10a37f/gi, LOGO_GREEN);
  content = content.replace(/#F2FBF6/gi, `${LOGO_GREEN}/5`); // very light bg
  
  // Replace emerald and teal with arbitrary shades
  // We want to map light shades (50, 100, 200) to opacity, and dark shades to solid
  content = content.replace(/bg-(emerald|teal)-50\b/g, `bg-[${LOGO_GREEN}]/10`);
  content = content.replace(/text-(emerald|teal)-50\b/g, `text-[${LOGO_GREEN}]/10`);
  content = content.replace(/border-(emerald|teal)-50\b/g, `border-[${LOGO_GREEN}]/10`);
  
  content = content.replace(/bg-(emerald|teal)-100\b/g, `bg-[${LOGO_GREEN}]/15`);
  content = content.replace(/text-(emerald|teal)-100\b/g, `text-[${LOGO_GREEN}]/15`);
  content = content.replace(/border-(emerald|teal)-100\b/g, `border-[${LOGO_GREEN}]/15`);

  content = content.replace(/bg-(emerald|teal)-200\b/g, `bg-[${LOGO_GREEN}]/25`);
  content = content.replace(/text-(emerald|teal)-200\b/g, `text-[${LOGO_GREEN}]/25`);
  content = content.replace(/border-(emerald|teal)-200\b/g, `border-[${LOGO_GREEN}]/25`);

  // For 300 to 900, we make it the exact color (solid)
  content = content.replace(/bg-(emerald|teal)-[3456789]00\b/g, `bg-[${LOGO_GREEN}]`);
  content = content.replace(/text-(emerald|teal)-[3456789]00\b/g, `text-[${LOGO_GREEN}]`);
  content = content.replace(/border-(emerald|teal)-[3456789]00\b/g, `border-[${LOGO_GREEN}]`);
  content = content.replace(/from-(emerald|teal)-[3456789]00\b/g, `from-[${LOGO_GREEN}]`);
  content = content.replace(/via-(emerald|teal)-[3456789]00\b/g, `via-[${LOGO_GREEN}]`);
  content = content.replace(/to-(emerald|teal)-[3456789]00\b/g, `to-[${LOGO_GREEN}]`);
  content = content.replace(/ring-(emerald|teal)-[3456789]00\b/g, `ring-[${LOGO_GREEN}]`);
  content = content.replace(/shadow-(emerald|teal)-[3456789]00\b/g, `shadow-[${LOGO_GREEN}]`);
  
  if (original !== content) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(tsx|ts|js|jsx|css)$/.test(file)) {
      processFile(fullPath);
    }
  }
}

walkDir('./src');
console.log('Done');
