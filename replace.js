const fs = require('fs');

let content = fs.readFileSync('src/components/interactive/SavingsCalculator.tsx', 'utf8');

// Reemplazar 'grid transition-all' por 'transition-all'
content = content.replace(/grid transition-all/g, 'transition-all');

// Reemplazar 'grid-rows-[1fr] opacity-100' por 'block animate-in fade-in zoom-in-95'
content = content.replace(/grid-rows-\[1fr\] opacity-100/g, 'block animate-in fade-in zoom-in-95');

// Reemplazar 'grid-rows-[0fr] opacity-0' por 'hidden'
content = content.replace(/grid-rows-\[0fr\] opacity-0/g, 'hidden');

// También hay un caso que tiene: 'grid transition-all duration-300' (línea 409)
// El primer replace ya lo arregló porque busca 'grid transition-all'.

fs.writeFileSync('src/components/interactive/SavingsCalculator.tsx', content);
console.log("Reemplazos simples completados.");
