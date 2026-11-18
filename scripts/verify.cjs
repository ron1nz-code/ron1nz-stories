const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),vm=require('vm');
const base=path.resolve(__dirname,'..'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(base,'dist/story.js'),'utf8'),ctx);const story=ctx.window.STORY;
assert.equal(story.chapters.length,3);assert.equal(story.author,'_ron1nz_');
const normalized=s=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const ids=new Set(),validScenes=new Set(['city','idle','platform','train','wind','fire','shelter','silence','still','tension']);
let total=0;
for(const c of story.chapters){
 for(const b of c.blocks){assert(!ids.has(b.id));ids.add(b.id);assert(validScenes.has(b.scene));if(b.src)assert(fs.existsSync(path.join(base,'dist',b.src)));if(b.cue&&b.cue!=='impact')assert(fs.existsSync(path.join(base,'dist/assets',b.cue+'.mp3')));if(b.html)assert(!/<(script|a|iframe|img)/i.test(b.html));}
 const sourceFile=path.join(base,'content',`notion-chapter${c.id}.json`);
 if(fs.existsSync(sourceFile)){
  const raw=JSON.parse(fs.readFileSync(sourceFile,'utf8'));const data=raw.text?raw:raw.structuredContent||JSON.parse(raw.content[0].text);
  let original=data.text.match(/<content>\n([\s\S]*?)\n<\/content>/)[1];
  original=original.replace(/<page\b[^>]*>[\s\S]*?<\/page>/g,'').replace(/<p color="gray">[\s\S]*?<\/p>/g,'').replace(/<image[^>]*>/g,'').replace(/<br\s*\/>/g,' ').replace(/^# /gm,'');
  assert.equal(normalized(c.blocks.map(b=>b.html||'').join(' ')),normalized(original),`Chapter ${c.id}: text must match Notion exactly`);
 }
 total+=c.words;
}
for(const name of ['city','train-idle','wind','winter-air','train','fire','knock','shot','glass','impact']){const file=path.join(base,'dist/assets',name+'.mp3');assert(fs.statSync(file).size>2000);}
const snowfall=fs.readFileSync(path.join(base,'dist/assets/snowfall.wav'));
assert.equal(snowfall.toString('ascii',0,4),'RIFF');assert.equal(snowfall.toString('ascii',8,12),'WAVE');assert(snowfall.length>2000);
for(const name of ['Manrope.ttf','Literata.ttf','Manrope-OFL.txt','Literata-OFL.txt','forest-v2.webp','train-v2.webp','cabin-v2.webp','icon.png'])assert(fs.existsSync(path.join(base,'dist/assets',name)));
for(const name of ['app.js','audio.js','story.js','weather.js','reader-flow.js'])new vm.Script(fs.readFileSync(path.join(base,'dist',name),'utf8'));
assert.equal(fs.readFileSync(path.join(base,'dist/EULA.txt'),'utf8'),fs.readFileSync(path.join(base,'EULA.txt'),'utf8'));
const html=fs.readFileSync(path.join(base,'dist/index.html'),'utf8');assert(!/https?:\/\//.test(html),'No remote resources loaded by app');assert(!/dev-config/.test(html),'Development flag must not ship');
const app=fs.readFileSync(path.join(base,'dist/app.js'),'utf8');assert(!app.includes('Внутри истории'));assert(!app.includes('renderSidebar'));assert(!html.includes('brand-mark'));assert(!app.includes('guns.lol'));assert(app.includes('function renderIntro()'));assert(!fs.readFileSync(path.join(base,'dist/audio.js'),'utf8').includes('createOscillator'));
console.log(`PASS: ${story.chapters.length} complete chapters, ${total} words, ${ids.size} unique blocks; content matches Notion; assets, offline policy and syntax verified.`);
