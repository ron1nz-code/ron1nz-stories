using System;
using System.IO;
using System.Reflection;
class AgreementTest {
 static void Main(string[] args){
  var type=Assembly.LoadFrom(Path.GetFullPath(args[0])).GetType("InstallerAgreement");var check=type.GetMethod("HasReceipt",BindingFlags.NonPublic|BindingFlags.Static);var write=type.GetMethod("WriteReceipt",BindingFlags.NonPublic|BindingFlags.Static);
  string root=Path.GetFullPath(args[1]),folder=Path.GetFullPath(Path.Combine(root,"agreement-fixture-"+Guid.NewGuid().ToString("N")));if(!folder.StartsWith(root.TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new Exception("Invalid fixture path");Directory.CreateDirectory(folder);
  File.WriteAllText(Path.Combine(folder,"EULA.txt"),"TEST FIXTURE ONLY; no legal acceptance");
  if((bool)check.Invoke(null,new object[]{folder}))throw new Exception("Portable/fresh app must not imply agreement");
  write.Invoke(null,new object[]{folder});if(!(bool)check.Invoke(null,new object[]{folder}))throw new Exception("Installer receipt should match its terms");
  File.AppendAllText(Path.Combine(folder,"EULA.txt")," changed");if((bool)check.Invoke(null,new object[]{folder}))throw new Exception("Different terms must not reuse receipt");
  File.WriteAllText(Path.Combine(folder,"agreement.accepted"),"invalid");if((bool)check.Invoke(null,new object[]{folder}))throw new Exception("Invalid receipt must be rejected");
  Console.WriteLine("PASS: fresh/portable, valid installer receipt, changed terms and invalid receipt.");
 }
}
