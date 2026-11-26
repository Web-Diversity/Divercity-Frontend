# Divercity Supabase 프론트엔드 인수인계

이 문서는 Divercity의 정적 프론트엔드를 Supabase에 연결하는 작업자를 위한 구현 계약이다. 작업을 시작하기 전에 이 문서와 `SUPABASE.md`를 읽고, 이 문서에 적힌 DB 계약을 기준으로 화면 코드를 수정한다.

## 1. 서버 구성과 연결 대상

- 별도의 NestJS·Express 서버는 없다. 브라우저의 `@supabase/supabase-js` 클라이언트가 Supabase Auth, PostgREST, RPC를 직접 호출한다.
- 공동 프로젝트 URL은 `https://iwtorlgicqciocauztad.supabase.co`이다.
- 실제 브라우저 배포 대상은 `online/static-site/`이다. `online/`의 Next.js/Drizzle 코드는 이 작업의 연결 대상이 아니다.
- DB 스키마와 RLS는 Supabase 프로젝트에 적용돼 있다. 원본 migration은 `supabase/migrations/20261126000100_community_schema.sql`이다.
- 모든 데이터 권한은 RLS가 판단한다. 프론트의 `USER`, URL 파라미터, localStorage 작성자 값으로 권한을 결정하지 않는다.

## 2. 시작 전 로컬 환경 설정

각 작업자는 자신의 `online/.env.local`을 만든다. 이 파일은 Git에 포함하지 않는다.

```env
SUPABASE_URL=https://iwtorlgicqciocauztad.supabase.co
SUPABASE_PUBLISHABLE_KEY=<프로젝트 소유자가 안전한 경로로 전달한 publishable key>
```

Publishable key는 Supabase Dashboard의 Project Settings > API Keys에서 가져온다. `secret`, `service_role`, DB 비밀번호, JWT signing key는 절대로 브라우저 코드·`.env.local`·문서·커밋에 넣지 않는다.

`online/build-static.mjs`가 `.env.local`을 읽어 공개 정적 번들의 `dist/js/supabase-config.js`를 생성한다. 개발 중 `online/static-site/js/supabase-config.js`는 빈 값이 정상이며 수정하지 않는다.

## 3. 공용 클라이언트와 로그인

새 모듈에서는 아래 클라이언트를 재사용한다. 페이지나 이벤트마다 `createClient()`를 직접 만들지 않는다.

```js
import {getSupabaseClient} from './auth.js';

const supabase = await getSupabaseClient();
if (!supabase) throw new Error('Supabase 환경 설정이 없습니다.');
```

기존 `online/static-site/js/app.js`가 이메일/비밀번호 로그인, 세션 복원, 로그아웃을 처리한다. 로그인한 사용자의 UUID는 `currentUser.id` 또는 `supabase.auth.getUser()`에서 얻는다. 새 글·댓글·공감·저장·모임 참여는 로그인된 경우에만 호출한다.

## 4. 데이터 모델과 화면 매핑

| 현재 화면 모델 | Supabase 테이블 | 핵심 컬럼 |
| --- | --- | --- |
| 프로필 | `profiles` | `id`, `nickname`, `university`, `department`, `bio`, `languages`, `interests` |
| 게시글 | `posts` | `id`, `author_id`, `author_name`, `type`, `category`, `title`, `body`, `subject`, `professor`, `place`, `rating`, `meetup_date`, `meetup_time`, `capacity`, `latitude`, `longitude`, `created_at`, `updated_at` |
| 댓글 | `comments` | `id`, `post_id`, `author_id`, `author_name`, `body`, `created_at` |
| 공감 | `post_likes` | `post_id`, `user_id`, `created_at` |
| 저장 | `saved_posts` | `post_id`, `user_id`, `created_at` |
| 모임 참여 | `meetup_participants` | `post_id`, `user_id`, `created_at` |

프론트 모델로 변환할 때 다음 이름을 맞춘다.

```js
const toPost = row => ({
  ...row,
  authorId: row.author_id,
  author: row.author_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  date: row.meetup_date,
  time: row.meetup_time,
});
```

`type`별 DB 제약은 반드시 지킨다.

- `free`: 추가 필드 없음
- `course`: `subject`, `professor`, `rating`(1~5) 필수
- `review`: `place`, `rating`(1~5) 필수
- `meetup`: `place`, `meetup_date`, `meetup_time`, `capacity`(2~30) 필수. 좌표는 위도·경도를 함께 보내거나 둘 다 생략

서버 trigger가 `author_name`, `created_at`, `updated_at`을 관리한다. 게시글·댓글을 생성할 때 이 값을 보내지 않는다.

## 5. 호출 계약

### 게시글과 프로필

