import {mountMap} from './map.js';
import {mountChat} from './chat.js';
import {createPost,editPost,deletePost,addComment,toggleReaction,joinMeetup,selectPosts} from './model.js';
import {seedPosts} from './data.js';
import {getSupabaseClient,supabaseConfigured} from './auth.js';
let USER='classroom-me',currentUser=null,supabaseClient=null,authLoadError=false;
const KEY='divercity-classroom-v1';
const config={free:{name:'자유게시판',desc:'소소한 일상부터 궁금했던 이야기까지, 편하게 나눠요.',categories:['일상','질문','정보'],icon:'chat'},course:{name:'강의평',desc:'함께 듣고, 솔직하게 나누는 수업 이야기.',categories:['전공','교양'],icon:'book'},review:{name:'캠퍼스 리뷰',desc:'학교 주변의 작고 좋은 발견을 공유해요.',categories:['맛집','카페','시설'],icon:'star'},meetup:{name:'모임',desc:'혼자보다 함께, 새로운 캠퍼스 친구를 만나요.',categories:['스터디','언어교환','취미'],icon:'users'}};
const paths={map:'index.html',home:'community.html',chat:'chat.html',free:'board.html',course:'courses.html',review:'reviews.html',meetup:'meetups.html',profile:'profile.html'};
const page=document.body.dataset.page, main=document.querySelector('#main'), modal=document.querySelector('#modal');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state={version:1,nickname:'새내기 다이버',posts:seedPosts()},warning='';
try{const raw=localStorage.getItem(KEY);if(raw){const saved=JSON.parse(raw);if(saved.version!==1||!Array.isArray(saved.posts)||typeof saved.nickname!=='string')throw Error();state=saved;}}catch{warning='저장 데이터를 읽지 못해 예시 화면으로 시작했어요.';}
let mapView,chatView,campusPlaces=[];
fetch('/assets/campus-places.json').then(r=>r.json()).then(p=>campusPlaces=p).catch(()=>{});
state.profile ||= {university:'숭실대학교',department:'컴퓨터학부',bio:'다양한 친구들과 함께 캠퍼스의 일상을 나누고 싶어요.',languages:'한국어, English',interests:'스터디, 언어교환, 취미'};
let query='',category='전체',sort='latest',profileTab='mine',activeId=null,timer;
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.hidden=false;clearTimeout(timer);timer=setTimeout(()=>el.hidden=true,3200);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{toast('브라우저 저장 공간을 사용할 수 없어요. 현재 화면에서만 유지됩니다.');return false;}}
function requireLogin(){if(currentUser)return true;showAuthDialog('signin');return false;}
function showAuthDialog(mode='signin'){
 if(authLoadError){openModal('Supabase 연결을 확인해주세요','<p>Supabase 프로젝트 URL과 공개 키, 이메일 인증 설정을 확인한 뒤 새로고침해주세요.</p>');return;}
 if(!supabaseConfigured){openModal('Supabase 연결 설정이 필요해요', '<p>Supabase 프로젝트를 만든 뒤 <code>js/supabase-config.js</code>에 프로젝트 URL과 공개 publishable/anon 키를 설정해주세요.</p>');return;}
 const signup=mode==='signup';
 openModal(signup?'회원가입':'로그인','<form id="auth-form" data-mode="'+mode+'"><div class="form-fields"><label class="field">이메일<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label class="field">비밀번호<input name="password" type="password" autocomplete="'+(signup?'new-password':'current-password')+'" required minlength="8" maxlength="128"></label></div><p class="form-help">'+(signup?'가입 후 이메일 인증이 필요할 수 있어요.':'Divercity 계정으로 로그인합니다.')+'</p><p class="form-error" id="form-error" role="alert"></p><div class="form-buttons"><button type="button" class="btn" data-action="auth-mode" data-mode="'+(signup?'signin':'signup')+'">'+(signup?'기존 계정 로그인':'회원가입')+'</button><button class="btn primary">'+(signup?'계정 만들기':'로그인')+'</button></div></form>');
}
function authMessage(error,signup){
 const message=String(error?.message||'');
 if(/invalid login credentials|email not confirmed/i.test(message))return '이메일 또는 비밀번호를 확인하고, 인증 메일이 왔다면 먼저 인증해주세요.';
 if(/already registered|user already registered/i.test(message))return '이미 가입된 이메일이에요. 로그인해 주세요.';
 if(/password.*(weak|short)|at least/i.test(message))return '비밀번호는 8자 이상으로 입력해주세요.';
 return signup?'회원가입을 완료하지 못했어요. 입력값과 Supabase 설정을 확인해주세요.':'로그인하지 못했어요. 입력값과 Supabase 설정을 확인해주세요.';
}
async function submitAuth(form){
 const button=form.querySelector('button.primary');if(button)button.disabled=true;
 try{
  if(!supabaseClient)supabaseClient=await getSupabaseClient();
  if(!supabaseClient)throw Error('Supabase 설정이 비어 있습니다.');
  const values=Object.fromEntries(new FormData(form)),signup=form.dataset.mode==='signup';
  const result=signup?await supabaseClient.auth.signUp({email:values.email,password:values.password,options:{emailRedirectTo:location.origin}}):await supabaseClient.auth.signInWithPassword({email:values.email,password:values.password});
  if(result.error)throw result.error;
  if(signup&&!result.data.session){modal.close();toast('가입 확인 이메일을 보냈어요. 메일의 인증 링크를 눌러주세요.');return;}
  const user=result.data.user||result.data.session?.user;
  if(user)applyUser(user);
  modal.close();toast(signup?'회원가입했어요.':'로그인했어요.');
 }catch(error){const field=form.querySelector('#form-error');if(field)field.textContent=authMessage(error,form.dataset.mode==='signup');}
 finally{if(button&&button.isConnected)button.disabled=false;}
}
function applyUser(user){
 currentUser=user||null;USER=currentUser?.id||'classroom-me';
 if(currentUser){const profileName=currentUser.user_metadata?.nickname||currentUser.email?.split('@')[0];if(profileName&&(state.nickname==='새내기 다이버'||!state.nickname)){state.nickname=profileName.slice(0,20);persist();}}
 render();
}
async function signOut(){if(!supabaseClient)return;const {error}=await supabaseClient.auth.signOut({scope:'local'});if(error){toast('로그아웃하지 못했어요. 다시 시도해주세요.');return;}applyUser(null);toast('로그아웃했어요.');}
async function initializeAuth(){
 if(!supabaseConfigured)return;
 try{
  supabaseClient=await getSupabaseClient();
  if(!supabaseClient)return;
  const {data,error}=await supabaseClient.auth.getSession();if(error)throw error;
  currentUser=data.session?.user||null;USER=currentUser?.id||'classroom-me';
  if(currentUser){const profileName=currentUser.user_metadata?.nickname||currentUser.email?.split('@')[0];if(profileName&&state.nickname==='새내기 다이버'){state.nickname=profileName.slice(0,20);persist();}}
  supabaseClient.auth.onAuthStateChange((_event,session)=>{applyUser(session?.user||null);});
  render();
 }catch{authLoadError=true;}
}
function icon(name){const d={home:'M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8',chat:'M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3zM7 8h10M7 12h7',book:'M12 5v16M12 5C8 2 4 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-4-1-7-2-10 1',star:'m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',heart:'M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 3 11 8 16 5-5 13-11 8-16',pin:'M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 1 1 14 0M14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0'}[name]||'M5 12h14M12 5v14';return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>';}
const stars=n=>'<span class="stars" aria-label="'+n+'점">'+ '★'.repeat(n)+'☆'.repeat(5-n)+'</span>';
const date=s=>new Date(s).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'});
const url=p=>paths[p.type]+'?post='+encodeURIComponent(p.id);
function meta(p){return '<div class="meta"><span>'+esc(p.author)+'</span><span>'+date(p.createdAt)+'</span><span class="green">♡ '+p.likes.length+'</span><span>댓글 '+p.comments.length+'</span>'+(p.sample?'<span>예시 글</span>':'')+'</div>';}
function shell(){
 document.querySelector('#header').innerHTML='<div class="app-topbar"><button class="round-button" data-action="header-search" aria-label="지도 검색">'+icon('search')+'</button><a class="wordmark" href="index.html">Divercity</a><button class="btn small auth-button" data-action="auth">'+(currentUser?'로그아웃':'로그인')+'</button><button class="round-button" data-action="notifications" aria-label="알림"><svg class="icon" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6"/></svg></button></div>';
 document.querySelector('#sidebar').innerHTML='<nav class="community-nav">'+[['home','커뮤니티'],['free','자유게시판'],['course','강의평'],['review','캠퍼스 리뷰'],['meetup','모임 목록']].map(([key,label])=>'<a class="'+(page===key?'active':'')+'" href="'+paths[key]+'">'+label+'</a>').join('')+'</nav>';
 let dock=document.querySelector('#app-dock');if(!dock){dock=document.createElement('nav');dock.id='app-dock';dock.setAttribute('aria-label','주요 메뉴');document.body.append(dock);}
 dock.innerHTML='<a class="'+(page==='map'?'active':'')+'" href="index.html">'+icon('pin')+'<span>지도</span></a><a class="'+(['home','free','course','review','meetup'].includes(page)?'active':'')+'" href="community.html">'+icon('book')+'<span>커뮤니티</span></a><button class="dock-create" data-action="create-meetup" aria-label="모임 만들기"><span><img src="assets/divercity-logo.jpg" alt=""></span><small>모임 만들기</small></button><a class="'+(page==='chat'?'active':'')+'" href="chat.html">'+icon('chat')+'<span>채팅</span></a><a class="'+(page==='profile'?'active':'')+'" href="profile.html">'+icon('users')+'<span>프로필</span></a>';
}
function card(p,compact=false){if(compact)return '<a class="post-line" href="'+url(p)+'"><strong>'+esc(p.title)+'</strong>'+meta(p)+'</a>';
let inner='<span class="tag">'+esc(p.category)+'</span>';
if(p.type==='review')inner='<div class="place-visual">'+icon('pin')+esc(p.place)+'</div>'+inner;
if(p.type==='course')inner+='<div class="rating-row"><h2>'+esc(p.subject)+'</h2>'+stars(p.rating)+'</div><p class="subtitle">'+esc(p.professor)+' · '+esc(p.title)+'</p>';
else inner+='<h2>'+esc(p.title)+'</h2>';
if(p.type==='review')inner+=stars(p.rating);
inner+='<p class="excerpt">'+esc(p.body)+'</p>';
if(p.type==='meetup')inner+='<div class="meetup-info"><span>◷ '+esc(p.date)+' · '+esc(p.time)+'</span><span>⌖ '+esc(p.place)+'</span></div><div class="progress"><span style="width:'+Math.min(100,p.participants.length/p.capacity*100)+'%"></span></div><p class="subtitle">'+p.participants.length+'/'+p.capacity+'명 · '+(new Date(p.date+'T'+p.time)<=new Date()?'종료':p.participants.length>=p.capacity?'모집 완료':'모집 중')+'</p>';
return '<a href="'+url(p)+'" class="'+(p.type==='free'?'board-item':'panel content-card')+'">'+inner+meta(p)+'</a>';}
function home(){main.innerHTML='<div class="page-head"><div><div class="eyebrow">HELLO, DIVER!</div><h1>오늘의 캠퍼스는 어떤가요?</h1><p>작은 이야기가 모여, 더 즐거운 대학 생활.</p></div><span class="date">'+new Date().toLocaleDateString('ko-KR')+'</span></div><section class="hero"><div><span class="eyebrow">YOUR CAMPUS, OUR STORIES</span><h2>다름이 모여,<br>우리의 일상이 되다.</h2><p>궁금했던 수업부터 함께할 친구까지.<br>캠퍼스의 모든 이야기를 여기서 시작해요.</p><a class="btn primary" href="board.html">이야기 둘러보기 →</a></div><svg class="hero-art" viewBox="0 0 220 165" aria-hidden="true"><circle cx="121" cy="82" r="76" fill="#dbe6d3"/><g transform="rotate(-12 100 90)"><rect x="32" y="38" width="100" height="109" rx="7" fill="#7f9e76"/><path d="M50 59h62M50 72h62M50 85h42" stroke="#dbe6d3" stroke-width="4"/></g><g transform="rotate(9 145 70)"><rect x="92" y="15" width="99" height="118" rx="7" fill="#fffdf6"/><path d="M110 38h60M110 50h45M110 96h60M110 108h40" stroke="#dfe5d5" stroke-width="4"/><path d="m143 59 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="#d3ad66"/></g><circle cx="185" cy="138" r="17" fill="#d6b778"/><path d="m178 138 5 5 9-11" stroke="#fff" fill="none" stroke-width="3"/></svg></section><div class="quick-links">'+Object.entries(config).map(([key,c])=>'<a class="quick-link" href="'+paths[key]+'"><span class="quick-icon">'+icon(c.icon)+'</span><span><strong>'+c.name+'</strong><small>'+({free:'우리의 일상 이야기',course:'수강 전, 먼저 살펴봐요',review:'캠퍼스 주변의 발견',meetup:'함께하면 더 즐거워요'}[key])+'</small></span></a>').join('')+'</div><div class="home-grid"><section class="panel panel-padding"><div class="section-title"><h2>지금, 인기 있는 이야기</h2><a href="board.html">더보기 →</a></div>'+selectPosts(state.posts,{type:'free',sort:'popular'}).slice(0,4).map(p=>card(p,true)).join('')+'</section><section class="panel panel-padding"><div class="section-title"><h2>먼저 들어본 강의 이야기</h2><a href="courses.html">더보기 →</a></div>'+selectPosts(state.posts,{type:'course'}).slice(0,3).map(p=>'<a class="course-mini" href="'+url(p)+'"><strong>'+esc(p.subject)+'</strong>'+stars(p.rating)+'<p>'+esc(p.title)+'</p></a>').join('')+'</section></div><div class="community-note">'+icon('users')+'서로를 존중하는 한마디, 우리 커뮤니티의 시작이에요.</div>';}
function currentPosts(){let posts=state.posts;if(page==='profile')posts=posts.filter(p=>profileTab==='mine'?p.authorId===USER:profileTab==='saved'?p.saved.includes(USER):p.type==='meetup'&&p.participants.includes(USER));return selectPosts(posts,{type:config[page]?page:undefined,query,category,sort});}
function listContent(){const posts=currentPosts(),el=document.querySelector('#results');if(!el)return;el.innerHTML='<p class="results-count">총 '+posts.length+'개의 이야기</p><div class="'+(page==='free'?'panel':'cards')+'">'+(posts.length?posts.map(p=>card(p)).join(''):'<div class="empty"><h2>아직 이야기가 없어요</h2><p>검색어를 바꾸거나 첫 이야기를 남겨보세요.</p></div>')+'</div>';}
function listing(){const c=config[page];main.innerHTML='<div class="page-head"><div><div class="eyebrow">CAMPUS COMMUNITY</div><h1>'+c.name+'</h1><p>'+c.desc+'</p></div><button class="btn primary" data-action="write">＋ 글쓰기</button></div><div class="toolbar"><label class="search-box">'+icon('search')+'<input id="search" aria-label="게시글 검색" placeholder="어떤 이야기를 찾고 있나요?" value="'+esc(query)+'"></label><select id="sort" aria-label="정렬"><option value="latest">최신순</option><option value="popular">공감순</option>'+(['course','review'].includes(page)?'<option value="rating">별점순</option>':'')+'</select></div><div class="filters">'+['전체',...c.categories].map(cat=>'<button class="filter '+(category===cat?'active':'')+'" data-category="'+cat+'">'+cat+'</button>').join('')+'</div><div id="results"></div>';document.querySelector('#sort').value=sort;listContent();}
function profile(){
 const info=state.profile;
 main.innerHTML='<section class="reference-profile"><div class="profile-cover"></div><div class="profile-identity"><span class="profile-photo">'+esc(state.nickname.slice(0,1))+'</span><button class="btn" data-action="edit-profile">프로필 수정</button><h1>'+esc(state.nickname)+'</h1><p class="profile-handle">@campus_diver · 수업용 프로필</p><h3>'+icon('book')+' '+esc(info.university)+'</h3><p class="profile-major">'+esc(info.department)+'</p><p class="profile-bio">'+esc(info.bio)+'</p><div class="interest-tags">'+info.interests.split(',').filter(Boolean).map(v=>'<span>#'+esc(v.trim())+'</span>').join('')+'</div><div class="language-cards">'+info.languages.split(',').filter(Boolean).map(v=>'<span>'+icon('chat')+esc(v.trim())+'</span>').join('')+'</div></div><div class="profile-stat-bar"><span><strong>'+state.posts.filter(p=>p.authorId===USER).length+'</strong>작성한 글</span><span><strong>'+state.posts.filter(p=>p.saved.includes(USER)).length+'</strong>저장한 글</span><span><strong>'+state.posts.filter(p=>p.type==='meetup'&&p.participants.includes(USER)).length+'</strong>참여한 모임</span></div></section><div class="filters profile-tabs">'+[['mine','작성한 글'],['saved','저장한 글'],['joined','참여한 모임']].map(([k,v])=>'<button class="filter '+(k===profileTab?'active':'')+'" data-tab="'+k+'">'+v+'</button>').join('')+'</div><div id="results"></div>';
 listContent();
}
function render(){
 shell();
 const api={main,esc,icon,state,detail,writeForm,toast,openModal};
 if(page==='map'){if(!mapView)mapView=mountMap(api);else mapView.refresh();return;}
 if(page==='chat'){if(!chatView)chatView=mountChat(api);return;}
 if(page==='home')home();else if(page==='profile')profile();else listing();
 if(warning)main.insertAdjacentHTML('afterbegin','<p class="status-banner">'+warning+'</p>');
 main.insertAdjacentHTML('beforeend','<footer><span>Divercity · 수업용 공개 체험판</span><button data-action="about">체험판 안내 ↗</button></footer>');
}
function openModal(title,body){modal.innerHTML='<div class="modal-head"><h2 id="modal-title">'+esc(title)+'</h2><button class="close-btn" data-action="close" aria-label="닫기">×</button></div><div class="modal-body">'+body+'</div>';if(!modal.open)modal.showModal();}
function detail(id){const p=state.posts.find(p=>p.id===id);if(!p){toast('글을 찾을 수 없어요.');return;}activeId=id;openModal(config[p.type].name,'<div class="detail-top"><span class="tag">'+esc(p.category)+'</span>'+(p.sample?'<span class="sample-note">시연을 위해 만든 예시 글</span>':'')+'</div><h1>'+esc(p.title)+'</h1>'+meta(p)+(p.rating?'<div class="detail-info">'+esc(p.subject||p.place)+(p.professor?' · '+esc(p.professor):'')+' &nbsp; '+stars(p.rating)+'</div>':'')+(p.type==='meetup'?'<div class="detail-info">'+esc(p.date)+' '+esc(p.time)+' · '+esc(p.place)+'<br>현재 '+p.participants.length+'/'+p.capacity+'명 참여</div>':'')+'<p class="detail-body">'+esc(p.body)+'</p><div class="actions"><button class="btn '+(p.likes.includes(USER)?'selected':'')+'" data-action="likes">♡ 공감 '+p.likes.length+'</button><button class="btn '+(p.saved.includes(USER)?'selected':'')+'" data-action="saved">'+(p.saved.includes(USER)?'✓ 저장됨':'글 저장')+'</button>'+(p.type==='meetup'?'<a class="btn" href="chat.html?meetup='+encodeURIComponent(p.id)+'">모임 채팅</a><button class="btn soft" data-action="join">'+(p.participants.includes(USER)?'참여 중 · 취소':'모임 참여')+'</button>':'')+(p.authorId===USER?'<button class="btn small" data-action="edit">수정</button><button class="btn small danger" data-action="delete">삭제</button>':'')+'</div><section class="comments"><h3>댓글 '+p.comments.length+'</h3>'+p.comments.map(c=>'<div class="comment"><strong>'+esc(c.author)+'</strong> <small>'+date(c.createdAt)+'</small><p>'+esc(c.body)+'</p></div>').join('')+'<form id="comment-form" class="comment-form"><input name="body" maxlength="500" required aria-label="댓글" placeholder="따뜻한 한마디를 남겨주세요"><button class="btn primary">등록</button></form></section>');}


function writeForm(type=page,post=null,draft={}){if(!config[type])type='free';const values=post||draft,c=config[type];const field=(name,label,input='text',max=80)=>'<label class="field">'+label+'<input name="'+name+'" type="'+input+'" required maxlength="'+max+'" value="'+esc(values[name]||'')+'"></label>';
openModal(post?'글 수정':'새 이야기 쓰기','<form id="post-form" data-id="'+(post?.id||'')+'"><div class="form-fields"><div class="form-row"><label class="field">게시판<select name="type" id="post-type" '+(post?'disabled':'')+'>'+Object.entries(config).map(([k,v])=>'<option value="'+k+'" '+(type===k?'selected':'')+'>'+v.name+'</option>').join('')+'</select></label><label class="field">분류<select name="category">'+c.categories.map(cat=>'<option '+(values.category===cat?'selected':'')+'>'+cat+'</option>').join('')+'</select></label></div>'+(type==='course'?'<div class="form-row">'+field('subject','과목명','text',50)+field('professor','교수명','text',30)+'</div>':'')+(['review','meetup'].includes(type)?field('place','장소','text',60):'')+(type==='meetup'?'<label class="field">지도 위치<select id="meetup-location" required><option value="">지도에서 모임 위치를 선택해주세요</option>'+campusPlaces.map(p=>'<option value="'+p.lng+','+p.lat+'" '+(Number(values.longitude)===p.lng&&Number(values.latitude)===p.lat?'selected':'')+'>'+esc(p.name)+'</option>').join('')+(values.longitude&&!campusPlaces.some(p=>p.lng===Number(values.longitude)&&p.lat===Number(values.latitude))?'<option selected value="'+Number(values.longitude)+','+Number(values.latitude)+'">지도에서 선택한 위치</option>':'')+'</select></label><input type="hidden" name="longitude" value="'+esc(values.longitude||'')+'"><input type="hidden" name="latitude" value="'+esc(values.latitude||'')+'">':'')+(['review','course'].includes(type)?'<label class="field">별점<select name="rating">'+[5,4,3,2,1].map(n=>'<option value="'+n+'" '+(Number(values.rating)===n?'selected':'')+'>'+n+'점</option>').join('')+'</select></label>':'')+(type==='meetup'?'<div class="form-row">'+field('date','날짜','date')+field('time','시간','time')+'</div><label class="field">정원 (작성자 포함)<input name="capacity" type="number" min="2" max="30" required value="'+(values.capacity||5)+'"></label>':'')+field('title','제목')+'<label class="field">내용<textarea name="body" required maxlength="3000" placeholder="함께 나누고 싶은 이야기를 적어주세요.">'+esc(values.body||'')+'</textarea></label></div><p class="form-help">이 브라우저에 저장되는 수업용 체험판입니다.</p><p class="form-error" id="form-error" role="alert"></p><div class="form-buttons"><button type="button" class="btn" data-action="close">취소</button><button class="btn primary">'+(post?'수정 완료':'등록하기')+'</button></div></form>');}
document.addEventListener('click',async e=>{const cat=e.target.closest('[data-category]'),tab=e.target.closest('[data-tab]');if(cat){category=cat.dataset.category;render();return;}if(tab){profileTab=tab.dataset.tab;render();return;}const el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action,p=state.posts.find(p=>p.id===activeId);
 try{
 if(action==='auth'){if(currentUser)await signOut();else showAuthDialog('signin');return;}
 if(action==='auth-mode'){showAuthDialog(el.dataset.mode);return;}
 if(['write','create-meetup','edit-profile','edit','delete','confirm-delete','likes','saved','join'].includes(action)&&!requireLogin())return;
if(action==='close')modal.close();
if(action==='write')writeForm();
if(action==='create-meetup')writeForm('meetup');
if(action==='header-search'){if(mapView)mapView.openSearch();else location.href='index.html?search=1';}
if(action==='notifications')openModal('알림','<div class="notice-card"><strong>나의 캠퍼스 활동</strong><p>참여한 모임 '+state.posts.filter(p=>p.type==='meetup'&&p.participants.includes(USER)).length+'개 · 저장한 글 '+state.posts.filter(p=>p.saved.includes(USER)).length+'개</p><a class="btn soft" href="profile.html">내 활동 보기</a></div><p class="form-help">수업용 버전에는 외부 푸시 알림이 없습니다.</p>');
if(action==='edit-profile'){const fields=[['university','학교'],['department','학과'],['bio','소개'],['languages','사용 언어 (쉼표로 구분)'],['interests','관심사 (쉼표로 구분)']];openModal('프로필 수정','<form id="extended-profile-form"><div class="form-fields"><label class="field">닉네임<input name="nickname" required maxlength="20" value="'+esc(state.nickname)+'"></label>'+fields.map(([key,label])=>'<label class="field">'+label+'<input name="'+key+'" required maxlength="150" value="'+esc(state.profile[key])+'"></label>').join('')+'</div><div class="form-buttons"><button class="btn primary">저장하기</button></div><p class="form-error" id="form-error" role="alert"></p></form>');}

if(action==='about')openModal('수업용 체험판 안내','<div class="about-text"><p>HTML · CSS · JavaScript로 만든 대학생 커뮤니티 팀 프로젝트입니다.</p><p>예시 글, 강의명, 교수명, 장소 및 평가는 시연용입니다. 실제 평가가 아닙니다.</p><p>Supabase 이메일 로그인은 계정 확인에 사용됩니다. 게시글과 프로필은 이 브라우저에 저장되며 사용자 간 공유되지 않습니다.</p></div>');
if(action==='edit')writeForm(p.type,p);
if(action==='delete')openModal('글 삭제','<p>이 글과 댓글을 삭제할까요? 삭제하면 되돌릴 수 없어요.</p><div class="form-buttons"><button class="btn" data-action="back">취소</button><button class="btn danger" data-action="confirm-delete">삭제하기</button></div>');
if(action==='back')detail(activeId);
if(action==='confirm-delete'){state.posts=deletePost(state.posts,activeId,USER);const ok=persist();modal.close();history.replaceState(null,'',paths[page]);render();if(ok)toast('글을 삭제했어요.');}
if(['likes','saved','join'].includes(action)){if(action==='join')joinMeetup(p,USER);else toggleReaction(p,action,USER);persist();render();detail(p.id);}
}catch(error){toast(error.message);}});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;listContent();}});
document.addEventListener('change',e=>{if(e.target.id==='meetup-location'){const [lng,lat]=e.target.value.split(',');const f=e.target.form;f.elements.longitude.value=lng||'';f.elements.latitude.value=lat||'';if(lng)f.elements.place.value=e.target.selectedOptions[0].textContent;}
if(e.target.id==='sort'){sort=e.target.value;listContent();}if(e.target.id==='post-type'){const data=Object.fromEntries(new FormData(e.target.form));writeForm(data.type,null,data);}});
document.addEventListener('submit',e=>{e.preventDefault();const form=e.target;if(form.id==='auth-form'){e.stopPropagation();void submitAuth(form);return;}const data=Object.fromEntries(new FormData(form));try{
if(form.id==='extended-profile-form'){
const nickname=data.nickname.trim();if(!nickname)throw Error('닉네임을 입력해주세요.');state.nickname=nickname;for(const key of ['university','department','bio','languages','interests'])state.profile[key]=data[key].trim();
state.posts.forEach(p=>{if(p.authorId===USER)p.author=nickname;p.comments.forEach(c=>{if(c.authorId===USER)c.author=nickname;});});const ok=persist();modal.close();render();if(ok)toast('프로필을 저장했어요.');
}
if(form.id==='profile-form'){const nickname=data.nickname.trim();if(!nickname)throw Error('닉네임을 입력해주세요.');state.nickname=nickname;state.posts.forEach(p=>{if(p.authorId===USER)p.author=nickname;p.comments.forEach(c=>{if(c.authorId===USER)c.author=nickname;});});const ok=persist();render();if(ok)toast('닉네임을 변경했어요.');}
if(form.id==='post-form'){let p;if(form.dataset.id){const i=state.posts.findIndex(p=>p.id===form.dataset.id);p=editPost(state.posts[i],data,USER);state.posts[i]=p;}else{p=createPost(data,USER,state.nickname);state.posts.unshift(p);}const ok=persist();render();detail(p.id);if(ok)toast('이야기를 저장했어요.');}
if(form.id==='comment-form'){if(!requireLogin())return;const p=state.posts.find(p=>p.id===activeId);addComment(p,data.body,USER,state.nickname);const ok=persist();render();detail(p.id);if(ok)toast('댓글을 등록했어요.');}
}catch(error){const field=document.querySelector('#form-error');if(field)field.textContent=error.message;else toast(error.message);}});
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
render();void initializeAuth();if(page==='map'&&new URLSearchParams(location.search).has('search'))mapView.openSearch();const initial=new URLSearchParams(location.search).get('post');if(initial)detail(initial);


window.addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue)return;try{const next=JSON.parse(e.newValue);Object.assign(state,next);if(!modal.open&&page!=='chat')render();}catch{}});
