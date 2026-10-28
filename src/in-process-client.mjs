import {EventEmitter} from 'node:events';
export class InProcessClient extends EventEmitter {
 constructor(ctx,wire){super();this.wire=wire;this.busy=new Set();this.pending=new Map();this.next=1;
 wire.on('bridge',m=>{if(['ack','ipc-error'].includes(m.type)){const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.type==='ack'?p.resolve(m.result||{ok:true}):p.reject(Error(m.message));}}else this.emit('bridge',m);});
 ctx.on('session/event',(session,event)=>this.emit('notification',{params:{sessionId:String(session.id),event}}));
 }
 ipc(value){const id=this.next++;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('DSH插件请求超时'));},20000);this.pending.set(id,{resolve,reject,timer});this.wire.emit('message',{...value,id});});}
 async chat(sessionId,text,{onToken=()=>{},onStatus=()=>{},mode='auto',explicit=/搜索|查一下|查找|联网|search|https?:/i.test(text),timeout=90000,legacyHistory=[],purpose='chat'}={}){
  if(this.busy.has(sessionId))throw Error('同一会话仍有任务运行');this.busy.add(sessionId);
  let answer='',deltas=0,modelCalls=0,webAttempted=false,held='';const mustVerify=explicit&&mode!=='off';const tools=[],events=[];let finish,rejectEnd;const nextEnd=()=>{const promise=new Promise((a,b)=>{finish=a;rejectEnd=b;});promise.catch(()=>{});return promise;};let done=nextEnd();
  const bridge=m=>{if(m.sessionId!==sessionId)return;if(m.type==='delta'){answer+=m.text;deltas++;if(mustVerify&&!webAttempted)held+=m.text;else onToken(m.text);}if(m.type==='model-start'){modelCalls++;events.push({type:m.type,tools:m.toolNames});}if(m.type==='tool-status'){tools.push(m.tool);onStatus({status:'正在查找资料',tool:m.tool});}};
  const note=m=>{if(m.params?.sessionId!==sessionId)return;const e=m.params.event;if(e){events.push({type:e.type,data:['turn/end','tool/call','tool/result'].includes(e.type)?e.data:undefined});if(e.type==='tool/call'&&['web_search','web_fetch'].includes(e.data.name)){webAttempted=true;if(held){onToken(held);held='';}}if(e.type==='assistant/message'&&!deltas){const text=e.data.message.content.filter(b=>b.type==='text').map(b=>b.text).join('');if(text){answer+=text;if(mustVerify&&!webAttempted)held+=text;else onToken(text);}}if(e.type==='turn/end')finish(e.data.reason);}};
  const exit=()=>rejectEnd(Error('DSH 进程意外中断；不自动重发以防重复调用'));
  this.on('bridge',bridge);this.on('notification',note);this.on('exit',exit);
  let timer;
  try{await this.ipc({type:'policy',sessionId,mode,explicit,purpose});await this.ipc({type:'prompt',sessionId,text,legacyHistory});timer=setTimeout(()=>{this.ipc({type:'cancel',sessionId}).catch(()=>{});rejectEnd(Error('对话超时，已请求取消'));},timeout);let reason=await done;if(mustVerify&&!webAttempted&&reason?.kind==='completed'){events.push({type:'validation-retry',reason:'Explicit search request had no tool attempt; one bounded correction in the same DSH agent.'});answer='';held='';done=nextEnd();await this.ipc({type:'retry-search',sessionId});reason=await done;}if(mustVerify&&!webAttempted){answer='这次没有真正完成联网查找，我不能把猜测当成搜索结果告诉你。可以稍后再试。';onToken(answer);}return {answer,deltas,modelCalls,tools,webAttempted,reason,events};}
  finally{clearTimeout(timer);this.off('bridge',bridge);this.off('notification',note);this.off('exit',exit);this.busy.delete(sessionId);}
 }
 async cancel(sessionId){return this.ipc({type:'cancel',sessionId});}
}
