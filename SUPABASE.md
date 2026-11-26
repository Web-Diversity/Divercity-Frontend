# Supabase 공동 작업 안내

이 문서는 Divercity 프론트엔드에서 Supabase 로그인과 게시판 등 공유 기능을 구현하는 에이전트가 따라야 할 기준입니다.

## 현재 상태

- 이 프로젝트의 공동 Supabase는 `iwtorlgicqciocauztad`입니다 (`https://iwtorlgicqciocauztad.supabase.co`). 기여자는 별도 프로젝트를 만들지 말고 모두 이 프로젝트에 연결해야 데이터가 같은 곳에 저장됩니다.
- 실제 배포 대상은 `online/static-site/`를 정적 빌드하는 구조입니다. 다른 `online/`의 Next.js/Drizzle 코드를 Supabase 연동 기준으로 사용하지 마세요.
- 이메일/비밀번호 로그인과 세션 복원은 `online/static-site/js/app.js`에서 처리합니다.
- Supabase 연결 코드는 `online/static-site/js/auth.js`의 `getSupabaseClient()`를 사용하세요. 이 함수는 페이지 내 Supabase 클라이언트를 하나만 만들어 재사용합니다.
- 로그인 외 게시글, 댓글, 공감, 저장, 모임, 프로필 데이터는 현재 `localStorage`에 저장되어 브라우저와 사용자 사이에 공유되지 않습니다. 예시 게시글은 `online/static-site/js/data.js`에 있습니다.
- 게시판용 테이블과 RLS 정책은 `supabase/migrations/20261126000100_community_schema.sql`에 정의했습니다. 프로젝트 DB에 migration이 적용되기 전까지는 게시판 데이터를 공유할 수 없습니다.

## 로컬 설정

1. `online/.env.example`을 각 기여자의 작업 환경에서 `online/.env.local`로 복사합니다.
2. 위에 지정한 동일한 Supabase 프로젝트의 Project URL과 **Publishable key**를 입력합니다. 구형 프로젝트는 해당 프로젝트의 `anon` key를 사용할 수 있습니다.
3. 각 기여자가 같은 프로젝트의 URL과 공개 키를 설정해야 합니다. `.env.local` 파일 자체는 로컬 전용이며 Git에 커밋하지 않습니다.
4. 정적 배포 빌드 시 `online/build-static.mjs`가 설정을 `online/dist/js/supabase-config.js`에 넣습니다. 이 값은 브라우저에 공개되므로 URL과 publishable/anon key만 허용됩니다.

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

정적 사이트에서 `service_role`/secret key, DB 비밀번호, JWT signing key를 읽거나 사용하지 마세요. 브라우저 키가 공개되어도 안전하도록 모든 테이블에 RLS와 최소 권한 정책을 적용해야 합니다.

## 프론트엔드 연결 방법

```js
import {getSupabaseClient} from './auth.js';

const supabase = await getSupabaseClient();
if (!supabase) throw new Error('Supabase 환경 설정이 없습니다.');

const {data, error} = await supabase
  .from('posts')
  .select('id, title, body, created_at')
  .order('created_at', {ascending: false});
if (error) throw error;
```

인증은 기존 `app.js`의 로그인 흐름을 재사용합니다. `supabase.auth.getUser()` 또는 `supabase.auth.getSession()`으로 현재 계정을 확인하고, 게시글 작성·수정·삭제 등 쓰기 작업은 UI 검사만 신뢰하지 말고 DB RLS로도 소유자를 검증하세요. 브라우저에서 `localStorage`의 `USER` 값이나 전달받은 작성자 ID를 신뢰해 권한을 판정하지 마세요.

## 게시판 구현 전 협의할 DB 계약

게시판 테이블과 RLS는 아래 migration을 기준으로 구현하세요. 기능 작업자는 임의의 테이블/컬럼을 추가하거나 대시보드에서 SQL을 즉흥적으로 적용하지 말고, 스키마 변경은 새 migration으로 제안하세요.

- `profiles`: `auth.users.id`를 키로 사용하는 공개 프로필. 계정 생성 trigger가 기본 프로필을 만듦
- `posts`: `free`, `course`, `review`, `meetup` 종류와 화면 입력값에 대응하는 강의·장소·일정·정원·좌표 필드
- `comments`: 게시글 및 작성자 UUID, 본문, 생성 시각
- `post_likes`, `saved_posts`, `meetup_participants`: 사용자별 관계 테이블. 저장/참여 정보는 본인 행만 조회 가능
- RLS: 게시글·댓글 읽기는 공개, 작성/수정/삭제와 프로필 편집은 소유자만 허용
- `get_post_engagement(post_ids)`: 공감과 모임 참여 수만 반환
- `join_meetup(post_id)` / `leave_meetup(post_id)`: 모임 참여/취소 RPC. 정원 확인과 참여 변경을 잠금 안에서 처리

migration을 프로젝트 DB에 적용한 뒤 `localStorage` 모델을 Supabase 저장소로 교체하세요. 로컬 예시 데이터는 서버에 자동 업로드하지 말고, 예시 콘텐츠로 계속 쓸지 제거할지 제품 담당자와 맞추세요.

## 작업 체크리스트

- 사용 파일은 `online/static-site/`와 `online/build-static.mjs`를 우선합니다.
- Supabase 접근은 `getSupabaseClient()`를 공유해서 사용합니다. 화면마다 별도 클라이언트를 만들지 마세요.
- 쿼리는 컬럼을 명시하고, 로딩·빈 결과·오류 상태를 화면에서 처리합니다.
- 사용자의 UUID를 기준으로 소유권을 연결합니다. 닉네임은 표시용이며 식별자가 아닙니다.
- 새 SQL migration과 RLS 정책은 별도로 검토·승인하고, 환경 비밀값과 `online/dist/`는 커밋하지 않습니다.

## 공유할 파일

에이전트에게는 이 `SUPABASE.md`, `online/.env.example`, 그리고 `chore/supabase` 브랜치의 저장소 접근을 공유하면 됩니다. 실행에 필요한 실제 프로젝트 URL과 publishable key는 프로젝트의 승인된 비밀 관리 경로로만 전달하세요. `.env.local`은 로컬에서 각자가 생성하고 절대 공유 저장소에 올리지 않습니다.
