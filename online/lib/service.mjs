import {createPost,editPost,addComment,joinMeetup,toggleReaction} from './post-model.mjs';
export const defaultProfile={university:'',department:'',bio:'',languages:'한국어',interests:'스터디, 언어교환, 취미'};
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const clean=(s,max)=>{if(typeof s!=='string'||!s.trim()||s.trim().length>max)fail('입력 길이를 확인해주세요.');return s.trim();};
const first=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
async function rows(db,sql,...args){return (await db.prepare(sql).bind(...args).all()).results;}
async function record(db,table,id){const r=await first(db,'SELECT payload,revision FROM '+table+' WHERE id=?',id);if(!r)fail('항목을 찾을 수 없어요.',404);return {...r,value:JSON.parse(r.payload)};}
async function update(db,table,id,fn){for(let i=0;i<6;i++){const r=await record(db,table,id),value=await fn(r.value);const result=await run(db,'UPDATE '+table+' SET payload=?,revision=revision+1 WHERE id=? AND revision=?',JSON.stringify(value),id,r.revision);if(result.meta.changes===1)return value;}fail('다른 변경과 겹쳤어요. 다시 시도해주세요.',409);}
async function profile(db,id){if(!id)return {nickname:'방문자',profile:defaultProfile};const p=await first(db,'SELECT name,details FROM profiles WHERE id=?',id);return p?{nickname:p.name,profile:JSON.parse(p.details)}:{nickname:'다이버',profile:defaultProfile};}
async function rate(db,id){const minute=Math.floor(Date.now()/60000);await run(db,'INSERT INTO limits(id,stamp,hits) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET hits=CASE WHEN limits.stamp=excluded.stamp THEN limits.hits+1 ELSE 1 END,stamp=excluded.stamp',id,minute);const r=await first(db,'SELECT hits FROM limits WHERE id=?',id);if(r.hits>60)fail('잠시 뒤 다시 시도해주세요.',429);}
async function roomAccess(db,room,userId,requireJoined=true){if(requireJoined&&!room.members.includes(userId))fail('채팅방에 먼저 참여해주세요.',403);if(room.meetupId){const p=(await record(db,'posts',room.meetupId)).value;if(!p.participants.includes(userId))fail('모임에 먼저 참여해주세요.',403);}}
export async function handle(db,user,method,path,body={}){
 const id=user?.userId;
 if(method!=='GET'){if(!id)fail('로그인 후 이용해주세요.',401);await rate(db,id);}
 if(method==='GET'&&path==='state'){
  const p=await profile(db,id),bookmarks=id?await rows(db,'SELECT post_id FROM saved WHERE user_id=?',id):[];
  const all=await rows(db,'SELECT payload FROM posts ORDER BY rowid DESC LIMIT 1000');
  const posts=all.map(r=>{const p=JSON.parse(r.payload);p.saved=bookmarks.some(b=>b.post_id===p.id)?[id]:[];return p;});
  return {...p,userId:id||null,posts};
 }
 if(path==='profile'&&method==='POST'){
  const name=clean(body.nickname,20),details={};
  for(const key of Object.keys(defaultProfile)){const v=body[key]??'';if(typeof v!=='string'||v.length>150)fail('프로필 항목은 150자 이내로 적어주세요.');details[key]=v.trim();}
  await run(db,'INSERT INTO profiles(id,name,details) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,details=excluded.details',id,name,JSON.stringify(details));return {ok:true};
 }
 if(path==='posts'&&method==='POST'){
  const p=createPost(body,id,(await profile(db,id)).nickname);
  // Only server-controlled author and reaction fields are persisted.
  await run(db,'INSERT INTO posts(id,payload) VALUES(?,?)',p.id,JSON.stringify(p));return {id:p.id};
 }
 const postRoute=path.match(/^posts\/([^/]+)\/(edit|delete|comment|likes|saved|join)$/);
 if(postRoute&&method==='POST'){
  const [,postId,action]=postRoute;
  if(action==='saved'){await record(db,'posts',postId);const r=await first(db,'SELECT post_id FROM saved WHERE user_id=? AND post_id=?',id,postId);if(r)await run(db,'DELETE FROM saved WHERE user_id=? AND post_id=?',id,postId);else await run(db,'INSERT OR IGNORE INTO saved(user_id,post_id) VALUES(?,?)',id,postId);return {ok:true};}
  if(action==='delete'){const p=(await record(db,'posts',postId)).value;if(p.authorId!==id)fail('내 글만 삭제할 수 있어요.',403);await db.batch([db.prepare('DELETE FROM posts WHERE id=?').bind(postId),db.prepare('DELETE FROM saved WHERE post_id=?').bind(postId),db.prepare('DELETE FROM rooms WHERE id=?').bind('meetup-'+postId)]);return {ok:true};}
  const name=(await profile(db,id)).nickname;
  await update(db,'posts',postId,p=>{if(action==='edit')return editPost(p,body,id);if(action==='comment')addComment(p,body.body,id,name);if(action==='likes')toggleReaction(p,'likes',id);if(action==='join'){if(p.type!=='meetup')fail('모임이 아닙니다.');joinMeetup(p,id);}return p;});return {id:postId};
 }
 if(path.startsWith('rooms')||path==='session'){
  if(!id)fail('로그인 후 채팅을 이용해주세요.',401);
  if(path==='session'&&method==='POST')return {id,name:(await profile(db,id)).nickname};
  if(path==='rooms'&&method==='GET'){
   const list=await rows(db,'SELECT payload FROM rooms ORDER BY rowid DESC LIMIT 300');
   return list.map(r=>JSON.parse(r.payload)).map(r=>({id:r.id,title:r.title,meetupId:r.meetupId,memberCount:r.members.length,joined:r.members.includes(id),count:r.messages.length,last:r.members.includes(id)?r.messages.at(-1)||null:null}));
  }
  if(path==='rooms'&&method==='POST'){
   let title=clean(body.title,80),meetupId=null,roomId=crypto.randomUUID();
   if(body.meetupId){meetupId=clean(body.meetupId,100);const p=(await record(db,'posts',meetupId)).value;if(p.type!=='meetup'||!p.participants.includes(id))fail('모임에 참여한 뒤 채팅할 수 있어요.',403);title=p.title;roomId='meetup-'+meetupId;}
   const room={id:roomId,title,meetupId,members:[id],messages:[],createdAt:new Date().toISOString()};
   await run(db,'INSERT OR IGNORE INTO rooms(id,payload) VALUES(?,?)',roomId,JSON.stringify(room));
   await update(db,'rooms',roomId,r=>{if(!r.members.includes(id))r.members.push(id);return r;});return {id:roomId};
  }
  const match=path.match(/^rooms\/([^/]+)(?:\/(join|leave|messages))?$/);if(match){
   const [,roomId,action]=match;
   if(method==='GET'&&!action){const r=(await record(db,'rooms',roomId)).value;await roomAccess(db,r,id);const people=await Promise.all(r.members.map(async userId=>({id:userId,name:(await profile(db,userId)).nickname})));return {...r,members:people};}
   if(method==='POST'&&action){const name=(await profile(db,id)).nickname;
    await update(db,'rooms',roomId,async r=>{
     if(action==='leave'){r.members=r.members.filter(m=>m!==id);return r;}
     await roomAccess(db,r,id,action!=='join');
     if(action==='join'){if(!r.members.includes(id))r.members.push(id);}
     if(action==='messages'){r.messages.push({id:crypto.randomUUID(),authorId:id,author:name,body:clean(body.body,2000),createdAt:new Date().toISOString()});}
     return r;
    });return {ok:true};
   }
  }
 }
 fail('지원하지 않는 요청입니다.',404);
}

