(()=>{
 const $=s=>document.querySelector(s),bridge=(command,extra={})=>window.chrome?.webview?.postMessage({command,...extra});
 const report=(event,extra={})=>bridge('status',{event,...extra});
 let dismissTimer,fadeTimer,remaining=0,deadline=0,hovering=false;
 function clearDismiss(){clearTimeout(dismissTimer);clearTimeout(fadeTimer);dismissTimer=fadeTimer=null;remaining=0;$('#bubble').classList.remove('fading');}
 function resumeDismiss(){if(busy||hovering||remaining<=0)return;clearTimeout(dismissTimer);deadline=Date.now()+remaining;dismissTimer=setTimeout(()=>{$('#bubble').classList.add('fading');fadeTimer=setTimeout(()=>{$('#bubble').hidden=true;$('#bubble').classList.remove('fading');remaining=0;report('bubble-dismissed');},650);},remaining);}
 function pauseDismiss(){if(dismissTimer){remaining=Math.max(1,deadline-Date.now());clearTimeout(dismissTimer);dismissTimer=null;}if(fadeTimer){clearTimeout(fadeTimer);fadeTimer=null;$('#bubble').classList.remove('fading');remaining=Math.max(remaining,3000);}}
 $('#bubble').onmouseenter=()=>{hovering=true;pauseDismiss();};
 $('#bubble').onmouseleave=()=>{hovering=false;resumeDismiss();};
 let pageVisible=true;
 let model,app,busy=false,history=[],sessionId=crypto.randomUUID(),prefs={},fit=()=>{},voiceAudio;
 function status(text){$('#status').textContent=text;$('#status').hidden=!text;}
 function theme(){const day=prefs.theme==='day';$('#pet').classList.toggle('day',day);bridge('theme',{value:day?'day':'night'});}
 $('#live2d').onpointerdown=e=>{if(e.button===0)bridge('drag');};
 document.oncontextmenu=e=>{e.preventDefault();bridge('menu');};
 $('#live2d').onwheel=e=>{e.preventDefault();bridge('scale',{factor:e.deltaY<0?1.1:.9});};
 $('#message').onkeydown=e=>{if(e.key==='Escape'){$('#bubble').hidden=true;status('');$('#message').blur();}};
 window.chrome?.webview?.addEventListener('message',e=>{
  if(typeof e.data?.visible==='boolean'){pageVisible=e.data.visible;if(pageVisible)app?.ticker?.start?.();else app?.ticker?.stop?.();}
  if(e.data?.notice)status(e.data.notice);if(e.data?.composer)$('#message').focus();
  if(e.data?.composer===false){$('#bubble').hidden=true;status('');}
  if(Number.isInteger(e.data?.expression)){model?.expression(e.data.expression);report('expression');}
  if(e.data?.motion==='Tick2'){model?.motion('Tick2');report('motion');}
 });
 async function initialize(){
  const state=await FireflyClient.json('/api/state'),saved=await FireflyClient.json('/api/client-prefs');
  prefs={...(saved.prefs||{}),voiceEngine:state.config.tts?.engine};theme();
  setInterval(async()=>{if(!pageVisible)return;try{const saved=await FireflyClient.json('/api/client-prefs');prefs={...prefs,...saved.prefs};if(!prefs.voice||prefs.voiceEngine==='off'){voiceAudio?.pause();window.FireflyNativeVoice?.stop();}theme();}catch{}},5000);
  const current=await FireflyClient.json('/api/desktop-session');sessionId=current.id;history=current.messages;
  if(window.FIREFLY_ASSET_LIMITED){const image=document.createElement('img');image.src='/assets/firefly-512.png';image.alt='流萤';image.className='asset-fallback';$('#live2d').append(image);fit=()=>{const bubble=$('#bubble');bubble.style.bottom='220px';bubble.style.maxHeight=Math.max(44,Math.min(180,innerHeight-240))+'px';};fit();new ResizeObserver(fit).observe($('#live2d'));report('asset-fallback');return;}
  if(!window.PIXI?.live2d)throw Error('角色绘图组件没有加载。');
  PIXI.live2d.config.sound=false;
  app=new PIXI.Application({transparent:true,antialias:true,autoDensity:true,resolution:Math.min(devicePixelRatio||1,2),resizeTo:$('#live2d')});$('#live2d').append(app.view);
  model=await PIXI.live2d.Live2DModel.from('/live2d/firefly/firefly.model3.json',{autoInteract:true,autoUpdate:true});app.stage.addChild(model);if(!pageVisible)app.ticker.stop?.();
  const width=model.width,height=model.height;model.anchor.set(.5,1);
  fit=()=>{const box=$('#live2d'),scale=Math.min(box.clientWidth/width,box.clientHeight/height);model.scale.set(scale);model.position.set(box.clientWidth/2,box.clientHeight);const top=Math.max(0,box.clientHeight-height*scale),bubble=$('#bubble');bubble.style.bottom=(innerHeight-top+8)+'px';bubble.style.maxHeight=Math.max(44,Math.min(180,top-14))+'px';};
  fit();new ResizeObserver(fit).observe($('#live2d'));model.motion('Tick2');
  model.on('hit',()=>{model.expression(6);report('expression');});
  let frames=0;app.ticker.add(()=>frames++);setInterval(()=>{report('frames',{count:frames});frames=0;},30000);report('model-ready');
 }
 async function speak(text){
  try{const latest=await FireflyClient.json('/api/client-prefs');prefs={...prefs,...latest.prefs};}catch{return;}
  if(!prefs.voice||prefs.voiceEngine==='off')return;const phrase=text.replace(/[（(][^）)]*[）)]/g,'').replace(/[「」*_]/g,'').trim();if(!phrase)return;
  try{
   const begin=()=>{model?.expression(10);report('speech-start');},end=()=>{model?.expression(0);report('speech-end');};
   if(prefs.voiceEngine==='gpt-sovits'){try{const r=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:phrase})});if(r.ok){const blob=await r.blob();if(window.FireflyNativeVoice?.playWav){begin();const played=await window.FireflyNativeVoice.playWav(await blob.arrayBuffer(),prefs.volume??.9);end();bridge('voice-result',{engine:played.engine||'gpt-sovits-native',played:played.played});if(played.played)return;}const url=URL.createObjectURL(blob);voiceAudio=new Audio(url);voiceAudio.volume=prefs.volume??.9;voiceAudio.onplaying=begin;voiceAudio.onended=()=>{end();URL.revokeObjectURL(url);};if(!prefs.voice||prefs.voiceEngine!=='gpt-sovits'){URL.revokeObjectURL(url);return;}await voiceAudio.play();return;}}catch{report('voice-fallback');}}
   if(window.FireflyNativeVoice?.available){begin();const result=await window.FireflyNativeVoice.speak(phrase,prefs.volume??.9);end();if(!result.played)status(result.error||'语音暂时没有播放。');return;}
   const u=new SpeechSynthesisUtterance(phrase);u.lang='zh-CN';u.volume=prefs.volume??.9;u.onstart=begin;u.onend=end;speechSynthesis.cancel();speechSynthesis.speak(u);
  }catch{status('语音暂时没有播放，文字聊天仍可继续。');}
 }
 $('#composer').onsubmit=async e=>{
  e.preventDefault();const text=$('#message').value.trim();if(!text||busy)return;busy=true;bridge('busy',{value:true});$('#composer button').disabled=true;
  clearDismiss();const bubble=$('#bubble');bubble.hidden=false;bubble.textContent='…';status('');fit();
  try{
   const latest=await FireflyClient.json('/api/desktop-session');sessionId=latest.id;history=latest.messages;
   const messages=[...history,{role:'user',content:text}];
   const reply=await FireflyClient.chat(sessionId,messages,value=>{if(window.FireflyLinks)FireflyLinks.fill(bubble,value);else bubble.textContent=value;bubble.scrollTop=bubble.scrollHeight;},value=>status(value));status('');
   history=[...messages,{role:'assistant',content:reply}];$('#message').value='';model?.expression(/谢谢|开心|喜欢/.test(reply)?10:0);report('reply-complete');speak(reply);remaining=Math.min(60000,Math.max(7000,3500+[...reply].length*140));
  }catch(e){bubble.hidden=true;status(e.message.includes('Key')?'先在完整聊天中完成设置，再来找我。':e.message);}
  finally{busy=false;bridge('busy',{value:false});$('#composer button').disabled=false;if(!$('#bubble').hidden&&remaining>0){report('bubble-scheduled',{count:remaining});resumeDismiss();}}
 };
 initialize().catch(e=>{status('角色暂时没有展开，请从托盘打开完整聊天。');report('render-failed');console.warn(e.message);});
 addEventListener('beforeunload',()=>{speechSynthesis?.cancel();voiceAudio?.pause();app?.destroy(true,{children:true,texture:true,baseTexture:true});});
})();
