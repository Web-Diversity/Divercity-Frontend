import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('HTTP: signup/login return proper statuses, persist across restart, and keep secrets private',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'divercity-user-test-'));
 let child;
 async function start(){child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:'5199',CLASSROOM_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Server timeout')),8000);child.stdout.once('data',()=>{clearTimeout(timeout);resolve();});child.once('exit',code=>{clearTimeout(timeout);reject(Error('Server exited '+code));});});}
 async function stop(){if(child&&!child.killed){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}}
 async function api(p,body){const r=await fetch('http://127.0.0.1:5199/api/'+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 const account={username:'api_diver',password:'password123',nickname:'API 다이버'};
 try{await start();
 const s=await api('signup',account);
 assert.equal(s.status,201);assert.ok(s.data.token);assert.equal(s.data.nickname,'API 다이버');
 assert.equal(JSON.stringify(s.data).includes('passwordHash'),false);
 assert.equal((await api('signup',{...account,username:'API_DIVER'})).status,409);
 assert.equal((await api('signup',{...account,username:'x',password:'short'})).status,400);
 assert.equal((await api('login',{username:'api_diver',password:'nope-nope'})).status,401);
 const stored=await readFile(path.join(dir,'users.json'),'utf8');
 assert.equal(stored.includes('password123'),false);assert.equal(stored.includes(s.data.token),false);
 for(const file of ['user-model.mjs','.data/users.json','users.json'])assert.equal((await fetch('http://127.0.0.1:5199/'+file)).status,404);
 assert.equal((await fetch('http://127.0.0.1:5199/api/login',{method:'POST',headers:{Origin:'https://example.com'},body:'{}'})).status,403);
 await stop();await start();
 const l=await api('login',{username:'api_diver',password:'password123'});
 assert.equal(l.status,200);assert.equal(l.data.id,s.data.id);
 }finally{await stop();}
});
