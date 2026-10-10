import test from 'node:test';
import assert from 'node:assert/strict';
import {createPost, editPost, deletePost, addComment, toggleReaction, joinMeetup, selectPosts} from '../js/model.js';
const draft={type:'free', title:'첫 게시글',body:'함께 공부해요',category:'일상'};
test('글 작성, 검색과 작성자 수정 권한',()=>{
 const p=createPost(draft,'me','다이버');
 assert.equal(selectPosts([p],{query:'공부'}).length,1);
 assert.throws(()=>editPost(p,{...draft,title:'변경'},'other'));
 assert.equal(editPost(p,{...draft,title:'변경'},'me').title,'변경');
 assert.throws(()=>deletePost([p],p.id,'other'));
 assert.equal(deletePost([p],p.id,'me').length,0);
 assert.throws(()=>createPost({...draft,title:'   '},'me','다이버'));
});
test('강의평 필수 정보와 별점 검사',()=>{
 assert.throws(()=>createPost({...draft,type:'course'},'me','다이버'));
 assert.throws(()=>createPost({...draft,type:'course',subject:'웹',professor:'김',rating:6},'me','다이버'));
 assert.equal(createPost({...draft,type:'course',subject:'웹',professor:'김',rating:4},'me','다이버').rating,4);
});
test('추천은 중복되지 않고 댓글의 빈 내용은 거부',()=>{
 const p=createPost(draft,'me','다이버');
 toggleReaction(p,'likes','me'); assert.equal(p.likes.length,1);
 toggleReaction(p,'likes','me'); assert.equal(p.likes.length,0);
 assert.throws(()=>addComment(p,' ','me','다이버'));
 addComment(p,'좋아요','me','다이버'); assert.equal(p.comments.length,1);
});
test('모임 정원과 취소',()=>{
 const p=createPost({...draft,type:'meetup',date:'2099-11-01',time:'14:00',place:'도서관',capacity:2},'host','호스트');
 joinMeetup(p,'guest'); assert.equal(p.participants.length,2);
 assert.throws(()=>joinMeetup(p,'third'));
 joinMeetup(p,'guest'); assert.equal(p.participants.length,1);
 assert.throws(()=>joinMeetup(p,'host'));
});
