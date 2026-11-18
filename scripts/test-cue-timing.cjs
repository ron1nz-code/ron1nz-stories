const assert=require('node:assert/strict'),Atmosphere=require('../dist/audio.js');
function mixer(){const a=new Atmosphere();let starts=0;a.enabled=true;a.init=async()=>{};a.ctx={createBufferSource:()=>({connect(){},start(){starts++}}),createGain:()=>({gain:{},connect(){},disconnect(){}})};a.buffer=async()=>({});return {a,starts:()=>starts};}
(async()=>{
 const live=mixer();await live.a.cue('shot');assert.equal(live.starts(),1);
 const stale=mixer();await stale.a.cue('shot',{isCurrent:()=>false});assert.equal(stale.starts(),0);
 const late=mixer();late.a.buffer=()=>new Promise(r=>setTimeout(()=>r({}),230));await late.a.cue('shot');assert.equal(late.starts(),0,'Late decoding must not play a delayed shot');
 const opening=mixer();opening.a.buffer=()=>new Promise(r=>setTimeout(()=>r({}),230));assert.equal(await opening.a.cue('glass',{maxDelay:1500,isCurrent:()=>true}),true,'An opening cue may finish cold decoding while its text stays visible');assert.equal(opening.starts(),1);
 const scene=mixer();let release;scene.a.buffer=()=>new Promise(r=>release=r);const pending=scene.a.cue('shot');await Promise.resolve();scene.a.token++;release({});await pending;assert.equal(scene.starts(),1,'Ambient scene changes must not cancel an on-time effect');
 const stopped=mixer();let finish;stopped.a.buffer=()=>new Promise(r=>finish=r);const cancelled=stopped.a.cue('shot');await Promise.resolve();stopped.a.stopEffects();finish({});await cancelled;assert.equal(stopped.starts(),0,'Leaving the chapter cancels pending effects');
 console.log('PASS: current, stale, late and cancelled effects; independent ambient transitions.');
})().catch(e=>{console.error(e);process.exitCode=1});
