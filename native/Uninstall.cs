using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using System.Diagnostics;
using System.Threading.Tasks;
using Microsoft.Win32;
class Remove {
 internal static string AppRoot {get{return Path.GetFullPath(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs","Ron1nzStories"));}}
 internal static string DataRoot {get{return Path.GetFullPath(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Ron1nzStories"));}}
 static void DeleteOwned(string path,string expected){string resolved=Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar),allowed=Path.GetFullPath(expected).TrimEnd(Path.DirectorySeparatorChar);if(!String.Equals(resolved,allowed,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Некорректный путь удаления.");if(Directory.Exists(resolved))Directory.Delete(resolved,true);}
 internal static void Perform(bool purge){
  if(!File.Exists(Path.Combine(AppRoot,"installation.marker")))throw new InvalidOperationException("Установка приложения не найдена.");
  foreach(var process in Process.GetProcessesByName("Ron1nzStories")){try{if(process.MainModule.FileName==Path.Combine(AppRoot,"Ron1nzStories.exe"))throw new InvalidOperationException("Закройте читалку и повторите удаление.");}catch(System.ComponentModel.Win32Exception){}}
  if(purge)DeleteOwned(DataRoot,Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Ron1nzStories"));
  DeleteOwned(AppRoot,Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs","Ron1nzStories"));
  string menu=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),"Истории ron1nz");DeleteOwned(menu,Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),"Истории ron1nz"));
  string link=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),"Истории ron1nz.lnk");if(File.Exists(link))File.Delete(link);
  Registry.CurrentUser.DeleteSubKeyTree("Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Ron1nzStories",false);
 }
 [STAThread] static void Main(string[] args){
  Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
  bool preview=args.Length==1&&args[0]=="--preview";
  if(!preview&&args.Length==0&&File.Exists(Path.Combine(AppRoot,"installation.marker"))){string copy=Path.Combine(Path.GetTempPath(),"Ron1nzStories-Remove-"+Guid.NewGuid().ToString("N")+".exe");File.Copy(Application.ExecutablePath,copy);Process.Start(copy,"--wizard "+Process.GetCurrentProcess().Id);return;}
  if(!preview&&args.Length>0){int parent;if(args.Length!=2||args[0]!="--wizard"||!int.TryParse(args[1],out parent))return;try{if(!Process.GetProcessById(parent).WaitForExit(10000))return;}catch(ArgumentException){}}
  Application.Run(new RemoveWizard(preview));
 }
}
class RemoveWizard : Form {
 readonly bool preview;int step;bool busy;Label title,description,eyebrow;Button next,back;RadioButton keep,purge;ProgressBar progress;
 public RemoveWizard(bool demo){
  preview=demo;Text="Удаление · Истории · _ron1nz_";ClientSize=new Size(660,440);FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;StartPosition=FormStartPosition.CenterScreen;AutoScaleMode=AutoScaleMode.Dpi;BackColor=Color.FromArgb(22,30,26);ForeColor=Color.FromArgb(224,228,214);Font=new Font("Segoe UI",10);DoubleBuffered=true;
  eyebrow=LabelAt("БИБЛИОТЕКА / _ron1nz_",32,27,595,23,9,Color.FromArgb(187,154,128));
  title=LabelAt("Удалить приложение?",28,66,610,56,24,ForeColor);
  description=LabelAt("Читалка будет удалена с этого компьютера.\nНа следующем шаге можно выбрать, что сделать с данными.",32,135,593,82,11,Color.FromArgb(169,184,165));
  keep=new RadioButton{Text="Сохранить настройки, прогресс и закладки",Checked=true,AutoSize=true,BackColor=Color.Transparent,Location=new Point(35,227),Visible=false};
  purge=new RadioButton{Text="Удалить приложение и все данные чтения",AutoSize=true,BackColor=Color.Transparent,Location=new Point(35,275),Visible=false};Controls.Add(keep);Controls.Add(purge);
  progress=new ProgressBar{Location=new Point(33,324),Size=new Size(592,4),Style=ProgressBarStyle.Marquee,Visible=false};Controls.Add(progress);
  back=ButtonAt("Отмена",375,371,112,false);back.Click+=(s,e)=>{if(step==1){step=0;Render();}else Close();};
  next=ButtonAt("Удалить",502,371,126,true);next.Click+=async(s,e)=>{if(step==0){step=1;Render();}else if(step==1)await Delete();else Close();};
  FormClosing+=(s,e)=>{if(busy)e.Cancel=true;};
 }
 protected override void OnPaintBackground(PaintEventArgs e){using(var brush=new LinearGradientBrush(ClientRectangle,Color.FromArgb(27,37,31),Color.FromArgb(13,21,17),110f))e.Graphics.FillRectangle(brush,ClientRectangle);using(var pen=new Pen(Color.FromArgb(71,85,72)))e.Graphics.DrawLine(pen,32,350,626,350);using(var pen=new Pen(Color.FromArgb(181,126,104),2))e.Graphics.DrawLine(pen,32,16,74,16);}
 Label LabelAt(string text,int x,int y,int w,int h,float size,Color color){var l=new Label{Text=text,Location=new Point(x,y),Size=new Size(w,h),BackColor=Color.Transparent,ForeColor=color,Font=new Font("Segoe UI",size)};Controls.Add(l);return l;}
 Button ButtonAt(string text,int x,int y,int w,bool primary){var b=new Button{Text=text,Location=new Point(x,y),Size=new Size(w,40),FlatStyle=FlatStyle.Flat,BackColor=primary?Color.FromArgb(139,80,65):Color.FromArgb(23,32,26),ForeColor=ForeColor};b.FlatAppearance.BorderColor=Color.FromArgb(105,119,96);Controls.Add(b);return b;}
 void Render(){keep.Visible=purge.Visible=step==1;progress.Visible=false;back.Visible=true;back.Text=step==1?"Назад":"Отмена";next.Enabled=true;
  if(step==0){eyebrow.Text="БИБЛИОТЕКА / _ron1nz_";title.Text="Удалить приложение?";description.Text="Читалка будет удалена с этого компьютера.\nНа следующем шаге можно выбрать, что сделать с данными.";next.Text="Удалить";}
  else if(step==1){eyebrow.Text="УДАЛЕНИЕ / ДАННЫЕ ЧТЕНИЯ";title.Text="Что сделать с данными?";description.Text="При сохранении данные вернутся после повторной установки.\nПолное удаление также сбросит раскрытые шифры.";next.Text="Подтвердить";}
 }
 async Task Delete(){busy=true;keep.Visible=purge.Visible=false;next.Enabled=back.Enabled=false;progress.Visible=true;title.Text="Удаляем приложение…";description.Text="Подождите немного.";bool erase=purge.Checked;
  try{if(preview)await Task.Delay(900);else await Task.Run(()=>Remove.Perform(erase));step=2;eyebrow.Text=preview?"ПРЕДПРОСМОТР / ДАННЫЕ НЕ ИЗМЕНЕНЫ":"УДАЛЕНИЕ ЗАВЕРШЕНО";title.Text="Готово";description.Text=erase?"Приложение и все данные чтения удалены.\nНастройки, закладки и раскрытые шифры сброшены.":"Приложение удалено.\nНастройки, прогресс и закладки сохранены на компьютере.";if(preview)description.Text="Предпросмотр завершения удаления.\nНикакие файлы и настройки не изменялись.";back.Visible=false;next.Text="Закрыть";}
  catch(Exception ex){step=1;Render();description.Text=ex.Message;}
  finally{progress.Visible=false;busy=false;next.Enabled=back.Enabled=true;}
 }
}
