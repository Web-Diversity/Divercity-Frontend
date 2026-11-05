import {randomUUID,randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scryptAsync=promisify(scrypt);
// Errors carry an HTTP status so server.mjs can answer 400/401/409 without touching chat errors.
const fail=(status,message)=>Object.assign(Error(message),{status});
const clean=(s,max)=>{if(typeof s!=='string'||!s.trim()||s.trim().length>max)throw fail(400,'입력 길이를 확인해주세요.');return s.trim();};
export function newUserState(){return {users:[],sessions:[]};}
function checkUsername(v){if(typeof v!=='string'||!/^[A-Za-z0-9_]{3,20}$/.test(v.trim()))throw fail(400,'아이디는 영문, 숫자, _ 로 3~20자여야 해요.');return v.trim().toLowerCase();}
function checkPassword(v){if(typeof v!=='string'||v.length<8||v.length>128)throw fail(400,'비밀번호는 8~128자여야 해요.');return v;}
// Stored as "salt:hash" (hex). A fresh random salt per user makes identical passwords look different.
async function hashPassword(password){const salt=randomBytes(16);const hash=await scryptAsync(password,salt,64);return salt.toString('hex')+':'+hash.toString('hex');}
async function verifyPassword(password,stored){const [salt,hash]=stored.split(':');const expected=Buffer.from(hash,'hex');const actual=await scryptAsync(password,Buffer.from(salt,'hex'),expected.length);return timingSafeEqual(actual,expected);}
const hashToken=token=>createHash('sha256').update(token).digest('hex');
// Only the sha256 of the token is stored; the raw token is returned to the client once.
function issueToken(db,user){const token=randomBytes(32).toString('hex');db.sessions.push({userId:user.id,tokenHash:hashToken(token),createdAt:new Date().toISOString()});return token;}
const publicUser=(u,token)=>({id:u.id,username:u.username,nickname:u.nickname,token});
const DUMMY=hashPassword('dummy-password-for-timing');
export async function signup(db,{username,password,nickname}={}){
 const name=checkUsername(username);checkPassword(password);const nick=clean(nickname,20);
 const taken=()=>db.users.some(u=>u.username===name);
 if(taken())throw fail(409,'이미 사용 중인 아이디예요.');
 const passwordHash=await hashPassword(password);
 // Re-check after the await: another signup may have finished while we were hashing.
 if(taken())throw fail(409,'이미 사용 중인 아이디예요.');
 const user={id:randomUUID(),username:name,nickname:nick,passwordHash,createdAt:new Date().toISOString()};
 db.users.push(user);return publicUser(user,issueToken(db,user));
}
export async function login(db,{username,password}={}){
 const bad=fail(401,'아이디 또는 비밀번호가 올바르지 않아요.');
 if(typeof username!=='string'||typeof password!=='string'||password.length>128)throw bad;
 const user=db.users.find(u=>u.username===username.trim().toLowerCase());
 // Hash even for unknown users so response time doesn't reveal which usernames exist.
 const ok=await verifyPassword(password,user?user.passwordHash:await DUMMY);
 if(!user||!ok)throw bad;
 return publicUser(user,issueToken(db,user));
}
export function userByToken(db,token){const h=hashToken(String(token||''));const s=db.sessions.find(x=>x.tokenHash===h);const u=s&&db.users.find(x=>x.id===s.userId);if(!u)throw fail(401,'다시 로그인해주세요.');return u;}
