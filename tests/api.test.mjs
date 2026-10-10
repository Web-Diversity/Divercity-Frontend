import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('HTTP: two sessions exchange persisted messages, and private files stay private',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'divercity-chat-test-'));
 let child;
 async function start(){child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:'5198',CLASSROOM_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Server timeout')),8000);child.stdout.once('data',()=>{clearTimeout(timeout);resolve();});child.once('exit',code=>{clearTimeout(timeout);reject(Error('Server exited '+code));});});}
 async function stop(){if(child&&!child.killed){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}}
 async function api(p,body,token){const r=await fetch('http://127.0.0.1:5198/api/'+p,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};}
 try{await start();
 const a=(await api('session',{name:'테스트 A'})).data,b=(await api('session',{name:'테스트 B'})).data;
 const room=(await api('rooms',{title:'API 통합 테스트'},a.token)).data;
 assert.equal((await api('rooms/'+room.id+'/messages',{body:'거부될 메시지'},b.token)).status,400);
 await api('rooms/'+room.id+'/join',{},b.token);
 assert.equal((await api('rooms/'+room.id+'/messages',{body:'서로 다른 세션의 대화'},b.token)).status,200);
 const view=(await api('rooms/'+room.id,undefined,a.token)).data;
 assert.equal(view.messages[0].authorId,b.id);assert.equal(view.members.length,2);
 assert.equal(JSON.stringify(view).includes(b.token),false);
 for(const file of ['.env.local','.data/chat.json','server.mjs','chat-model.mjs'])assert.equal((await fetch('http://127.0.0.1:5198/'+file)).status,404);
 assert.equal((await fetch('http://127.0.0.1:5198/api/rooms',{headers:{Origin:'https://example.com'}})).status,403);
 await stop();await start();const reloaded=(await api('rooms/'+room.id,undefined,a.token)).data;assert.equal(reloaded.messages.length,1);
 }finally{await stop();}
});
