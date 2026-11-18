const fs=require('fs'),path=require('path');
const sharp=require(path.resolve(path.dirname(process.execPath),'../node_modules/sharp'));
const base=path.resolve(__dirname,'..');
(async()=>{const png=await sharp(path.join(base,'dist/assets/icon.svg')).resize(256,256).png().toBuffer();fs.writeFileSync(path.join(base,'dist/assets/icon.png'),png);const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);fs.writeFileSync(path.join(base,'native/app.ico'),Buffer.concat([header,png]));console.log('Icons created');})();
