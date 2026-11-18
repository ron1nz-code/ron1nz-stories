using System;
using System.IO;
using System.Reflection;
class UninstallPathsTest {
 static void Main(string[] args){
  string workspace=Path.GetFullPath(args[1]).TrimEnd(Path.DirectorySeparatorChar),fixture=Path.GetFullPath(Path.Combine(workspace,"uninstall-fixture-"+Guid.NewGuid().ToString("N")));
  if(!fixture.StartsWith(workspace+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new Exception("Fixture outside test workspace");
  Directory.CreateDirectory(fixture);File.WriteAllText(Path.Combine(fixture,"settings.json"),"test-only");
  var method=Assembly.LoadFrom(Path.GetFullPath(args[0])).GetType("Remove").GetMethod("DeleteOwned",BindingFlags.NonPublic|BindingFlags.Static);
  bool refused=false;try{method.Invoke(null,new object[]{fixture,fixture+"-different"});}catch(TargetInvocationException ex){refused=ex.InnerException is InvalidOperationException;}
  if(!refused||!File.Exists(Path.Combine(fixture,"settings.json")))throw new Exception("Path mismatch must preserve fixture");
  method.Invoke(null,new object[]{fixture,fixture});if(Directory.Exists(fixture))throw new Exception("Matching test directory should be removed");
  Console.WriteLine("PASS: recursive removal rejects a mismatched path and removes only the named test fixture.");
 }
}
