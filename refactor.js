const fs = require('fs');

let content = fs.readFileSync('src/components/interactive/SavingsCalculator.tsx', 'utf8');

const regex = /<div\s+className=\{`grid[^`]*?\$\{\s*(.*?)\s*\?\s*'grid-rows-\[1fr\] opacity-100(.*?)'\s*:\s*'grid-rows-\[0fr\] opacity-0.*?'\s*\}`\}\s*>\s*<div className="overflow-hidden">/gs;

let match;
let newContent = content;

const matches = [];
while ((match = regex.exec(content)) !== null) {
  matches.push({
    start: match.index,
    end: regex.lastIndex,
    cond: match[1].trim(),
    mt: match[2].trim()
  });
}

for (let i = matches.length - 1; i >= 0; i--) {
  let m = matches[i];
  
  let openDivs = 1;
  let j = m.end;
  while (openDivs > 0 && j < newContent.length) {
    if (newContent.substr(j, 4) === '<div' && newContent.substr(j, 5) !== '<div/') {
      const closeTagIdx = newContent.indexOf('>', j);
      if (newContent[closeTagIdx - 1] !== '/') {
        openDivs++;
      }
      j += 4;
    } else if (newContent.substr(j, 6) === '</div>') {
      openDivs--;
      if (openDivs === 0) {
        let k = newContent.indexOf('</div>', j + 6);
        if (k !== -1) {
          newContent = newContent.substring(0, k) + ')}' + newContent.substring(k + 6);
        }
      }
      j += 6;
    } else {
      j++;
    }
  }

  const replacement = `{${m.cond} && (\n<div className="${m.mt} animate-in fade-in slide-in-from-top-4 duration-500">`;
  const original = newContent.substring(m.start, m.end);
  newContent = newContent.replace(original, replacement);
}

fs.writeFileSync('src/components/interactive/SavingsCalculator.tsx', newContent);