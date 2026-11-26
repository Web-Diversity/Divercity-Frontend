// 인증 연결 지점. 지금은 백엔드가 없어 "연결 전" 오류만 냅니다.
// Supabase가 준비되면 이 파일 안만 바꾸면 됩니다. 화면(auth.js)은 그대로 둡니다.
//
// 교체 예시 (supabase-js v2):
//   import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
//   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
//   signUp:  supabase.auth.signUp({email, password, options:{data:{nickname}}})
//   signIn:  supabase.auth.signInWithPassword({email, password})
//   각 호출의 {error}가 있으면 throw new Error(error.message) 로 넘기면 됩니다.

export const isConfigured = false;

const notReady = () => {
  throw new Error('아직 로그인 서버(Supabase)가 연결되지 않았어요. 화면만 미리 볼 수 있습니다.');
};

// credentials: {email, password, nickname}
export async function signUp(_credentials) {
  notReady();
}

// credentials: {email, password}
export async function signIn(_credentials) {
  notReady();
}
