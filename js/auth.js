import {signUp, signIn, isConfigured} from './auth-service.js';

const forms = {login: document.querySelector('#login-form'), signup: document.querySelector('#signup-form')};
const text = {
  login: {title: '다시 만나서 반가워요', sub: '로그인하고 캠퍼스 친구들과 이야기를 나눠보세요.', switchText: '아직 계정이 없나요?', switchLabel: '회원가입', other: 'signup'},
  signup: {title: 'Divercity에 오신 걸 환영해요', sub: '다름이 모여 우리의 일상이 되는 곳, 함께 시작해요.', switchText: '이미 계정이 있나요?', switchLabel: '로그인', other: 'login'},
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let timer;

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message; el.hidden = false;
  clearTimeout(timer); timer = setTimeout(() => el.hidden = true, 3200);
}

function setMode(mode, focus = false) {
  if (!forms[mode]) mode = 'login';
  const t = text[mode];
  for (const [key, form] of Object.entries(forms)) {
    const active = key === mode;
    form.hidden = !active;
    const tab = document.querySelector('#tab-' + key);
    tab.setAttribute('aria-selected', String(active));
    tab.classList.toggle('active', active);
    form.querySelector('.form-error').textContent = '';
  }
  document.querySelector('#auth-title').textContent = t.title;
  document.querySelector('#auth-sub').textContent = t.sub;
  document.querySelector('#auth-switch').innerHTML = t.switchText + ' <button type="button" data-mode="' + t.other + '">' + t.switchLabel + '</button>';
  document.title = (mode === 'signup' ? '회원가입' : '로그인') + ' · Divercity';
  history.replaceState(null, '', mode === 'signup' ? '?mode=signup' : location.pathname);
  if (focus) forms[mode].querySelector('input').focus();
}

function validate(mode, data) {
  const email = (data.email || '').trim();
  if (!EMAIL.test(email)) return ['email', '올바른 이메일 주소를 입력해주세요.'];
  if (!data.password) return ['password', '비밀번호를 입력해주세요.'];
  if (mode === 'signup') {
    const nickname = (data.nickname || '').trim();
    if (!nickname || nickname.length > 20) return ['nickname', '닉네임은 1~20자로 입력해주세요.'];
    if (data.password.length < 8 || !/[A-Za-z]/.test(data.password) || !/\d/.test(data.password)) return ['password', '비밀번호는 8자 이상, 영문과 숫자를 함께 써주세요.'];
    if (data.password !== data.passwordConfirm) return ['passwordConfirm', '비밀번호 확인이 일치하지 않아요.'];
    if (!data.agree) return ['agree', '커뮤니티 이용 규칙에 동의해주세요.'];
  }
  return null;
}

document.addEventListener('click', e => {
  const modeButton = e.target.closest('[data-mode]');
  if (modeButton) { setMode(modeButton.dataset.mode, true); return; }
  const toggle = e.target.closest('.pw-toggle');
  if (toggle) {
    const input = toggle.previousElementSibling, show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.textContent = show ? '숨기기' : '보기';
    toggle.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기');
  }
});

document.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target, mode = form === forms.signup ? 'signup' : 'login';
  const data = Object.fromEntries(new FormData(form));
  const errorEl = form.querySelector('.form-error'), submit = form.querySelector('.auth-submit');
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  const problem = validate(mode, data);
  if (problem) {
    const [name, message] = problem, input = form.elements[name];
    errorEl.textContent = message;
    input.setAttribute('aria-invalid', 'true'); input.focus();
    return;
  }
  errorEl.textContent = '';
  submit.disabled = true; const label = submit.textContent; submit.textContent = '잠시만요…';
  try {
    const payload = {email: data.email.trim(), password: data.password};
    if (mode === 'signup') await signUp({...payload, nickname: data.nickname.trim()});
    else await signIn(payload);
    toast(mode === 'signup' ? '가입을 완료했어요.' : '로그인했어요.');
    setTimeout(() => location.href = 'profile.html', 600);
  } catch (error) {
    errorEl.textContent = error.message;
  } finally {
    submit.disabled = false; submit.textContent = label;
  }
});

setMode(new URLSearchParams(location.search).get('mode'));
if (!isConfigured) document.querySelector('.auth-card').insertAdjacentHTML('afterbegin', '<p class="status-banner">미리보기: 로그인 서버가 아직 연결되지 않아 실제 가입·로그인은 되지 않아요.</p>');
