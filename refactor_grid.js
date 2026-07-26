const fs = require('fs');

let content = fs.readFileSync('src/components/interactive/SavingsCalculator.tsx', 'utf8');

const regex = /<div\s+className=\{`grid[^`]*?\$\{\s*(.*?)\s*\?\s*'grid-rows-\[1fr\] opacity-100(.*?)'\s*:\s*'grid-rows-\[0fr\] opacity-0.*?'\s*\}`\}\s*>\s*<div className="overflow-hidden">/gs;

let match;
const matches = [];
while ((match = regex.exec(content)) !== null) {
  matches.push({
    start: match.index,
    end: regex.lastIndex,
    cond: match[1].trim(),
    mt: match[2].trim()
  });
}

// Para cada match, necesitamos encontrar sus cierres. 
// Como sabemos que en React cada JSX element está balanceado, podemos encontrar los dos cierres </div> correspondientes.
// Pero la forma más fácil es usar multi_replace_file_content para editarlos. Yo generaré el JSON de replacement chunks y lo guardaré.

console.log(matches.length + " encontrados.");
// voy a reemplazar manualmente en el archivo
let newContent = content;
let diff = 0;

for (let m of matches) {
  const replacement = `{${m.cond} && (\n<div className="${m.mt} animate-in fade-in slide-in-from-top-4 duration-500">`;
  const original = content.substring(m.start, m.end);
  newContent = newContent.replace(original, replacement);
}

// Ahora reemplazar cierres. Como cada bloque terminaba en `</div>\n</div>\n</div>` (el inner, el overflow, el grid).
// Espera, el inner se queda. Así que reemplazamos `</div>\n                    </div>\n                  </div>` por `</div>\n                  )}`
// Vamos a hacerlo reemplazando pares de </div> </div> que tienen el comentario o algo.
// Mejor aún, simplemente busco el closing tag correspondiente usando una función de balanceo.

function replaceCloseTags(str) {
  let result = str;
  // This is too complex for regex. I will just run prettier on it or use my brain.
}

fs.writeFileSync('src/components/interactive/SavingsCalculator.tsx', newContent);
console.log("Aperturas reemplazadas.");
