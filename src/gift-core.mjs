import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';

export const VERSION='1.0.0';
export async function atomicJson(file,value){
  await fs.mkdir(path.dirname(file),{recursive:true});
  const temp=file+'.'+crypto.randomUUID()+'.tmp';
  await fs.writeFile(temp,JSON.stringify(value,null,2),{encoding:'utf8',mode:0o600});
  await fs.rename(temp,file);
}
export async function readJsonFile(file,fallback){
  try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return structuredClone(fallback);throw new Error('本地资料无法读取，已保留原文件，请从备份恢复。');}
}
export function serialQueue(){let tail=Promise.resolve();return fn=>{const next=tail.then(fn);tail=next.catch(()=>{});return next;};}
// Secrets travel over stdin/stdout only, never in process arguments or logs.
export function protectSecret(value,unprotect=false){
  if(!value)return Promise.resolve('');
  if(process.platform!=='win32')throw new Error('凭据保存需要Windows当前用户加密。');
  const script=`$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $r=[Security.Cryptography.ProtectedData]::${unprotect?'Unprotect':'Protect'}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($r))`;
  return new Promise((resolve,reject)=>{
    const env={...process.env,PSModulePath:path.join(process.env.WINDIR,'System32/WindowsPowerShell/v1.0/Modules')};
    const child=spawn(path.join(process.env.WINDIR,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,env,stdio:['pipe','pipe','pipe']});
    let output='';child.stdout.on('data',x=>output+=x);child.stderr.resume();
    child.on('error',()=>reject(new Error('无法使用Windows凭据加密。')));
    child.on('exit',code=>code?reject(new Error('凭据无法解密，请由当前Windows用户重新填写。')):resolve(unprotect?Buffer.from(output.trim(),'base64').toString('utf8'):output.trim()));
    child.stdin.end(unprotect?value:Buffer.from(value,'utf8').toString('base64'));
  });
}
export function validBaseUrl(value){
  let u;try{u=new URL(value);}catch{throw new Error('接口地址格式不正确。');}
  if(u.username||u.password||u.search||u.hash)throw new Error('接口地址不能包含账号、参数或凭据。');
  if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))throw new Error('云端接口必须使用HTTPS。');
  return u.href.replace(/\/+$/,'');
}
export function safeApiError(status){return ({401:'API Key 无效或已失效，请检查后重试。',402:'账户余额不足，请到服务商平台检查余额。',403:'服务商拒绝了访问，请检查账号和模型权限。',404:'找不到该模型或接口，请在高级设置中检查。',429:'请求过于频繁，请稍等片刻再试。',500:'模型服务暂时异常，请稍后重试。',503:'模型服务繁忙，请稍后重试。'})[status]||`模型请求未完成（状态 ${status}）。`;}
export const secretLike=text=>/\bsk-[A-Za-z0-9_-]{12,}|(?:密码|password|api.?key|access.?token)\s*[:：=]\s*\S+/i.test(text);
export function sanitizeMemoryClaims(text){
  return text.replace(/我(?:已经|会|都)?(?:帮你|替你)?(?:记住|记下)(?:了|下来|下了)/g,'这次聊天里我听到了')
    .replace(/(?:我(?:已经|已)|已经)(?:把[^。！？\n]{0,24})?(?:保存|记录|存好|存下)(?:了|下来|下了)?/g,'长期保存还需要你在记忆面板确认')
    .replace(/我(?:已经|已)?(?:帮你|替你)?(?:删除|忘掉|清除)(?:了|好了)/g,'这项删除需要你在记忆面板确认');
}
// Keep a short rolling tail so claims split across SSE tokens are handled
// before display. Ordinary long answers still stream incrementally.
export function claimSafeStream(emit){let pending='',visible='';return {push(token){pending=sanitizeMemoryClaims(pending+token);if(pending.length>100){const chunk=pending.slice(0,-100);pending=pending.slice(-100);visible+=chunk;emit(chunk);}},finish(){pending=sanitizeMemoryClaims(pending);if(pending){visible+=pending;emit(pending);pending='';}return visible;}};}
export function cleanText(value,max=2000){if(typeof value!=='string'||!value.trim())throw new Error('内容不能为空。');const text=value.trim();if(text.length>max)throw new Error('内容过长，请分段保存。');if(secretLike(text))throw new Error('请勿在记忆或日记中保存密钥、密码等秘密。');return text;}

