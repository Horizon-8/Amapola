import { readFileSync } from 'node:fs';

// Execute the actual feature factories in the existing simulated DOM. No
// browser process is started, and UI actions can still be replaced by a test.
export function uiDefinitions() {
  const modules=['assets','calendar','students','classes','planning','google','settings','forms'];
  const factories=modules.map(name=>readFileSync(new URL(`../app/public/ui/${name}.mjs`,import.meta.url),'utf8').replace(/^export /gm,'')).join('\n');
  const source=readFileSync(new URL('../app/public/app.js',import.meta.url),'utf8');
  return factories+'\n'+source.slice(source.indexOf('/* Amapola'),source.indexOf("document.addEventListener('click'"));
}
