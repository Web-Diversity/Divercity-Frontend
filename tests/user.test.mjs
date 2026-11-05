import test from 'node:test';
import assert from 'node:assert/strict';
import {newUserState,signup,login,userByToken} from '../user-model.mjs';
test('signup then login works and tokens identify the user',async()=>{
 const db=newUserState();
 const a=await signup(db,{username:'Diver_A',password:'password123',nickname:'다이버 A'});
 assert.equal(a.username,'diver_a');assert.equal(userByToken(db,a.token).id,a.id);
 const l=await login(db,{username:'DIVER_a',password:'password123'});
 assert.equal(l.id,a.id);assert.notEqual(l.token,a.token);assert.equal(userByToken(db,l.token).nickname,'다이버 A');
});
test('wrong credentials and unknown tokens are rejected with 401',async()=>{
 const db=newUserState();await signup(db,{username:'diver',password:'password123',nickname:'다이버'});
 await assert.rejects(login(db,{username:'diver',password:'wrong-password'}),{status:401});
 await assert.rejects(login(db,{username:'nobody',password:'password123'}),{status:401});
 await assert.rejects(login(db,{}),{status:401});
 assert.throws(()=>userByToken(db,'invalid'),{status:401});
});
test('signup validates input (400) and rejects duplicates case-insensitively (409)',async()=>{
 const db=newUserState();await signup(db,{username:'diver',password:'password123',nickname:'다이버'});
 await assert.rejects(signup(db,{username:'DIVER',password:'password123',nickname:'다른 다이버'}),{status:409});
 await assert.rejects(signup(db,{username:'ab',password:'password123',nickname:'x'}),{status:400});
 await assert.rejects(signup(db,{username:'bad name!',password:'password123',nickname:'x'}),{status:400});
 await assert.rejects(signup(db,{username:'newuser',password:'short',nickname:'x'}),{status:400});
 await assert.rejects(signup(db,{username:'newuser',password:'password123',nickname:' '}),{status:400});
 assert.equal(db.users.length,1);
});
test('concurrent signups with the same username create only one account',async()=>{
 const db=newUserState();const r=await Promise.allSettled([1,2].map(()=>signup(db,{username:'same',password:'password123',nickname:'동시'})));
 assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(db.users.length,1);
});
test('stored data has no plaintext password or raw token, and salts differ',async()=>{
 const db=newUserState();const a=await signup(db,{username:'one',password:'password123',nickname:'하나'});
 await signup(db,{username:'two',password:'password123',nickname:'둘'});
 const stored=JSON.stringify(db);
 assert.equal(stored.includes('password123'),false);assert.equal(stored.includes(a.token),false);
 assert.notEqual(db.users[0].passwordHash,db.users[1].passwordHash);
 assert.equal('passwordHash' in a,false);assert.equal(JSON.stringify(a).includes(db.users[0].passwordHash),false);
});
