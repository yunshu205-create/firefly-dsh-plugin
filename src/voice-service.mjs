import fs from 'node:fs/promises';import path from 'node:path';import net from 'node:net';import os from 'node:os';import {spawn} from 'node:child_process';
export function createBundledVoice({root,data,log,voiceRoot,idleMs=600000,availableMemory=()=>os.freemem()}){
 const folder=path.resolve(voiceRoot||process.env.FIREFLY_VOICE_DIR||path.join(root,'voice-pack'));
 let child=null,origin='',starting=null,epoch=0,idleTimer=null,lastUsed=null;
 async function manifest(){try{const m=JSON.parse(await fs.readFile(path.join(folder,'voice.json'),'utf8'));if(m.product!=='Firefly'||m.version!==1)throw Error();return m;}catch{return null;}}
 function local(name){const file=path.resolve(folder,name);if(!file.startsWith(folder+path.sep))throw Error('语音组件路径无效。');return file;}
 async function freePort(){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});}
 async function endChild(own,reason){
  if(!own)return;if(child===own){child=null;origin='';clearTimeout(idleTimer);idleTimer=null;}
  if(own.exitCode===null&&own.pid){await new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);resolve();};const timer=setTimeout(()=>{own.removeListener('exit',done);reject(Error('语音进程仍在退出，请稍后重试。'));},5000);own.once('exit',done);try{own.kill();}catch{done();}});}
  await log('voice-stopped',{pid:own.pid,reason});
 }
 async function stop(reason='disabled'){epoch++;clearTimeout(idleTimer);idleTimer=null;const own=child;await endChild(own,reason);}
 function touch(){lastUsed=Date.now();clearTimeout(idleTimer);idleTimer=setTimeout(()=>{stop('idle').catch(()=>{});},idleMs);idleTimer.unref?.();}
 async function start(){
  if(child&&child.exitCode===null&&origin){touch();return origin;}if(starting?.epoch===epoch)return starting.promise;
  const job={epoch,promise:null};starting=job;
  job.promise=(async()=>{let own=null;try{
   const m=await manifest();if(!m)throw Error('未安装本地语音组件，可继续使用系统语音。');
   if(availableMemory()<8*1024**3)throw Error('当前可用内存不足 8GB，暂用系统朗读；流萤声音建议在 16GB 或更大内存的电脑上使用。');
   const port=await freePort();if(job.epoch!==epoch)throw Error('语音准备已取消。');origin='';
   const runtime=local('runtime'),env={...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONNOUSERSITE:'1',PYTHONUTF8:'1',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',PATH:[runtime,path.join(runtime,'Library','bin'),folder,path.join(process.env.WINDIR,'System32'),process.env.WINDIR].join(path.delimiter)};delete env.PYTHONHOME;delete env.PYTHONPATH;
   const temp=path.resolve(data,'voice','tmp');await fs.mkdir(temp,{recursive:true});env.TEMP=temp;env.TMP=temp;env.TMPDIR=temp;env.NUMBA_CACHE_DIR=path.resolve(data,'voice','numba-cache');env.HF_HOME=path.resolve(data,'voice','hf-cache');env.TORCH_HOME=path.resolve(data,'voice','torch-cache');if(job.epoch!==epoch)throw Error('语音准备已取消。');
   own=spawn(local('runtime/python.exe'),[local('launch-voice.py'),'--port',String(port),'--data',path.resolve(data,'voice'),'--parent',String(process.pid)],{cwd:folder,windowsHide:true,env,stdio:'ignore'});child=own;
   let failed=false;own.once('error',()=>{failed=true;});own.once('exit',()=>{if(child===own){child=null;origin='';clearTimeout(idleTimer);}});await log('voice-start',{pid:own.pid,port});
   const url='http://127.0.0.1:'+port,deadline=Date.now()+120000;
   while(Date.now()<deadline){if(job.epoch!==epoch)throw Error('语音准备已取消。');if(failed||own.exitCode!==null)throw Error('本地语音组件没有启动，文字聊天仍可使用。');try{const r=await fetch(url+'/openapi.json',{signal:AbortSignal.timeout(1000)});if(r.ok){if(job.epoch!==epoch)throw Error('语音准备已取消。');origin=url;touch();await log('voice-ready',{pid:own.pid});return origin;}}catch{}await new Promise(r=>setTimeout(r,400));}
   throw Error('本地语音准备超时，已保留文字聊天与系统语音。');
  }catch(error){await endChild(own,'start-failed');throw error;}})().finally(()=>{if(starting===job)starting=null;});return job.promise;
 }
 return {async info(){return {bundled:!!await manifest(),available:!!origin&&child?.exitCode===null,starting:!!starting,pid:child?.pid||null,idleReleaseMinutes:idleMs/60000,lastUsed,fallback:'system'};},
  async resolve(tts){if(tts.engine!=='gpt-sovits')throw Error('当前未启用流萤声音。');const m=await manifest();if(m&&!tts.refAudio){return {baseUrl:await start(),refAudio:local(m.reference),promptText:tts.promptText||m.promptText};}return {baseUrl:String(tts.baseUrl||'').replace(/\/$/,''),refAudio:tts.refAudio||'',promptText:tts.promptText||''};},stop};
}
