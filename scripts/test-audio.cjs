const assert=require('node:assert/strict'),Atmosphere=require('../dist/audio.js');
assert.equal(Atmosphere.ambientGain(0),0);assert(Atmosphere.ambientGain(10)<.012);assert(Atmosphere.ambientGain(26)<.06);assert(Atmosphere.ambientGain(70)<.28);
for(let i=1;i<=70;i++)assert(Atmosphere.ambientGain(i)>Atmosphere.ambientGain(i-1));
assert.deepEqual(Atmosphere.layersFor('silence'),[]);
for(const scene of ['wind','shelter','still','tension']){const layers=Atmosphere.layersFor(scene);assert(layers.length>0,'Winter scenes have an audible background');const winter=layers.find(l=>l[0]==='winter-air');assert(winter);assert(winter[2]<=850,'Harsh high frequencies remain filtered');}
for(const scene of ['wind','shelter','still','tension']){const level=Atmosphere.layersFor(scene).reduce((sum,layer)=>sum+layer[1],0);assert(Atmosphere.ambientGain(70)*level*.9<.8,'Maximum winter mix keeps headroom');assert(Atmosphere.ambientGain(10)*level<.03,'Low slider values stay quiet');}
const fs=require('fs'),vm=require('vm'),path=require('path'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/story.js'),'utf8'),ctx);
for(const b of ctx.window.STORY.chapters[2].blocks.slice(0,109))assert(Atmosphere.layersFor(b.scene).length>0,`Background missing at ${b.id}`);
function mixer(){const audio=new Atmosphere(),events=[];audio.enabled=true;audio.scene='train';audio.init=async()=>{};audio.stopEffects=()=>events.push('effects-stop');audio.fadeOut=()=>events.push('fade-out');audio.reconcileLayers=prepared=>events.push(['mix',prepared[0]]);audio.prepare=async scene=>[scene];return {audio,events};}
(async()=>{
 const a=mixer();await a.audio.beginChapter('train');assert.deepEqual(a.events,['effects-stop',['mix','train']]);assert(!a.events.includes('fade-out'),'Chapter navigation uses overlap, not a forced silent gap');
 const b=mixer();let release;b.audio.prepare=scene=>scene==='train'?new Promise(r=>release=()=>r([scene])):Promise.resolve([scene]);const first=b.audio.beginChapter('train');await Promise.resolve();const second=b.audio.beginChapter('fire');await second;release();await first;assert.deepEqual(b.events.filter(e=>e[0]==='mix'),[['mix','fire']],'Rapid navigation cancels stale audio');
 const c=mixer();let finish;c.audio.prepare=()=>new Promise(r=>finish=()=>r(['train']));const pending=c.audio.beginChapter('train');await Promise.resolve();c.audio.enabled=false;c.audio.token++;finish();await pending;assert(!c.events.some(e=>e[0]==='mix'),'Disabled audio cannot restart');
 console.log('PASS: quiet scene coverage, gain headroom, overlapping chapter changes and cancellation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
