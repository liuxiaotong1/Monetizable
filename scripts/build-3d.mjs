import {build} from 'esbuild';
await Promise.all([
 ['public/heroes/hero-source.js','public/heroes/hero.js'],
 ['public/heroes/duo-source.js','public/heroes/duo.js'],
 ['public/battle-demo/scene-source.js','public/battle-demo/scene.js'],
].map(([entry,outfile])=>build({entryPoints:[entry],outfile,bundle:true,minify:true,format:'esm',logLevel:'info'})));