```js
const {data: posts, error} = await supabase
  .from('posts')
  .select('id, author_id, author_name, type, category, title, body, subject, professor, place, rating, meetup_date, meetup_time, capacity, latitude, longitude, created_at, updated_at')
  .order('created_at', {ascending: false});

await supabase.from('posts').insert({
  type: 'free', category: '일상', title: '제목', body: '내용',
});

await supabase.from('posts').update({title: '수정 제목', body: '수정 내용'}).eq('id', postId);
await supabase.from('posts').delete().eq('id', postId);

await supabase.from('profiles').update({nickname, university, department, bio, languages, interests}).eq('id', userId);
```

게시글 작성자 UUID와 작성자 이름은 DB가 정한다. 프로필은 회원가입 trigger와 backfill이 만들며, 사용자는 자신의 행만 수정할 수 있다.

### 댓글, 공감, 저장

```js
await supabase.from('comments').insert({post_id: postId, body});

const {data: myLikes} = await supabase.from('post_likes').select('post_id');
await supabase.from('post_likes').insert({post_id: postId});
await supabase.from('post_likes').delete().eq('post_id', postId);

const {data: mySaved} = await supabase.from('saved_posts').select('post_id');
await supabase.from('saved_posts').insert({post_id: postId});
await supabase.from('saved_posts').delete().eq('post_id', postId);
```

댓글은 현재 수정·삭제 API가 없다. 공감과 저장은 `(post_id, user_id)` 복합 키이므로 중복 insert 오류는 이미 선택된 상태로 처리한다. 각 사용자는 자기 공감·저장 행만 조회할 수 있다.

### 공감 수와 모임 참여 수

관계 테이블 전체를 조회해 개수를 계산하지 말고 RPC를 사용한다.

```js
const ids = posts.map(post => post.id);
const {data: engagement} = await supabase.rpc('get_post_engagement', {p_post_ids: ids});
```

반환 행의 `post_id`, `like_count`, `participant_count`를 게시글 ID로 묶는다. `likes`와 `participants` 배열을 브라우저 모델에 유지할 필요가 없다.

### 모임 참여와 취소

직접 `meetup_participants`에 insert/delete 하지 않는다. 정원과 동시 참여를 안전하게 처리하는 RPC를 사용한다.

```js
await supabase.rpc('join_meetup', {p_post_id: postId});
await supabase.rpc('leave_meetup', {p_post_id: postId});
```

모임 작성자는 게시글 생성 시 자동 참여자로 추가되며 취소할 수 없다. `join_meetup`은 종료된 모임과 정원 초과를 DB에서 거절한다.

## 6. 수정 대상과 구현 순서

1. `online/static-site/js/app.js`의 초기 `localStorage` 로드와 `persist()` 호출을 Supabase 조회·뮤테이션으로 교체한다.
2. `online/static-site/js/model.js`의 브라우저 메모리 전용 변경 함수는 제거하지 말고, 사용 경로를 Supabase 함수로 바꾸거나 새 `repository.js`에 DB 호출을 모은다.
3. 목록·상세·프로필 화면에서 서버 데이터의 로딩, 빈 결과, 실패 상태를 처리한다.
4. 글 작성·수정·삭제, 댓글, 공감, 저장, 모임 참여 이벤트를 위 계약에 맞게 비동기로 전환한다.
5. `online/static-site/js/data.js`의 예시 글은 DB에 자동 업로드하지 않는다. 서버 결과가 비어 있을 때 예시를 보여줄지 여부는 제품 담당자와 합의한다.
6. 새 테이블, 새 컬럼, RLS 변경이 필요하면 대시보드에서 즉흥 변경하지 말고 migration 제안부터 한다.

## 7. 완료 기준

- 서로 다른 브라우저/계정에서 같은 게시글과 댓글을 확인할 수 있다.
- 작성자는 자신의 글만 수정·삭제할 수 있고, 다른 사용자의 요청은 RLS에서 거절된다.
- 공감·저장 중복이 방지되고, 공감 수가 목록과 상세에서 일치한다.
- 모임 정원을 초과해 참여되지 않으며, 작성자는 자동 참여 상태다.
- `.env.local`, publishable key 외의 비밀값, `dist/` 산출물은 Git에 추가하지 않는다.

## 8. 작업자에게 전달할 메시지

```text
Divercity 정적 프론트엔드를 이미 생성된 Supabase 프로젝트에 연결해 주세요.
작업 전 저장소 루트의 SUPABASE-AGENT.md와 SUPABASE.md를 읽고, online/static-site/만 수정하세요.
현재 로그인은 연결돼 있지만 게시판·댓글·공감·저장·모임·프로필은 localStorage를 사용합니다. 문서의 테이블/RPC/RLS 계약대로 이를 Supabase 호출로 교체해 주세요.
새 테이블·컬럼·정책이 필요하면 적용하지 말고 migration 제안으로 남겨 주세요. .env.local과 secret/service_role 키는 커밋하지 마세요.
```