export async function createGiftRuntime(root,data){
  await fs.mkdir(data,{recursive:true});
  const instanceId=process.env.FIREFLY_INSTANCE_ID||crypto.randomUUID();
  const lockFile=path.join(data,'core.lock');
  let lock;
  for(let attempt=0;attempt<2;attempt++){
    try{lock=await fs.open(lockFile,'wx');break;}catch(e){
      if(e.code!=='EEXIST')throw e;
      const old=await readJsonFile(lockFile,{});let alive=true;
      try{process.kill(old.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;}
      if(alive||attempt)throw new Error('此资料目录已有后台或需要检查锁文件，已拒绝重复写入。');
      await fs.unlink(lockFile);
    }
  }
  await lock.writeFile(JSON.stringify({pid:process.pid,instanceId,at:new Date().toISOString()}));
  await lock.close();
  const token=crypto.randomBytes(32).toString('hex');
  let origin='';let queue=serialQueue();
  const log=async(event,detail={})=>{await fs.mkdir(path.join(data,'logs'),{recursive:true});await fs.appendFile(path.join(data,'logs/service.jsonl'),JSON.stringify({at:new Date().toISOString(),event,...detail})+'\n').catch(()=>{});};
  const sessionsFile=path.join(data,'sessions.json');
  const sessions=()=>readJsonFile(sessionsFile,{version:1,desktop:[],wechat:[]});
  const saveSession=(channel,id,messages)=>queue(async()=>{
    const book=await sessions();const list=book[channel]??(book[channel]=[]);
    if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(id))id=crypto.randomUUID();
    let session=list.find(x=>x.id===id);if(!session){session={id,createdAt:new Date().toISOString(),title:'一封新信',messages:[]};list.push(session);}
    session.messages=messages.filter(x=>['user','assistant'].includes(x.role)&&typeof x.content==='string').slice(-300).map(x=>({role:x.role,content:x.content.slice(0,12000)}));
    session.title=session.messages.find(x=>x.role==='user')?.content.slice(0,30)||'一封新信';session.updatedAt=new Date().toISOString();await atomicJson(sessionsFile,book);if(channel==="desktop")await atomicJson(path.join(data,"desktop-session.json"),{id});return id;
  });
  const desktopSessionFile=path.join(data,'desktop-session.json');
  const desktopSession=(id)=>queue(async()=>{
    const book=await sessions(),pointer=await readJsonFile(desktopSessionFile,{});
    let selected=book.desktop.find(x=>x.id===(id||pointer.id));
    if(id&&!selected)throw Error('Unknown desktop session');
    if(!selected)selected=[...book.desktop].sort((a,b)=>String(b.updatedAt||b.createdAt).localeCompare(String(a.updatedAt||a.createdAt)))[0];
    if(!selected){selected={id:crypto.randomUUID(),createdAt:new Date().toISOString(),title:'\u4e00\u5c01\u65b0\u4fe1',messages:[]};book.desktop.push(selected);await atomicJson(sessionsFile,book);}
    if(pointer.id!==selected.id)await atomicJson(desktopSessionFile,{id:selected.id});
    return structuredClone(selected);
  });
  let ready=false;
  const runtime={root,data,token,instanceId,log,queue,sessions,saveSession,desktopSession,
    async publish(port){origin=`http://127.0.0.1:${port}`;await atomicJson(path.join(data,'runtime.json'),{product:'firefly-gift',version:VERSION,pid:process.pid,port,instanceId,tokenProtected:await protectSecret(token),origin});ready=true;await log('started',{version:VERSION,pid:process.pid,port,instanceId});},
    guard(req,res,url){
      res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');
      if(url.pathname==='/api/health'){res.writeHead(ready?200:503,{'Content-Type':'application/json'});res.end(JSON.stringify({product:'firefly-gift',version:VERSION,pid:process.pid,instanceId,ready}));return false;}
      if(!ready){res.writeHead(503);res.end('Service is preparing');return false;}
      if(req.headers.host!==new URL(origin).host){res.writeHead(403);res.end('Host rejected');return false;}
      const requestOrigin=req.headers.origin;
      if(requestOrigin&&requestOrigin!==origin){res.writeHead(403);res.end('Cross-site request rejected');return false;}
      if(url.pathname==='/_open'){
        const ticket=url.searchParams.get('ticket')||'';
        if(ticket.length===token.length&&crypto.timingSafeEqual(Buffer.from(ticket),Buffer.from(token))){res.writeHead(303,{'Set-Cookie':`firefly_session=${token}; HttpOnly; SameSite=Strict; Path=/`,'Location':'/'});res.end();return false;}
      }
      const cookie=String(req.headers.cookie||'').split(';').some(c=>c.trim()===`firefly_session=${token}`);
      const bearer=req.headers.authorization===`Bearer ${token}`;
      if(!cookie&&!bearer){res.writeHead(401,{'Content-Type':'text/html; charset=utf-8'});res.end('<meta charset="utf-8"><title>流萤 · 请从快捷方式打开</title><p>请双击「流萤」快捷方式打开安全的聊天窗口。</p>');return false;}
      return true;
    },
    async close(){ready=false;await log('stopped');const current=await readJsonFile(path.join(data,'runtime.json'),{});if(current.instanceId===instanceId)await fs.unlink(path.join(data,'runtime.json')).catch(()=>{});const held=await readJsonFile(lockFile,{});if(held.instanceId===instanceId)await fs.unlink(lockFile).catch(()=>{});},
  };
  return runtime;
}
