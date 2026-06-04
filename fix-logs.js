const fs = require('fs');
const path = require('path');

const targetDirs = [
  'src/components',
  'src/app/admin',
  'src/app/seguir',
  'src/hooks',
];

const walk = (dir) => {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

let allFiles = [];
targetDirs.forEach(dir => {
  allFiles = allFiles.concat(walk(path.join(__dirname, dir)));
});

const importStmt = "import { logger } from '@/lib/logger/security-logger';\n";

let fixedCount = 0;

for (const file of allFiles) {
  if (file.includes('__tests__') || file.includes('.test.ts')) continue;
  if (file.includes('security-logger.ts')) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Replace console.log -> logger.info (since logger.log doesn't exist)
  if (/console\.log/g.test(content)) {
    content = content.replace(/console\.log/g, 'logger.info');
    changed = true;
  }
  
  if (/console\.(warn|info|error)/g.test(content)) {
    content = content.replace(/console\.(warn|info|error)/g, 'logger.$1');
    changed = true;
  }
  
  if (changed) {
    if (!content.includes("@/lib/logger/security-logger") && !content.includes("SecurityLogger")) {
      if (content.startsWith("'use client';") || content.startsWith('"use client";')) {
         content = content.replace(/^(['"]use client['"];?\r?\n)/, match => match + importStmt);
      } else {
         content = importStmt + content;
      }
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
    fixedCount++;
  }
}
console.log('Total fixed files:', fixedCount);
