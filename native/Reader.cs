using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Reflection;
[assembly:AssemblyTitle("Истории · _ron1nz_")]
[assembly:AssemblyDescription("Атмосферная офлайн-читалка авторских рассказов")]
[assembly:AssemblyCompany("_ron1nz_")]
[assembly:AssemblyProduct("Истории · _ron1nz_")]
[assembly:AssemblyCopyright("© 2026 _ron1nz_")]
[assembly:AssemblyVersion("1.9.3.0")]
class Reader : Form {
 WebView2 web; bool full; Rectangle oldBounds; FormWindowState oldState; string profile; bool fromSetup;
 const string Origin="https://library.ron1nz.local";
 [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);
 [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr hwnd,int attr,ref int value,int size);
 [STAThread] static void Main(string[] args){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new Reader(args));}
 Reader(string[] args){
  fromSetup=Array.IndexOf(args,"--from-setup")>=0;
  if(args.Length==2&&args[0]=="--profile")profile=Path.GetFullPath(args[1]);
  Text="Истории · _ron1nz_";BackColor=Color.FromArgb(11,16,22);Size=new Size(1280,880);MinimumSize=new Size(620,500);StartPosition=FormStartPosition.CenterScreen;AutoScaleMode=AutoScaleMode.Dpi;
  var icon=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"app.ico");if(File.Exists(icon))Icon=new Icon(icon);
  web=new WebView2 {Dock=DockStyle.Fill,DefaultBackgroundColor=BackColor};Controls.Add(web);Shown+=async(s,e)=>{TopMost=true;BringToFront();Activate();TopMost=false;SetForegroundWindow(Handle);await LoadReader();};
  Resize+=(s,e)=>{if(web.CoreWebView2!=null)web.CoreWebView2.ExecuteScriptAsync("window.nativePause && window.nativePause("+(WindowState==FormWindowState.Minimized?"true":"false")+");");};
 }
 protected override void OnHandleCreated(EventArgs e){base.OnHandleCreated(e);try{int dark=1;DwmSetWindowAttribute(Handle,20,ref dark,4);}catch{}}
 async Task LoadReader(){
  try{
   string content=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"www");if(!File.Exists(Path.Combine(content,"index.html")))throw new FileNotFoundException("Не найдены файлы читалки.");
   string data=profile??Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Ron1nzStories","ReaderData");
   var env=await CoreWebView2Environment.CreateAsync(null,data);await web.EnsureCoreWebView2Async(env);
   web.CoreWebView2.Profile.PreferredColorScheme=CoreWebView2PreferredColorScheme.Dark;
   web.CoreWebView2.SetVirtualHostNameToFolderMapping("library.ron1nz.local",content,CoreWebView2HostResourceAccessKind.DenyCors);
   web.CoreWebView2.Settings.AreDevToolsEnabled=false;web.CoreWebView2.Settings.AreDefaultContextMenusEnabled=false;web.CoreWebView2.Settings.IsStatusBarEnabled=false;
   web.CoreWebView2.PermissionRequested+=(s,e)=>e.State=CoreWebView2PermissionState.Deny;
   web.CoreWebView2.DownloadStarting+=(s,e)=>e.Cancel=true;
   web.CoreWebView2.NavigationStarting+=(s,e)=>{if(!IsLocal(e.Uri)){e.Cancel=true;OpenExternal(e.Uri);}};
   web.CoreWebView2.NewWindowRequested+=(s,e)=>{e.Handled=true;OpenExternal(e.Uri);};
   web.CoreWebView2.WebMessageReceived+=(s,e)=>{if(!IsLocal(e.Source))return;string value=e.TryGetWebMessageAsString();if(value=="fullscreen")ToggleFullscreen();};
   web.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled=false;
   web.CoreWebView2.NavigationCompleted+=(s,e)=>{if(fromSetup){fromSetup=false;TopMost=true;BringToFront();Activate();TopMost=false;SetForegroundWindow(Handle);}};
   web.CoreWebView2.Navigate(Origin+"/index.html");
  }catch(Exception ex){
   Controls.Clear();var label=new Label {Dock=DockStyle.Fill,Padding=new Padding(40),ForeColor=Color.White,Font=new Font("Segoe UI",14),Text="Не удалось открыть читалку.\n\nДля работы требуется Microsoft Edge WebView2 Runtime.\nУстановите его с официального сайта Microsoft и повторите запуск.\n\n"+ex.Message};Controls.Add(label);
   var link=new LinkLabel {Dock=DockStyle.Bottom,Height=70,Padding=new Padding(40,10,0,0),Text="Скачать Microsoft Edge WebView2 Runtime",LinkColor=Color.Wheat};link.LinkClicked+=(s,e)=>OpenExternal("https://developer.microsoft.com/microsoft-edge/webview2/");Controls.Add(link);
  }
 }
 static bool IsLocal(string uri){Uri value;return Uri.TryCreate(uri,UriKind.Absolute,out value)&&value.Scheme=="https"&&value.Host=="library.ron1nz.local";}
 static void OpenExternal(string uri){Uri value;if(Uri.TryCreate(uri,UriKind.Absolute,out value)&&(value.Scheme=="https"||value.Scheme=="http")){try{System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(uri){UseShellExecute=true});}catch{}}}
 void ToggleFullscreen(){if(!full){oldBounds=Bounds;oldState=WindowState;WindowState=FormWindowState.Normal;FormBorderStyle=FormBorderStyle.None;Bounds=Screen.FromControl(this).Bounds;full=true;}else{FormBorderStyle=FormBorderStyle.Sizable;Bounds=oldBounds;WindowState=oldState;full=false;}if(web.CoreWebView2!=null)web.CoreWebView2.ExecuteScriptAsync("window.dispatchEvent(new CustomEvent('native-fullscreen',{detail:"+(full?"true":"false")+"}));");}
}
