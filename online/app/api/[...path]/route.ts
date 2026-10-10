import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {handle} from '../../../lib/service.mjs';
export const dynamic='force-dynamic';
async function request(req:Request){
 const url=new URL(req.url),path=url.pathname.replace(/^\/api\//,'');
 try{
  if(req.method!=='GET'&&req.headers.get('origin')&&req.headers.get('origin')!==url.origin)return Response.json({error:'다른 사이트에서 요청할 수 없습니다.'},{status:403});
  if(path==='config'&&req.method==='GET')return Response.json({mapboxToken:(env as any).MAPBOX_PUBLIC_TOKEN||''},{headers:{'Cache-Control':'no-store'}});
  const user=await getChatGPTUser();
  let body={};if(req.method!=='GET'){const raw=await req.text();if(raw.length>12000)return Response.json({error:'요청 크기를 줄여주세요.'},{status:413});body=JSON.parse(raw||'{}');}
  if(!env.DB)throw new Error('데이터베이스 연결을 확인해주세요.');
  return Response.json(await handle(env.DB,user,req.method,path,body),{headers:{'Cache-Control':'no-store'}});
 }catch(error:any){return Response.json({error:error.status||error.message?.match(/입력|선택|내가|모임|별점|내용|제목|정원/)?error.message:'요청 처리에 실패했습니다. 잠시 뒤 다시 시도해주세요.'},{status:error.status||400,headers:{'Cache-Control':'no-store'}});}
}
export {request as GET,request as POST};
