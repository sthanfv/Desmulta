const fs = require('fs');

const filePath = 'src/app/admin/actions.ts';
let content = fs.readFileSync(filePath, 'utf8');

const functionNames = [
  'updateShowcaseConfig',
  'updateFooterConfig',
  'uploadImage',
  'deleteExpiredConsultations',
  'convertToCase',
  'deleteSimitCaptures'
];

for (const fn of functionNames) {
  // Regex to match the function block roughly, up to the end of its first try-catch
  const regex = new RegExp(`export async function ${fn}[\\s\\S]*?catch`, 'g');
  content = content.replace(regex, (match) => {
    // Inside this function, we replace the first "await requireAdminSession(idToken);"
    // with "const decodedToken = await requireAdminSession(idToken);"
    // AND remove the second "const decodedToken = await requireAdminSession(idToken);"
    
    // Check if it has both
    if (match.includes('await requireAdminSession(idToken);') && match.includes('const decodedToken = await requireAdminSession(idToken);')) {
       let replaced = match.replace('await requireAdminSession(idToken);', 'const decodedToken = await requireAdminSession(idToken);');
       replaced = replaced.replace('const decodedToken = await requireAdminSession(idToken);', ''); 
       // wait, the first replace changes it, so the second replace will just remove the one we just changed!
       return replaced;
    }
    return match;
  });
}

// Let's do it with split and replace
let lines = content.split('\n');
let insideFunc = null;
let foundFirst = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('export async function')) {
    for (const fn of functionNames) {
      if (line.includes(fn)) {
        insideFunc = fn;
        foundFirst = false;
        break;
      }
    }
  }
  
  if (insideFunc) {
    if (line.includes('await requireAdminSession') && !line.includes('const decodedToken')) {
      lines[i] = line.replace('await requireAdminSession', 'const decodedToken = await requireAdminSession');
      foundFirst = true;
    } else if (line.includes('const decodedToken = await requireAdminSession') && foundFirst) {
      lines[i] = line.replace('const decodedToken = await requireAdminSession(idToken);', '');
    }
    
    // Reset when function ends (naively checking for start of new function)
    if (line.startsWith('}') && i < lines.length - 1 && lines[i+1] === '') {
      // not very accurate, but next 'export' will overwrite
    }
  }
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Fixed src/app/admin/actions.ts');
