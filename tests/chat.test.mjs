import test from 'node:test';
import assert from 'node:assert/strict';
import {newChatState,createSession,createRoom,joinRoom,leaveRoom,sendMessage,getRoom} from '../chat-model.mjs';
test('session tokens protect message authorship and membership',()=>{
 const db=newChatState();const a=createSession(db,'다이버 A'),b=createSession(db,'다이버 B');
 const room=createRoom(db,a.token,'스터디','meetup-1');
 assert.throws(()=>sendMessage(db,'invalid',room.id,'안녕'));
 assert.throws(()=>sendMessage(db,b.token,room.id,'안녕'));
 joinRoom(db,b.token,room.id);const m=sendMessage(db,b.token,room.id,'안녕하세요');
 assert.equal(m.author,'다이버 B');assert.equal(getRoom(db,a.token,room.id).messages.length,1);
 assert.throws(()=>sendMessage(db,a.token,room.id,' '));assert.throws(()=>sendMessage(db,a.token,room.id,'a'.repeat(2001)));
 leaveRoom(db,b.token,room.id);assert.throws(()=>sendMessage(db,b.token,room.id,'다시'));
});
test('meetup chat creation is idempotent and validates room names',()=>{
 const db=newChatState(),a=createSession(db,'다이버');
 assert.throws(()=>createRoom(db,a.token,' '));
 const r=createRoom(db,a.token,'같이 공부','meetup-1');
 assert.equal(createRoom(db,a.token,'같이 공부','meetup-1').id,r.id);
});