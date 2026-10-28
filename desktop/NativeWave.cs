using System;using System.IO;using System.Text;using System.Threading;using System.Threading.Tasks;using System.Collections.Generic;
internal static class NativeWave {
 static System.Media.SoundPlayer Player;static int Epoch;
 internal static void Stop(){Interlocked.Increment(ref Epoch);var p=Player;if(p!=null)try{p.Stop();}catch{}}
 internal static void Play(Dictionary<string,object> b,Action<string,bool,string> completed){
  string id=b.ContainsKey("id")?b["id"] as string:null,encoded=b.ContainsKey("data")?b["data"] as string:null;Guid parsed;
  if(!Guid.TryParse(id,out parsed)||encoded==null||encoded.Length>11*1024*1024)return;
  Stop();int epoch=Epoch;double volume=b.ContainsKey("volume")?Convert.ToDouble(b["volume"]):.85;volume=Math.Max(0,Math.Min(1,volume));
  Task.Run(()=>{bool played=false;string error=null;try{
   byte[] wav=Convert.FromBase64String(encoded);if(wav.Length<44||wav.Length>8*1024*1024||Encoding.ASCII.GetString(wav,0,4)!="RIFF"||Encoding.ASCII.GetString(wav,8,4)!="WAVE")throw new Exception("音频格式无效。");
   bool pcm=false;int start=-1,size=0;
   for(int i=12;i+8<=wav.Length;){uint raw=BitConverter.ToUInt32(wav,i+4);if(raw>Int32.MaxValue||raw>wav.Length-i-8)throw new Exception("音频长度无效。");int length=(int)raw;string tag=Encoding.ASCII.GetString(wav,i,4);if(tag=="fmt "&&length>=16)pcm=BitConverter.ToUInt16(wav,i+8)==1&&BitConverter.ToUInt16(wav,i+22)==16;if(tag=="data"){start=i+8;size=length;}i=checked(i+8+length+(length%2));}
   if(!pcm||start<0||size%2!=0)throw new Exception("当前原生播放只支持16位PCM。");
   for(int i=start;i<start+size;i+=2){short sample=(short)Math.Round(BitConverter.ToInt16(wav,i)*volume);wav[i]=(byte)(sample&255);wav[i+1]=(byte)((sample>>8)&255);}
   if(epoch!=Epoch)return;using(var stream=new MemoryStream(wav))using(var player=new System.Media.SoundPlayer(stream)){Player=player;if(epoch==Epoch){player.PlaySync();played=epoch==Epoch;}if(Player==player)Player=null;}
  }catch{error="角色声音未能播放，可切换系统语音。";}finally{completed(id,played,error);}});
 }
}
