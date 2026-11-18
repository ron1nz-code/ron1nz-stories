using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
// A receipt is written only by Setup after the user's agreement checkbox was checked.
internal static class InstallerAgreement {
 const string ReceiptName="agreement.accepted";
 static string Digest(string file){using(var hash=SHA256.Create())using(var stream=File.OpenRead(file))return BitConverter.ToString(hash.ComputeHash(stream)).Replace("-","").ToLowerInvariant();}
 internal static void WriteReceipt(string directory){File.WriteAllLines(Path.Combine(directory,ReceiptName),new[]{"Ron1nzStories/EULA/v1",Digest(Path.Combine(directory,"EULA.txt")),DateTime.UtcNow.ToString("O")},Encoding.UTF8);}
 internal static bool HasReceipt(string directory){try{var lines=File.ReadAllLines(Path.Combine(directory,ReceiptName));DateTime date;return lines.Length==3&&lines[0]=="Ron1nzStories/EULA/v1"&&lines[1]==Digest(Path.Combine(directory,"EULA.txt"))&&DateTime.TryParse(lines[2],out date);}catch{return false;}}
}
