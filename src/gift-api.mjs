import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
import {atomicJson,readJsonFile,validBaseUrl,safeApiError,cleanText} from './gift-core.mjs';
const GROUPS=['facts','promises','self','diary'];
const STAGES=['初识','同行','默契','约定'];
export async function giftApi(req,res,url,c){
  const {runtime:r,loadConfig,saveConfig,loadMemory,saveMemory,readJson,sendJson,dayKey}=c;
  const p=url.pathname;
  const ok=value=>sendJson(res,200,value);
  if(p==='/api/desktop-session'&&req.method==='GET')return ok(await r.desktopSession());
  if(p==='/api/desktop-session'&&req.method==='POST'){const b=await readJson(req);return ok(await r.desktopSession(b.id));}
  if(p==='/api/client-prefs'&&req.method==='GET')return ok({prefs:{...await readJsonFile(path.join(r.data,'client-prefs.json'),{}),voiceEngine:(await loadConfig()).tts?.engine}});
  if(p==='/api/client-prefs'&&req.method==='POST'){const b=await readJson(req),prefs={};for(const key of ['theme','voiceMode'])if(typeof b[key]==='string'&&['night','day','system','gpt','browser'].includes(b[key]))prefs[key]=b[key];for(const key of ['boot','character','fireflies','voice'])if(typeof b[key]==='boolean')prefs[key]=b[key];if(typeof b.volume==='number')prefs.volume=Math.max(0,Math.min(1,b.volume));await atomicJson(path.join(r.data,'client-prefs.json'),prefs);if(prefs.voice===false)await c.voice.stop('disabled');return ok({ok:true});}
  if(p==='/api/connection/test'&&req.method==='POST'){
    const body=await readJson(req),stored=await loadConfig();
    const config={...stored,...body,apiKey:body.apiKey?.trim()||stored.apiKey};
    config.baseUrl=validBaseUrl(config.baseUrl);
    if(!config.apiKey)return sendJson(res,400,{error:'请先填写你自己的 DeepSeek API Key。'});
    try{
      const response=await fetch(`${config.baseUrl}/chat/completions`,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.apiKey}`},body:JSON.stringify({model:config.model,messages:[{role:'user',content:'只回复“连接成功”。'}],max_tokens:32,stream:false,thinking:{type:'disabled'}}),signal:AbortSignal.timeout(30000)});
      if(!response.ok)return sendJson(res,400,{error:safeApiError(response.status),status:response.status});
      const data=await response.json();if(!data.choices?.[0]?.message?.content)throw new Error('empty');
      if(body.save===true){await saveConfig({...stored,baseUrl:config.baseUrl,model:String(config.model),apiKey:config.apiKey});}
      return ok({ok:true,message:'连接好了。把接下来的时间，留给你们。',model:data.model||config.model});
    }catch{return sendJson(res,502,{error:'暂时连不上模型服务。请检查网络或稍后再试；你的资料仍保存在本机。'});}
  }
  if(p==='/api/config/clear-key'&&req.method==='POST'){const config=await loadConfig();config.apiKey='';delete config.apiKeyProtected;await saveConfig(config);return ok({ok:true});}
  if(p==='/api/sessions'&&req.method==='GET')return ok((await r.sessions()).desktop.map(({messages,...x})=>({...x,messageCount:messages.length})));
  if(p==='/api/sessions/new'&&req.method==='POST'){const id=await r.saveSession('desktop',crypto.randomUUID(),[]);return ok({id});}
  if(p==='/api/sessions/save'&&req.method==='POST'){const body=await readJson(req);if(!Array.isArray(body.messages))throw new Error('聊天内容格式不正确。');return ok({id:await r.saveSession('desktop',body.id,body.messages)});}
  if(p.startsWith('/api/sessions/')&&req.method==='GET'){const session=(await r.sessions()).desktop.find(x=>x.id===p.split('/').pop());return session?ok(session):sendJson(res,404,{error:'没有找到这封信。'});}
  if(p==='/api/memory/export'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Content-Disposition':'attachment; filename="firefly-memory.json"'});res.end(JSON.stringify(await loadMemory(),null,2));return true;}
  const backupDir=path.join(r.data,'backups');
  if(p==='/api/memory/backups'&&req.method==='GET'){await fs.mkdir(backupDir,{recursive:true});return ok((await fs.readdir(backupDir)).filter(x=>/^memory-[\dT_Z-]+\.json$/.test(x)).sort().reverse().slice(0,100));}
  if(p==='/api/memory/backup'&&req.method==='POST'){await fs.mkdir(backupDir,{recursive:true});const name='memory-'+new Date().toISOString().replace(/[:.]/g,'_')+'.json';await atomicJson(path.join(backupDir,name),await loadMemory());return ok({ok:true,name});}
  if(p==='/api/memory/restore'&&req.method==='POST'){
    const body=await readJson(req);if(body.confirm!==true||!/^memory-[\dT_Z-]+\.json$/.test(body.name))throw new Error('请选择本机备份并确认恢复。');
    const restored=await readJsonFile(path.join(backupDir,body.name),null);
    if(!restored||!GROUPS.every(g=>Array.isArray(restored[g]))||!restored.relationship||JSON.stringify(restored).length>2000000)throw new Error('备份格式不正确。');
    for(const g of GROUPS)for(const x of restored[g])cleanText(x.text,10000);
    await saveMemory(restored);return ok({ok:true});
  }
  if(p==='/api/memory/edit'&&req.method==='POST'){
    const b=await readJson(req);if(!GROUPS.includes(b.group))throw new Error('记忆分类不正确。');const m=await loadMemory();
    let item=m[b.group].find(x=>x.id===b.id);
    if(b.id&&!item)throw new Error('这条记录已不存在，请刷新。');
    if(!item){item={id:crypto.randomUUID(),created_at:new Date().toISOString(),source:'user-confirmed',date:dayKey()};m[b.group].push(item);}
    if(b.group==='facts'&&m.relationship.nicknames?.some(name=>item.text?.includes(name))){m.relationship.nicknames=[];m.relationship.nameCleared=true;}
    if(b.remove===true)m[b.group]=m[b.group].filter(x=>x.id!==b.id);
    else{item.text=cleanText(b.text??item.text);item.importance=Number.isFinite(b.importance)?Math.max(0,Math.min(1,b.importance)):item.importance??0.6;item.pinned=b.pinned??item.pinned??false;item.updated_at=new Date().toISOString();item.source='user-confirmed';}
    await saveMemory(m);return ok({ok:true});
  }
  if(p==='/api/relationship'&&req.method==='POST'){const b=await readJson(req);if(!STAGES.includes(b.stage))throw new Error('关系阶段不正确。');const m=await loadMemory();m.relationship.stage=b.stage;await saveMemory(m);return ok({ok:true});}
  const pendingFile=path.join(r.data,'memory-proposals.json');
  if(p==='/api/memory/proposals'&&req.method==='GET')return ok(await readJsonFile(pendingFile,[]));
  if(p==='/api/memory/confirm'&&req.method==='POST'){
    const b=await readJson(req);const items=await readJsonFile(pendingFile,[]),item=items.find(x=>x.id===b.id);if(!item)throw new Error('候选记录已处理。');
    if(b.approve===true){const m=await loadMemory();m.facts.push({...item,text:cleanText(b.text||item.text),source:'user-confirmed',confirmed_at:new Date().toISOString()});await saveMemory(m);}
    await atomicJson(pendingFile,items.filter(x=>x.id!==b.id));return ok({ok:true});
  }
  if(p==='/api/tts/status'&&req.method==='GET'){
    const bundled=await c.voice.info();if(bundled.bundled)return ok(bundled);
    const config=await loadConfig();if(config.tts.engine!=='gpt-sovits')return ok({available:false,fallback:'system'});try{const u=validBaseUrl(config.tts.baseUrl);const response=await fetch(u+'/openapi.json',{signal:AbortSignal.timeout(2500)});return ok({available:response.ok,fallback:'system'});}catch{return ok({available:false,fallback:'system'});}
  }
  if(p==='/api/service/stop'&&req.method==='POST'){ok({ok:true});setTimeout(()=>c.shutdown(),100);return true;}
  // Legacy experimental bridges are deliberately unavailable to external callers.
  if(p.startsWith('/api/bridge/'))return sendJson(res,403,{error:'旧QQ和通用微信实验桥接已关闭。请使用设置中的独立微信连接。'});
  if(p.startsWith('/api/wechat/'))return c.wechat.route(req,res,url,c);
  return false;
}
