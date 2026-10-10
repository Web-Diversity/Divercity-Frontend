# Divercity · 수업용 독립 웹

기존 앱과 비슷한 지도 중심 UI를 HTML/CSS/JavaScript로 구현한 팀 프로젝트입니다.
기존 Divercity 앱 코드, 회원, 대화 기록, DB, 배포 설정과 분리되어 있습니다.
공개 체험 사이트: https://divercity-campus-classroom.almonddream4.chatgpt.site

## 프로젝트 구성
- 저장소 루트: HTML/CSS/JavaScript 수업용 웹 + Node 로컬 채팅 서버. 아래 실행 방법을 따릅니다.
- `online/static-site/`: 현재 공개된 정적 사이트. 글과 채팅은 방문자 브라우저에만 저장됩니다.
- `online/`: 배포 소스와 미완성 공유 DB/API 작업 보관. `app/`, `lib/`, `db/`, `deferred-cloud/`의 클라우드 기능은 아직 배포/검증되지 않았습니다.
- 공개용 파일 생성: `cd online` 후 `node build-static.mjs`. 생성된 `dist/`를 정적 호스팅에 사용합니다.
- Mapbox 토큰은 저장소에 포함하지 않습니다. 정적 버전의 지도 실행 전 `online/static-site/assets/map-config.json`의 `YOUR_PUBLIC_MAPBOX_TOKEN`을 본인의 Mapbox 공개 토큰으로 교체하세요.
- 기존 출시용 앱과 운영 데이터는 이 저장소에 포함하지 않습니다.

## 실행
Windows에서는 start-preview.cmd를 더블클릭하세요.
또는 Node.js 20 이상에서 이 폴더를 열고:
```
node server.mjs
```
http://127.0.0.1:5187 접속. HTML 더블클릭으로는 지도와 채팅 API가 작동하지 않습니다.
패키지 설치는 필요 없습니다. Mapbox 라이브러리와 지도는 인터넷 연결이 필요합니다.

## 지도 설정
이 PC에는 Mapbox 공개 토큰을 .env.local에 따로 설정했습니다.
압축본에는 이 설정이 들어 있지 않으므로 다른 PC에서는 .env.example을 .env.local로 복사하고
본인의 Mapbox 공개 토큰(pk.로 시작)을 입력한 뒤 서버를 실행합니다.
Mapbox GL JS 공식 CDN v3.32.0 및 streets-v12 스타일을 사용합니다.
참고: https://docs.mapbox.com/mapbox-gl-js/guides/get-started/
장소 검색은 숭실대 주변의 로컬 장소 목록을 대상으로 합니다. 전국 상점 검색/길찾기는 포함하지 않았습니다.
지도 위치는 모임 장소의 참고 위치이며 실제 출입구는 장소 설명으로 보완합니다.
장소 자료 출처와 라이선스는 assets/PLACE-DATA-LICENSE.md 및 campus-places.json을 참고하세요.

## 구현된 흐름
- 지도 홈: Mapbox 이동/확대/축소, 3D 건물, 캠퍼스 중심, 카테고리/모집 필터
- 장소 및 모임 검색 → 선택 → 모임 생성/상세 보기
- 모임 작성/수정/삭제, 지도 위치 선택, 참여/취소 → 해당 모임의 채팅방
- 채팅: 탭별 이름/세션, 공개방 생성/참여/나가기, 참여자 목록, 메시지 전송/검색
- 채팅방 및 메시지 목록은 약 1.8초 간격으로 갱신
- 자유게시판, 강의평, 캠퍼스 리뷰: 글/댓글/공감/저장/검색/정렬
- 프로필: 이름/학교/학과/소개/언어/관심사 편집 및 활동 목록
- 원본 로고, 필기체 브랜드명, 흰색/파란색 화면, 하단 메뉴를 참고한 반응형 UI

## 두 참여자 채팅 시연
1. 브라우저 탭 A에서 채팅 메뉴 → 이름 A로 접속 → 채팅방 만들기
2. 새 탭을 직접 열어 같은 주소 접속 → 이름 B로 접속
3. 동일한 공개방을 선택하고 참여 → 메시지 주고받기
4. 새로고침 후에도 해당 탭의 세션과 대화가 유지됩니다.
탭 복제는 브라우저에 따라 세션을 복사할 수 있으므로, 새 탭 주소창에 직접 주소를 입력하세요.

## 데이터 범위와 아직 없는 기능
- 게시글/모임/프로필은 localStorage로 같은 브라우저에서만 유지됩니다.
- 채팅은 별도 Node 서버의 .data/chat.json에 저장됩니다. 동일 로컬 서버에 연결된 탭/브라우저에서 공유됩니다.
- 서버는 127.0.0.1에만 열립니다. 다른 PC에서 접속하는 공개 서비스는 아닙니다.
- 닉네임 세션은 수업 시연용입니다. 실제 회원가입, 학교 인증, 친구 관계, 1:1 비공개 채팅,
  AI 번역, 푸시 알림, 운영자 신고 처리는 아직 연결하지 않았습니다.
- 예시 글과 평가는 시연용입니다. 실제 회원이나 실제 후기에서 가져온 내용이 아닙니다.
- .env.local과 .data는 Git/압축본에서 제외합니다.

## 파일과 팀 분담
- index.html / js/map.js: 지도와 장소 검색
- chat.html / js/chat.js: 채팅 화면
- server.mjs / chat-model.mjs: 로컬 채팅 API, 세션과 저장
- community.html / board.html / courses.html / reviews.html: 커뮤니티
- meetups.html / profile.html / js/app.js: 모임 및 프로필, 공통 화면/이벤트
- js/model.js: 글/댓글/참여 데이터 규칙
- js/data.js: 시연 자료
- css/style.css / css/app-v2.css: 기본 스타일과 원본에 맞춘 화면
일반 DOM 조작과 이벤트 처리를 기본으로 합니다. 추가 학습 부분은 Mapbox API,
ES 모듈, localStorage/sessionStorage, fetch, Node HTTP 서버입니다.

## 검증
```
node --test tests/*.test.mjs
```
글 권한/별점/댓글/정원 테스트와 채팅 세션/방 참여 테스트,
서버 두 세션 간 메시지 교환/서버 재시작 후 보존/비공개 파일 접근 차단을 검증합니다.
브라우저에서도 Mapbox 표시, 장소 검색, 모임 생성 및 채팅 연결,
서로 다른 두 탭의 송수신, 모바일 채팅 레이아웃을 확인했습니다.

저장소: https://github.com/Web-Diversity/Divercity-Frontend

