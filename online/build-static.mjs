import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';

function parseEnv(text){
 return Object.fromEntries(text.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#')).map(line=>{
  const separator=line.indexOf('=');if(separator<0)return null;
  const key=line.slice(0,separator).trim(),value=line.slice(separator+1).trim().replace(/^(["'])(.*)\1$/,'$2');
  return key?[key,value]:null;
 }).filter(Boolean));
}

async function readEnvFile(path){
 try{return await readFile(path,'utf8');}
 catch(error){if(error.code==='ENOENT')return '';throw error;}
}

const env={...parseEnv(await readEnvFile('.env')),...parseEnv(await readEnvFile('.env.local')),...process.env};
const supabaseUrl=env.SUPABASE_URL||'',supabaseKey=env.SUPABASE_PUBLISHABLE_KEY||'';
if(Boolean(supabaseUrl)!==Boolean(supabaseKey))throw Error('Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
await mkdir('dist',{recursive:true});
await cp('static-site','dist',{recursive:true});
await writeFile('dist/js/supabase-config.js',`// Generated from local build environment. This file is public in the static site.\nexport const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};\nexport const SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(supabaseKey)};\n`);
for(const file of ['index.html','chat.html','js/app.js','js/auth.js','js/supabase-config.js','js/map.js','assets/map-config.json']){
 const data=await readFile('dist/'+file,'utf8');if(!data.trim())throw Error('Empty asset: '+file);
}
console.log('Static site ready: dist (no chat records or private environment files).');

