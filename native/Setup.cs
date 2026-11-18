using System;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Drawing.Drawing2D;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;
[assembly:AssemblyTitle("Установка · Истории")]
[assembly:AssemblyCompany("_ron1nz_")]
[assembly:AssemblyProduct("Истории · _ron1nz_")]
[assembly:AssemblyVersion("1.9.2.0")]
class InstallActionButton : Button {
 bool hover;
 public InstallActionButton(){FlatStyle=FlatStyle.Flat;UseVisualStyleBackColor=false;DoubleBuffered=true;MouseEnter+=(s,e)=>{hover=true;Invalidate();};MouseLeave+=(s,e)=>{hover=false;Invalidate();};EnabledChanged+=(s,e)=>Invalidate();}
 protected override void OnPaint(PaintEventArgs e){Color fill=Enabled?(hover?Color.FromArgb(157,90,79):Color.FromArgb(139,73,65)):Color.FromArgb(35,40,40);Color border=Enabled?Color.FromArgb(180,117,101):Color.FromArgb(61,69,67);Color ink=Enabled?Color.FromArgb(249,238,223):Color.FromArgb(113,125,119);using(var brush=new SolidBrush(fill))e.Graphics.FillRectangle(brush,ClientRectangle);using(var pen=new Pen(border))e.Graphics.DrawRectangle(pen,0,0,Width-1,Height-1);TextRenderer.DrawText(e.Graphics,Text,Font,ClientRectangle,ink,TextFormatFlags.HorizontalCenter|TextFormatFlags.VerticalCenter);if(Focused&&Enabled)ControlPaint.DrawFocusRectangle(e.Graphics,new Rectangle(4,4,Width-8,Height-8),ink,fill);}
}
class Setup : Form {
 [DllImport("user32.dll")] static extern bool AllowSetForegroundWindow(int processId);
 Image coverArt;
 protected override void OnPaintBackground(PaintEventArgs e){
  e.Graphics.Clear(Color.FromArgb(24,32,29));using(var brush=new LinearGradientBrush(new Rectangle(0,0,220,660),Color.FromArgb(17,25,21),Color.FromArgb(9,15,13),90f))e.Graphics.FillRectangle(brush,0,0,220,660);
  if(coverArt!=null)e.Graphics.DrawImage(coverArt,new Rectangle(28,66,164,164));
  using(var font=new Font("Georgia",27))using(var ink=new SolidBrush(Color.FromArgb(223,222,204)))e.Graphics.DrawString("Долгая\nтьма",font,ink,new RectangleF(26,258,182,110));
  using(var font=new Font("Segoe UI",10))using(var ink=new SolidBrush(Color.FromArgb(162,174,154))){e.Graphics.DrawString("_ron1nz_",font,ink,28,387);e.Graphics.DrawString("АВТОРСКАЯ\nБИБЛИОТЕКА",font,ink,28,570);}
  using(var pen=new Pen(Color.FromArgb(67,80,70)))e.Graphics.DrawLine(pen,254,573,846,573);
 }
 Label TextAt(string text,int x,int y,int w,int h,float size,Color ink){var label=new Label{Text=text,Location=new Point(x,y),Size=new Size(w,h),Font=new Font("Segoe UI",size),ForeColor=ink,BackColor=Color.Transparent};Controls.Add(label);return label;}
 readonly string folder=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs","Ron1nzStories");
 Button install,cancel;CheckBox accept,desktop;Label status,installHint;ProgressBar progress;bool finished,busy;
 [STAThread] static void Main(){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new Setup());}
 Setup(){
  DoubleBuffered=true;Text="Установка · Истории";ClientSize=new Size(880,650);FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;StartPosition=FormStartPosition.CenterScreen;BackColor=Color.FromArgb(24,32,29);ForeColor=Color.FromArgb(222,227,215);Font=new Font("Segoe UI",10);AutoScaleMode=AutoScaleMode.Dpi;
  using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("app.ico")){if(stream!=null)Icon=new Icon(stream);}
  using(var art=Assembly.GetExecutingAssembly().GetManifestResourceStream("cover.png")){if(art!=null)coverArt=new Bitmap(Image.FromStream(art));}
  TextAt("УСТАНОВКА / 1.9.2",254,26,590,22,9,Color.FromArgb(184,149,124));
  TextAt("Ваша библиотека историй",250,53,600,44,23,ForeColor);
  TextAt("Долгая тьма · Том I · Первые три главы · 18+",254,101,590,25,10,Color.FromArgb(156,174,155));
  string eula;using(var reader=new StreamReader(Assembly.GetExecutingAssembly().GetManifestResourceStream("EULA.txt"))){eula=reader.ReadToEnd();}
  var terms=new TextBox{Multiline=true,ReadOnly=true,ScrollBars=ScrollBars.Vertical,Text=eula.Replace("\r\n","\n").Replace("\n",Environment.NewLine),Location=new Point(254,140),Size=new Size(592,270),BackColor=Color.FromArgb(17,25,21),ForeColor=Color.FromArgb(191,203,177),BorderStyle=BorderStyle.FixedSingle,Font=new Font("Segoe UI",10)};Controls.Add(terms);
  accept=new CheckBox{Text="Я принимаю пользовательское соглашение",Location=new Point(254,431),AutoSize=true,BackColor=Color.Transparent};accept.CheckedChanged+=(s,e)=>UpdateInstallState();Controls.Add(accept);
  desktop=new CheckBox{Text="Создать ярлык на рабочем столе",Checked=true,Location=new Point(254,468),AutoSize=true,BackColor=Color.Transparent};Controls.Add(desktop);
  status=TextAt(folder+"\nWindows 10/11 x64 · Microsoft Edge WebView2 Runtime",254,513,592,49,9,Color.FromArgb(151,166,155));
  progress=new ProgressBar{Location=new Point(254,565),Size=new Size(592,3),Visible=false};Controls.Add(progress);
  installHint=TextAt("Сначала примите соглашение.",254,592,320,44,10,Color.FromArgb(174,145,125));
  cancel=new Button{Text="Закрыть",Location=new Point(590,590),Size=new Size(112,40),FlatStyle=FlatStyle.Flat,BackColor=Color.FromArgb(24,32,29)};cancel.Click+=(s,e)=>Close();Controls.Add(cancel);
  install=new InstallActionButton{Text="Установить",Location=new Point(716,590),Size=new Size(130,40),Enabled=false};install.Click+=async(s,e)=>{if(finished){var child=System.Diagnostics.Process.Start(Path.Combine(folder,"Ron1nzStories.exe"),"--from-setup");if(child!=null)AllowSetForegroundWindow(child.Id);Close();}else await Install();};Controls.Add(install);
  Shown+=(s,e)=>{terms.SelectionStart=0;terms.SelectionLength=0;terms.ScrollToCaret();accept.Focus();};
 }
 void UpdateInstallState(){if(finished)return;install.Enabled=accept.Checked&&!busy;installHint.Text=accept.Checked?"Всё готово. Можно начать установку.":"Сначала примите пользовательское соглашение.";installHint.ForeColor=accept.Checked?Color.FromArgb(153,173,143):Color.FromArgb(174,135,116);}
 async Task Install(){
  if(!accept.Checked){UpdateInstallState();return;}
  foreach(var process in System.Diagnostics.Process.GetProcessesByName("Ron1nzStories")){try{if(process.MainModule.FileName==Path.Combine(folder,"Ron1nzStories.exe")){MessageBox.Show(this,"Закройте читалку перед установкой обновления.","Читалка запущена");return;}}catch{}}
  busy=true;installHint.Visible=false;install.Enabled=false;cancel.Enabled=false;accept.Enabled=false;desktop.Enabled=false;ControlBox=false;progress.Visible=true;
  try{
   status.Text="Распаковка приложения…";bool makeDesktop=desktop.Checked;
   await Task.Run(()=>{
    Directory.CreateDirectory(folder);
    using(var input=Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))using(var zip=new ZipArchive(input,ZipArchiveMode.Read)){
     int count=0;foreach(var entry in zip.Entries){
      string file=Path.GetFullPath(Path.Combine(folder,entry.FullName.Replace('/',Path.DirectorySeparatorChar)));
      if(!file.StartsWith(folder+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Некорректный путь в архиве.");
      if(entry.FullName.EndsWith("/")){Directory.CreateDirectory(file);continue;}Directory.CreateDirectory(Path.GetDirectoryName(file));entry.ExtractToFile(file,true);count++;int percent=count*100/zip.Entries.Count;BeginInvoke(new Action(()=>progress.Value=percent));
     }
    }
   });
   InstallerAgreement.WriteReceipt(folder);
   File.WriteAllText(Path.Combine(folder,"installation.marker"),"Ron1nzStories 1.9.2");
   string programs=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),"Истории ron1nz");Directory.CreateDirectory(programs);Shortcut(Path.Combine(programs,"Истории.lnk"),Path.Combine(folder,"Ron1nzStories.exe"));Shortcut(Path.Combine(programs,"Удалить.lnk"),Path.Combine(folder,"Uninstall.exe"));
   if(makeDesktop)Shortcut(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),"Истории ron1nz.lnk"),Path.Combine(folder,"Ron1nzStories.exe"));
   using(var key=Registry.CurrentUser.CreateSubKey("Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Ron1nzStories")){
    key.SetValue("DisplayName","Истории · _ron1nz_");key.SetValue("DisplayVersion","1.9.2");key.SetValue("Publisher","_ron1nz_");key.SetValue("InstallLocation",folder);key.SetValue("DisplayIcon",Path.Combine(folder,"Ron1nzStories.exe"));key.SetValue("UninstallString","\""+Path.Combine(folder,"Uninstall.exe")+"\"");key.SetValue("NoModify",1);key.SetValue("NoRepair",1);
   }
   status.Text="Готово. Приложение установлено.\nПриятного чтения.";progress.Value=100;progress.Visible=false;finished=true;busy=false;install.Text="Открыть";install.Enabled=true;cancel.Enabled=true;ControlBox=true;
  }catch(Exception ex){progress.Visible=false;status.Text="Установка не завершена: "+ex.Message;busy=false;ControlBox=true;accept.Enabled=true;desktop.Enabled=true;cancel.Enabled=true;installHint.Visible=true;UpdateInstallState();}
 }
 static void Shortcut(string link,string target){Type type=Type.GetTypeFromProgID("WScript.Shell");dynamic shell=Activator.CreateInstance(type);dynamic shortcut=shell.CreateShortcut(link);shortcut.TargetPath=target;shortcut.WorkingDirectory=Path.GetDirectoryName(target);shortcut.IconLocation=target;shortcut.Save();}
}
