import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {EventEmitter} from 'node:events';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {apply as bridgeApply} from './agent-bridge.mjs';
import {InProcessClient} from './in-process-client.mjs';
import {createGiftRuntime,atomicJson,readJsonFile,cleanText,claimSafeStream} from './gift-core.mjs';
import {giftApi} from './gift-api.mjs';
import {createBundledVoice} from './voice-service.mjs';

export const name='firefly-companion';
export const inject=['systemPrompt','tools','llm','agents','credentials'];
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.dirname(HERE);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.moc3':'application/octet-stream','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.mp3':'audio/mpeg','.wav':'audio/wav'};
export async function apply(ctx,config={}){
 if(process.platform!=='win32')throw Error('流萤桌宠当前仅支持 Windows x64。');
 const settingsHome=path.join(process.env.LOCALAPPDATA||os.homedir(),'Firefly','DSH');
 const local=await readJsonFile(path.join(settingsHome,'components.json'),{});
 const componentRoot=path.resolve(config.componentRoot||local.componentRoot||path.join(ROOT,'components','windows'));
 const data=path.resolve(config.data||path.join(ctx.get('profileContext')?.dir||settingsHome,'firefly-data'));
 const publicRoot=path.resolve(config.publicRoot||path.join(componentRoot,'public')),hostRoot=path.resolve(config.hostRoot||path.join(componentRoot,'host'));
 config={...config,voiceRoot:config.voiceRoot||local.voiceRoot,voiceOrigin:config.voiceOrigin||local.voiceOrigin};
 for(const file of [path.join(hostRoot,'Firefly-Pet.exe'),path.join(hostRoot,'Microsoft.Web.WebView2.Wpf.dll'),path.join(publicRoot,'desktop-pet.html'),path.join(publicRoot,'live2d/firefly/firefly.model3.json')]){
  try{await fs.access(file);}catch{throw Error('流萤桌宠组件尚未配置或文件不完整。请先解压 Windows 组件，运行 Configure-Windows.cmd，再启用插件。');}
 }
 await fs.mkdir(data,{recursive:true});
 // This plugin never owns or starts a DSH process. ctx is the host's existing Agent registry.
 const runtime=await createGiftRuntime(ROOT,data),wire=new EventEmitter();
 for(const name of ['persona.md','background.md','client-policy.md'])try{await fs.copyFile(path.join(ROOT,'resources',name),path.join(data,name),1);}catch(e){if(e.code!=='EEXIST')throw e;}
 try{await fs.writeFile(path.join(data,'memory.json'),JSON.stringify({version:1,facts:[],promises:[],self:[],diary:[],proposals:[],relationship:{stage:'初识',turns:0}},null,2),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
 const model=config.model||ctx.get('agentDefaultModel')?.currentSelection()?.model||'deepseek-flash';
 const provider=config.provider||ctx.get('agentDefaultModel')?.currentSelection()?.provider||'deepseek-official';
 bridgeApply(ctx,{...config,data,model,provider},wire);
 const dsh=new InProcessClient(ctx,wire),approvals=new Map(),children=new Map();
 const voice=createBundledVoice({root:ROOT,data,log:runtime.log,voiceRoot:config.voiceRoot});
 const savedPrefs=await readJsonFile(path.join(data,'client-prefs.json'),{});
 let voiceEngine=savedPrefs.voiceEngine||(config.voiceRoot?'gpt-sovits':'system'),closed=false;
 const loadMemory=()=>readJsonFile(path.join(data,'memory.json'),{facts:[],promises:[],self:[],diary:[],relationship:{stage:'初识',turns:0}});
 const saveMemory=m=>runtime.queue(()=>atomicJson(path.join(data,'memory.json'),m));
 const loadConfig=async()=>({model,temperature:.8,tts:{engine:voiceEngine,textLang:'zh',promptLang:'zh'},diary:{autoEnabled:false}});
 const sendJson=(res,code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));return true;};
 const readJson=async req=>{let b='';for await(const chunk of req){b+=chunk;if(b.length>64000)throw Error('请求过长');}return JSON.parse(b||'{}');};
 const record=(event,fields={})=>runtime.log(event,fields);
 wire.on('bridge',async e=>{
  if(e.type==='approval')approvals.set(e.id,e);
  if(e.type==='approval-closed')approvals.delete(e.id);
  if(e.type==='memory-proposal')try{
   const text=cleanText(e.text,300),id=await runtime.queue(async()=>{
    const file=path.join(data,'memory-proposals.json'),rows=await readJsonFile(file,[]);
    const item={id:crypto.randomUUID(),text,kind:e.kind,created_at:new Date().toISOString(),source:'model-proposal',sourceSessionId:e.sessionId};
    await atomicJson(file,[...rows,item].slice(-100));return item.id;
   });await dsh.ipc({type:'memory-proposal-answer',requestId:e.id,proposalId:id});
  }catch{await dsh.ipc({type:'memory-proposal-answer',requestId:e.id,error:'候选未保存，请重试。'}).catch(()=>{});}
 });
 ctx.on('session/event',(session,event)=>{
  if(!String(session.id).startsWith('firefly-'))return;
  if(['tool/call','tool/result','turn/end'].includes(event.type))record('dsh-event',{sessionId:String(session.id),type:event.type,tool:event.data?.name||null,isError:event.data?.isError||false}).catch(()=>{});
 });
 async function detach(closeHosts=false){
  await Promise.allSettled([...dsh.busy].map(id=>dsh.cancel(id)));
  if(closeHosts)for(const file of ['Firefly-Pet.exe','Firefly.exe']){
   const command=spawn(path.join(hostRoot,file),['--close-window'],{cwd:hostRoot,windowsHide:true,env:{...process.env,FIREFLY_DATA_DIR:data},stdio:'ignore'});
   await new Promise(resolve=>{command.once('exit',resolve);command.once('error',resolve);});
  }
  await voice.stop('pet-detached');await record('pet-detached',{dshPid:process.pid,dshContinues:true});
 }
 function openPet(pet=true){
  const exe=path.join(hostRoot,pet?'Firefly-Pet.exe':'Firefly.exe');
  const child=spawn(exe,[],{cwd:hostRoot,windowsHide:true,env:{...process.env,FIREFLY_DATA_DIR:data},stdio:'ignore'});
  children.set(child.pid,child);child.once('exit',()=>children.delete(child.pid));child.once('error',()=>record('host-start-failed').catch(()=>{}));
  return {started:true,pid:child.pid};
 }
 async function synthesize(text){
  const tts={engine:'gpt-sovits',refAudio:'',promptText:''};
  let target;
  if(config.voiceOrigin){
   const origin=new URL(config.voiceOrigin);if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1')throw Error('语音服务必须是本机回环地址');
   const m=JSON.parse(await fs.readFile(path.join(config.voiceRoot,'voice.json'),'utf8'));
   target={baseUrl:origin.origin,refAudio:path.resolve(config.voiceRoot,m.reference),promptText:m.promptText};
  }else target=await voice.resolve(tts);
  const params=new URLSearchParams({text:cleanText(text,500),text_lang:'zh',ref_audio_path:target.refAudio,prompt_lang:'zh',prompt_text:target.promptText,text_split_method:'cut5',media_type:'wav',streaming_mode:'false'});
  const response=await fetch(target.baseUrl+'/tts?'+params,{signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('流萤声音暂时不可用，仍可使用系统语音。');
  const audio=Buffer.from(await response.arrayBuffer());if(audio.length<44||audio.toString('ascii',0,4)!=='RIFF')throw Error('语音未返回有效WAV');
  await record('voice-generated',{bytes:audio.length,reusedExistingService:!!config.voiceOrigin});return audio;
 }
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://127.0.0.1');
   if(url.pathname==='/api/health')return sendJson(res,closed?503:200,{product:'firefly-dsh-plugin',ready:!closed,pid:process.pid,instanceId:runtime.instanceId});
   if(!runtime.guard(req,res,url))return;
   if(url.pathname==='/api/state')return sendJson(res,200,{config:{...await loadConfig(),hasKey:true,credentialStorage:'DSH'},memory:await loadMemory(),name:'你'});
   if(url.pathname==='/api/plugin/status')return sendJson(res,200,{product:'Firefly',plugin:true,dshPid:process.pid,secondAgentProcess:false,provider,model,hosts:[...children.keys()],voice:await voice.info()});
   if(url.pathname==='/api/plugin/open'&&req.method==='POST')return sendJson(res,200,openPet((await readJson(req)).mode!=='chat'));
   if(url.pathname==='/api/plugin/close'&&req.method==='POST'){await detach(true);return sendJson(res,200,{ok:true,dshContinues:true});}
   if(url.pathname==='/api/service/stop'&&req.method==='POST'){await detach();return sendJson(res,200,{ok:true,dshContinues:true});}
   if(url.pathname==='/api/agent-settings'){if(req.method==='POST'){const b=await readJson(req);if(!['auto','manual','off'].includes(b.searchMode))throw Error('联网模式无效');await atomicJson(path.join(data,'agent-settings.json'),b);}return sendJson(res,200,await readJsonFile(path.join(data,'agent-settings.json'),{searchMode:'auto'}));}
   if(url.pathname==='/api/agent-approvals'){if(req.method==='POST'){const b=await readJson(req),a=approvals.get(b.id);if(!a)throw Error('审批已结束');await dsh.ipc({type:'approval-answer',approvalId:a.id,sessionId:a.sessionId,allow:b.allow===true});return sendJson(res,200,{ok:true});}return sendJson(res,200,[...approvals.values()]);}
   if(url.pathname==='/api/chat'&&req.method==='POST'){
    const b=await readJson(req),latest=b.messages?.at(-1);if(latest?.role!=='user'||typeof latest.content!=='string'||latest.content.length>8000)throw Error('消息格式无效');
    const id='firefly-'+String(b.sessionId);if(!/^firefly-[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('会话无效');
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store'});
    const packet=v=>{if(!res.destroyed)res.write('data: '+JSON.stringify(v)+'\n\n');};
    const stream=claimSafeStream(token=>packet({token}));let done=false;const disconnected=()=>{if(!done)dsh.cancel(id).catch(()=>{});};res.on('close',disconnected);
    try{
     const prefs=await readJsonFile(path.join(data,'agent-settings.json'),{searchMode:'auto'});
     const result=await dsh.chat(id,latest.content,{mode:prefs.searchMode,onToken:t=>stream.push(t),onStatus:packet,timeout:120000});
     const answer=stream.finish();if(result.reason?.kind!=='completed'){await record('turn-incomplete',{sessionId:id,reason:result.reason});throw Error('DSH本轮未完成');}
     const session=await runtime.desktopSession(),history=session.messages||[];
     await runtime.saveSession('desktop',b.sessionId,[...history,{role:'user',content:latest.content},{role:'assistant',content:answer}]);
     await record('chat-complete',{sessionId:id,deltas:result.deltas,modelCalls:result.modelCalls,tools:result.tools});
     done=true;res.end('data: [DONE]\n\n');
    }catch(error){await record('chat-failed',{sessionId:id,message:String(error.message).replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]')});packet({error:'这次回复没有完成，请检查DSH状态或稍后重试。'});done=true;res.end();}finally{res.off('close',disconnected);}return;
   }
   if(url.pathname==='/api/tts'&&req.method==='POST'){const b=await readJson(req);const audio=await synthesize(b.text);res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':audio.length});res.end(audio);return;}
   if(url.pathname==='/api/config'&&req.method==='POST'){const b=await readJson(req);if(b.apiKey||b.baseUrl||b.model)throw Error('模型连接由DSH管理，不在流萤插件中复制或保存密钥');if(b.tts){if(!['gpt-sovits','browser','system'].includes(b.tts.engine))throw Error('声音模式无效');voiceEngine=b.tts.engine;if(voiceEngine!=='gpt-sovits')await voice.stop('disabled');}return sendJson(res,200,{ok:true});}
   if(['/api/memory','/api/diary'].includes(url.pathname)&&req.method==='GET'){const m=await loadMemory();return sendJson(res,200,url.pathname==='/api/memory'?m:m.diary);}
   if(url.pathname==='/api/diary'&&req.method==='POST'){const b=await readJson(req);if(b.confirm!==true)throw Error('日记保存需要确认');const m=await loadMemory();m.diary.push({id:crypto.randomUUID(),text:cleanText(b.text),source:'user-confirmed',created_at:new Date().toISOString()});await saveMemory(m);return sendJson(res,200,{ok:true});}
   const allowed=['/api/desktop-session','/api/client-prefs','/api/memory/','/api/sessions'];
   if(allowed.some(p=>url.pathname===p||p.endsWith('/')&&url.pathname.startsWith(p))||url.pathname.startsWith('/api/sessions/')){
    if(await giftApi(req,res,url,{runtime,loadConfig,saveConfig:async()=>{throw Error('DSH管理配置');},loadMemory,saveMemory,readJson,sendJson,dayKey:()=>new Date().toISOString().slice(0,10),voice})!==false)return;
   }
   if(url.pathname.startsWith('/api/'))return sendJson(res,404,{error:'这个原型尚未开放此操作'});
   const rel=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),file=path.resolve(publicRoot,'.'+rel);
   if(!file.startsWith(publicRoot+path.sep))return sendJson(res,403,{error:'路径无效'});
   const override=['/desktop-pet.js','/native-voice.js'].includes(url.pathname)?path.join(ROOT,'ui',path.basename(file)):null;
   const bytes=await fs.readFile(override||file);res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream'});res.end(bytes);
  }catch(error){if(res.headersSent){res.end();return;}sendJson(res,400,{error:String(error.message).replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]')});}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 await runtime.publish(server.address().port);
 if(!Object.keys(savedPrefs).length)await atomicJson(path.join(data,'client-prefs.json'),{theme:'night',voice:true,voiceEngine,volume:.85,boot:false});
 await atomicJson(path.join(data,'plugin-ready.json'),{pid:process.pid,origin:'http://127.0.0.1:'+server.address().port,model,existingDshContext:true});
 await record('plugin-ready',{dshPid:process.pid,existingDshContext:true});
 const connection=path.join(settingsHome,'connections',crypto.createHash('sha256').update(data.toLowerCase()).digest('hex').slice(0,24)+'.json');
 await atomicJson(connection,{product:'firefly-dsh-plugin',data,pid:process.pid,instanceId:runtime.instanceId,hostRoot,profile:ctx.get('profileContext')?.name||'custom'});
 ctx.effect(()=>async()=>{closed=true;await detach(true);server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await runtime.close();const current=await readJsonFile(connection,{});if(current.instanceId===runtime.instanceId)await fs.unlink(connection).catch(()=>{});wire.removeAllListeners();});
}
