import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as chat from './chat-model.mjs';
import * as userModel from './user-model.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.CLASSROOM_DATA_DIR||path.join(root,'.data');
await mkdir(dataDir,{recursive:true});
let db;try{db=JSON.parse(await readFile(path.join(dataDir,'chat.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;db=chat.newChatState();}
let users;try{users=JSON.parse(await readFile(path.join(dataDir,'users.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;users=userModel.newUserState();}
let token='';try{const env=await readFile(path.join(root,'.env.local'),'utf8');token=env.trim().match(/^MAPBOX_PUBLIC_TOKEN=(pk\.[^\s]+)/m)?.[1]||'';}catch{}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2'};
let saving=Promise.resolve();
function persist(){const snapshot=JSON.stringify(db);saving=saving.then(async()=>{await writeFile(path.join(dataDir,'chat.tmp'),snapshot);await rename(path.join(dataDir,'chat.tmp'),path.join(dataDir,'chat.json'));});return saving;}
let savingUsers=Promise.resolve();
function persistUsers(){const snapshot=JSON.stringify(users);savingUsers=savingUsers.then(async()=>{await writeFile(path.join(dataDir,'users.tmp'),snapshot);await rename(path.join(dataDir,'users.tmp'),path.join(dataDir,'users.json'));});return savingUsers;}
async function readBody(req){let body='';for await(const part of req){body+=part;if(body.length>12000)throw Error('요청이 너무 큽니다.');}return JSON.parse(body||'{}');}
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
http.createServer(async(req,res)=>{
 const base='http://'+req.headers.host;
 try{
  if(!['127.0.0.1','localhost'].includes(new URL(base).hostname)){json(res,403,{error:'Local access only'});return;}
  const url=new URL(req.url,base);
  if(url.pathname.startsWith('/api/')){
   if(req.headers.origin&&req.headers.origin!==base){json(res,403,{error:'다른 사이트에서는 요청할 수 없어요.'});return;}
   if(url.pathname==='/api/config'&&req.method==='GET'){json(res,200,{mapboxToken:token});return;}
   const auth=(req.headers.authorization||'').replace(/^Bearer /,'');
   if(req.method==='GET'){
    if(url.pathname==='/api/rooms'){json(res,200,chat.listRooms(db,auth));return;}
    if(url.pathname.startsWith('/api/rooms/')){json(res,200,chat.getRoom(db,auth,url.pathname.split('/')[3]));return;}
   }
   if(req.method==='POST'&&(url.pathname==='/api/signup'||url.pathname==='/api/login')){
    const body=await readBody(req);const signingUp=url.pathname==='/api/signup';
    const result=await (signingUp?userModel.signup:userModel.login)(users,body);
    await persistUsers();json(res,signingUp?201:200,result);return;
   }
   if(req.method==='POST'){
    const body=await readBody(req);let result;
    if(url.pathname==='/api/session')result=chat.createSession(db,body.name);
    else if(url.pathname==='/api/rooms')result=chat.createRoom(db,auth,body.title,body.meetupId);
    else {const [,api,rooms,id,action]=url.pathname.split('/');if(api!=='api'||rooms!=='rooms')throw Error('잘못된 요청입니다.');
     if(action==='join')result=chat.joinRoom(db,auth,id);
     else if(action==='leave'){chat.leaveRoom(db,auth,id);result={ok:true};}
     else if(action==='messages')result=chat.sendMessage(db,auth,id,body.body);
     else throw Error('잘못된 요청입니다.');}
    await persist();
    // Only the session endpoint returns a token; no other user's session is exposed.
    if(url.pathname==='/api/session')json(res,201,result);else json(res,200,{id:result.id,ok:true});
    return;
   }
   json(res,404,{error:'지원하지 않는 요청입니다.'});return;
  }
  const relative=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/, '');
  // Serve only public website files, never tokens, chat storage or server modules.
  if(!/^(?:[a-z-]+\.html|(?:css|js|assets)\/[a-zA-Z0-9_.\/-]+)$/.test(relative)||relative.split('/').some(p=>p.startsWith('.'))){res.writeHead(404);res.end();return;}
  const file=path.resolve(root,relative),ext=path.extname(file);
  if(!file.startsWith(root+path.sep)||!types[ext]){res.writeHead(404);res.end();return;}
  const content=await readFile(file);res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);
 }catch(e){if(req.url.startsWith('/api/'))json(res,e.status||400,{error:e.message});else{res.writeHead(404);res.end('Not found');}}
}).listen(Number(process.env.PORT)||5187,'127.0.0.1',()=>console.log('Classroom preview: http://127.0.0.1:'+(process.env.PORT||5187)));

