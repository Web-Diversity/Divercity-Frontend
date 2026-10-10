import {randomUUID} from 'node:crypto';
const clean=(s,max)=>{if(typeof s!=='string'||!s.trim()||s.trim().length>max)throw Error('입력 길이를 확인해주세요.');return s.trim();};
export function newChatState(){return {sessions:[],rooms:[{id:'campus-lounge',title:'캠퍼스 라운지',members:[],messages:[],createdAt:new Date().toISOString()}]};}
export function createSession(db,name){const session={id:randomUUID(),token:randomUUID(),name:clean(name,20)};db.sessions.push(session);return session;}
export function user(db,token){const u=db.sessions.find(x=>x.token===token);if(!u)throw Error('채팅 프로필을 다시 연결해주세요.');return u;}
export function createRoom(db,token,title,meetupId){const u=user(db,token);title=clean(title,80);if(meetupId){meetupId=clean(meetupId,100);const old=db.rooms.find(r=>r.meetupId===meetupId);if(old){joinRoom(db,token,old.id);return old;}}const room={id:randomUUID(),title,meetupId,members:[u.id],messages:[],createdAt:new Date().toISOString()};db.rooms.push(room);return room;}
export function roomById(db,id){const r=db.rooms.find(r=>r.id===id);if(!r)throw Error('채팅방을 찾을 수 없어요.');return r;}
export function joinRoom(db,token,id){const u=user(db,token),r=roomById(db,id);if(!r.members.includes(u.id))r.members.push(u.id);return r;}
export function leaveRoom(db,token,id){const u=user(db,token),r=roomById(db,id);r.members=r.members.filter(x=>x!==u.id);}
export function sendMessage(db,token,id,body){const u=user(db,token),r=roomById(db,id);if(!r.members.includes(u.id))throw Error('채팅방에 먼저 참여해주세요.');const m={id:randomUUID(),authorId:u.id,author:u.name,body:clean(body,2000),createdAt:new Date().toISOString()};r.messages.push(m);return m;}
export function getRoom(db,token,id){const u=user(db,token),r=roomById(db,id);if(!r.members.includes(u.id))throw Error('채팅방에 먼저 참여해주세요.');return {...r,members:r.members.map(id=>({id,name:db.sessions.find(s=>s.id===id)?.name||'다이버'}))};}
export function listRooms(db,token){const u=user(db,token);return db.rooms.map(r=>({id:r.id,title:r.title,meetupId:r.meetupId,memberCount:r.members.length,joined:r.members.includes(u.id),count:r.messages.length,last:r.messages.at(-1)||null}));}

