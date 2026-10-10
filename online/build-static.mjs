import {cp,mkdir,readFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await cp('static-site','dist',{recursive:true});
for(const file of ['index.html','chat.html','js/app.js','js/map.js','assets/map-config.json']){
 const data=await readFile('dist/'+file,'utf8');if(!data.trim())throw Error('Empty asset: '+file);
}
console.log('Static site ready: dist (no chat records or private environment files).');

