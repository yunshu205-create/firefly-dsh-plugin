using System;using System.IO;using System.Text;using System.Linq;using System.Net;using System.Security.Cryptography;using System.Web.Script.Serialization;using System.Collections.Generic;
[assembly:System.Reflection.AssemblyTitle("流萤")]
[assembly:System.Reflection.AssemblyProduct("Firefly")]
[assembly:System.Reflection.AssemblyVersion("0.1.0.0")]
internal sealed class RuntimeEntry {public string origin,token,instanceId;public int pid;}
internal static class RuntimeManager {
 internal static readonly string Root=AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
 internal static readonly string Data=ResolveData();
 static string ResolveData(){string arg=Environment.GetCommandLineArgs().FirstOrDefault(x=>x.StartsWith("--data=",StringComparison.OrdinalIgnoreCase));string value=arg==null?Environment.GetEnvironmentVariable("FIREFLY_DATA_DIR"):arg.Substring(7);if(String.IsNullOrWhiteSpace(value)||!Path.IsPathRooted(value))throw new Exception("请先从 DSH 加载流萤插件，再打开桌宠。");return Path.GetFullPath(value);}
 internal static readonly JavaScriptSerializer Json=new JavaScriptSerializer{MaxJsonLength=12*1024*1024};
 internal static string Key{get{using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(Data.ToLowerInvariant()))).Replace("-","").Substring(0,24);}}
 internal static void Log(string name,string text){try{Directory.CreateDirectory(Path.Combine(Data,"logs"));File.AppendAllText(Path.Combine(Data,"logs",name+".log"),DateTime.UtcNow.ToString("o")+" "+BootDiagnostics.Clean(text)+Environment.NewLine);}catch{}}
 internal static Dictionary<string,object> Read(string path){return Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(path,Encoding.UTF8));}
 internal static string Call(string origin,string route,string token,string body=null){var req=(HttpWebRequest)WebRequest.Create(origin+route);req.Proxy=null;req.Timeout=3000;req.ReadWriteTimeout=3000;if(token!=null)req.Headers["Authorization"]="Bearer "+token;if(body!=null){req.Method="POST";req.ContentType="application/json";byte[] b=Encoding.UTF8.GetBytes(body);req.ContentLength=b.Length;using(var s=req.GetRequestStream())s.Write(b,0,b.Length);}using(var response=req.GetResponse())using(var reader=new StreamReader(response.GetResponseStream()))return reader.ReadToEnd();}
 internal static RuntimeEntry Existing(){try{var v=Read(Path.Combine(Data,"runtime.json"));var uri=new Uri((string)v["origin"]);if(uri.Scheme!="http"||uri.Host!="127.0.0.1"||uri.AbsolutePath!="/")return null;var h=Json.Deserialize<Dictionary<string,object>>(Call(uri.GetLeftPart(UriPartial.Authority),"/api/health",null));if((string)h["product"]!="firefly-dsh-plugin"||!(bool)h["ready"]||Convert.ToInt32(h["pid"])!=Convert.ToInt32(v["pid"])||(string)h["instanceId"]!=(string)v["instanceId"])return null;string token=Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String((string)v["tokenProtected"]),null,DataProtectionScope.CurrentUser));var e=new RuntimeEntry{origin=uri.GetLeftPart(UriPartial.Authority),token=token,instanceId=(string)v["instanceId"],pid=Convert.ToInt32(v["pid"])};Call(e.origin,"/api/state",e.token);return e;}catch{return null;}}
 // Attach only: this host can never spawn node/DSH or stop the DSH process.
 internal static RuntimeEntry Ensure(bool stop=false,bool restart=false,bool recovery=false){if(restart)throw new Exception("请在 DSH 中管理插件重载。");var e=Existing();if(stop){if(e!=null)Call(e.origin,"/api/service/stop",e.token,"{}");return null;}if(e==null)throw new Exception("DSH 的流萤插件尚未连接。请先加载插件，再点重试。");return e;}
}
