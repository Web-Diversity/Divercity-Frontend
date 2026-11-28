// 게시판의 데이터 처리. 화면 코드는 app.js에 있습니다.
export const TYPES = ['free', 'course', 'review', 'meetup'];
const required = (value, label, max) => {
  const text = String(value || '').trim();
  if (!text || text.length > max) throw new Error(label + '을(를) 1~' + max + '자로 입력해주세요.');
  return text;
};
export function createPost(input, userId, nickname) {
  if (!TYPES.includes(input.type)) throw new Error('게시판을 선택해주세요.');
  const post = {
    id: crypto.randomUUID(), type: input.type,
    title: required(input.title, '제목', 80), body: required(input.body, '내용', 3000),
    category: required(input.category, '분류', 30), authorId: userId, author: nickname,
    createdAt: new Date().toISOString(), likes: [], saved: [], comments: [], participants: [], sample: false
  };
  if (input.type === 'course') {
    post.subject = required(input.subject, '과목명', 50);
    post.professor = required(input.professor, '교수명', 30);
  }
  if (input.type === 'review') post.place = required(input.place, '장소명', 60);
  if (input.type === 'course' || input.type === 'review') {
    post.rating = Number(input.rating);
    if (!Number.isInteger(post.rating) || post.rating < 1 || post.rating > 5) throw new Error('별점을 1~5점으로 선택해주세요.');
  }
  if (input.type === 'meetup') {
    post.place = required(input.place, '장소', 60);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) throw new Error('날짜와 시간을 선택해주세요.');
    post.date = input.date; post.time = input.time;
    if (!Number.isFinite(new Date(post.date + 'T' + post.time).getTime()) || new Date(post.date + 'T' + post.time) <= new Date()) throw new Error('모임은 미래 날짜로 정해주세요.');
    post.capacity = Number(input.capacity);
    if (!Number.isInteger(post.capacity) || post.capacity < 2 || post.capacity > 30) throw new Error('정원은 2~30명입니다.');
    if (input.latitude !== undefined || input.longitude !== undefined) {
      post.latitude = Number(input.latitude); post.longitude = Number(input.longitude);
      if (!input.latitude || !input.longitude || !Number.isFinite(post.latitude) || !Number.isFinite(post.longitude) || Math.abs(post.latitude)>90 || Math.abs(post.longitude)>180) throw new Error('지도에서 모임 위치를 선택해주세요.');
    }
    post.participants = [userId];
  }
  return post;
}
export function editPost(post, input, userId) {
  if (post.authorId !== userId) throw new Error('내가 작성한 글만 수정할 수 있어요.');
  const changed = createPost({...input, type: post.type}, userId, post.author);
  if (post.type === 'meetup' && changed.capacity < post.participants.length) throw new Error('참여 인원보다 정원을 줄일 수 없어요.');
  return {...post, ...changed, id:post.id, createdAt:post.createdAt, likes:post.likes, saved:post.saved, comments:post.comments, participants:post.participants};
}
export function deletePost(posts, id, userId) {
  const post = posts.find(p => p.id === id);
  if (!post || post.authorId !== userId) throw new Error('내가 작성한 글만 삭제할 수 있어요.');
  return posts.filter(p => p.id !== id);
}
export function addComment(post, body, userId, nickname) {
  post.comments.push({id:crypto.randomUUID(),body:required(body,'댓글',500),authorId:userId,author:nickname,createdAt:new Date().toISOString()});
}
export function toggleReaction(post, kind, userId) {
  if (!['likes','saved'].includes(kind)) return;
  post[kind] = post[kind].includes(userId) ? post[kind].filter(id => id !== userId) : [...post[kind],userId];
}
export function joinMeetup(post, userId) {
  if (post.authorId === userId) throw new Error('모임 작성자는 기본으로 참여 중이에요.');
  if (post.participants.includes(userId)) { post.participants = post.participants.filter(id => id !== userId); return; }
  if (new Date(post.date+'T'+post.time) <= new Date()) throw new Error('종료된 모임이에요.');
  if (post.participants.length >= post.capacity) throw new Error('모집 정원이 찼어요.');
  post.participants.push(userId);
}
export function selectPosts(posts, {type,query='',category='전체',sort='latest'}={}) {
  const q=query.trim().toLowerCase();
  return posts.filter(p => (!type || p.type===type) && (category==='전체' || p.category===category) &&
    [p.title,p.body,p.subject,p.professor,p.place,p.author].filter(Boolean).join(' ').toLowerCase().includes(q))
    .sort((a,b) => sort==='popular' ? (b.likeCount ?? b.likes.length)-(a.likeCount ?? a.likes.length) || Date.parse(b.createdAt)-Date.parse(a.createdAt) :
      sort==='rating' ? (b.rating||0)-(a.rating||0) || Date.parse(b.createdAt)-Date.parse(a.createdAt) : Date.parse(b.createdAt)-Date.parse(a.createdAt));
}
