using System;using System.IO;using System.Runtime.InteropServices;
internal static class ShellIdentity{
 [DllImport("shell32.dll",CharSet=CharSet.Unicode)]static extern int SetCurrentProcessExplicitAppUserModelID(string id);
 [DllImport("shell32.dll")]static extern int SHGetPropertyStoreForWindow(IntPtr hwnd,ref Guid iid,[MarshalAs(UnmanagedType.Interface)]out IPropertyStore store);
 [StructLayout(LayoutKind.Sequential)]struct PropertyKey{public Guid format;public uint id;public PropertyKey(uint n){format=new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3");id=n;}}
 [StructLayout(LayoutKind.Explicit)]struct PropVariant{[FieldOffset(0)]public ushort type;[FieldOffset(8)]public IntPtr value;}
 [ComImport,Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]interface IPropertyStore{uint GetCount();void GetAt(uint i,out PropertyKey key);void GetValue(ref PropertyKey key,out PropVariant value);void SetValue(ref PropertyKey key,ref PropVariant value);void Commit();}
 static void Set(IPropertyStore store,uint id,string text){var key=new PropertyKey(id);var value=new PropVariant{type=31,value=Marshal.StringToCoTaskMemUni(text)};try{store.SetValue(ref key,ref value);}finally{Marshal.FreeCoTaskMem(value.value);}}
 internal static void ProcessIdentity(string id){Marshal.ThrowExceptionForHR(SetCurrentProcessExplicitAppUserModelID(id));}
 internal static void WindowIdentity(IntPtr hwnd,string id,string root){IPropertyStore store=null;try{var iid=typeof(IPropertyStore).GUID;Marshal.ThrowExceptionForHR(SHGetPropertyStoreForWindow(hwnd,ref iid,out store));Set(store,5,id);Set(store,2,"\""+Path.Combine(root,"Firefly.exe")+"\" --data=\""+RuntimeManager.Data+"\"");Set(store,3,Path.Combine(root,"public","brand","firefly-shell-v3.ico")+",0");Set(store,4,"流萤");store.Commit();RuntimeManager.Log("window-chat","taskbar-identity="+id+" icon=shell-v3");}catch(Exception ex){RuntimeManager.Log("window-chat","taskbar-identity-failed="+ex.GetType().Name);}finally{if(store!=null)Marshal.ReleaseComObject(store);}}
}
