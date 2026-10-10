const KEY='divercity-public-chat-demo';
export function localChatRequest(path,body,session){
 const db=JSON.parse(localStorage.getItem(KEY)||'null')||{rooms:[{id:'campus-lounge',title:'캠퍼스 라운지',members:[],messages:[]}],users:[]};
 const save=()=>localStorage.setItem(KEY,JSON.stringify(db));
 const text=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw Error('입력 내용을 확인해주세요.');return value.trim();};
 if(path==='session'&&body){const u={id:crypto.randomUUID(),token:crypto.randomUUID(),name:text(body.name,20)};db.users.push(u);save();return u;}
 if(!session||!db.users.some(u=>u.id===session.id))throw Error('체험 프로필을 다시 연결해주세요.');
 const id=session.id;
 if(path==='rooms'&&!body)return db.rooms.map(r=>({id:r.id,title:r.title,meetupId:r.meetupId,memberCount:r.members.length,joined:r.members.includes(id),last:r.messages.at(-1)||null,count:r.messages.length}));
 if(path==='rooms'&&body){let r=body.meetupId?db.rooms.find(r=>r.meetupId===body.meetupId):null;if(!r){r={id:crypto.randomUUID(),title:text(body.title,80),meetupId:body.meetupId||null,members:[],messages:[]};db.rooms.push(r);}if(!r.members.includes(id))r.members.push(id);save();return {id:r.id};}
 const [,roomId,action]=path.split('/'),r=db.rooms.find(r=>r.id===roomId);if(!r)throw Error('채팅방을 찾을 수 없어요.');
 if(action==='join'&&body){if(!r.members.includes(id))r.members.push(id);}
 else if(action==='leave'&&body)r.members=r.members.filter(m=>m!==id);
 else if(action==='messages'&&body){if(!r.members.includes(id))throw Error('채팅방에 먼저 참여해주세요.');r.messages.push({id:crypto.randomUUID(),authorId:id,author:session.name,body:text(body.body,2000),createdAt:new Date().toISOString()});}
 else if(!action&&!body)return {...r,members:r.members.map(id=>({id,name:db.users.find(u=>u.id===id)?.name||'다이버'}))};
 else throw Error('지원하지 않는 요청입니다.');
 save();return {ok:true};
}

