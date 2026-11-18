const assert=require('node:assert/strict'),Atmosphere=require('../dist/audio.js');
const seconds=Atmosphere.crossfadeSeconds();assert.equal(seconds,2.4);
const captures=[];const param={setValueAtTime:(value,time)=>captures.push({curve:[value],time,duration:0}),linearRampToValueAtTime:(value,time)=>{const item=captures.at(-1);item.curve.push(value);item.duration=time-item.time;}};
Atmosphere.ramp(param,0,.4,7,seconds,true);Atmosphere.ramp(param,.4,0,7,seconds,false);
const [up,down]=captures;assert.equal(up.duration,down.duration);assert.equal(up.curve[0],0);assert(Math.abs(up.curve.at(-1)-.4)<1e-6);assert.equal(down.curve.at(-1),0);
for(let i=0;i<65;i++){const power=(up.curve[i]/.4)**2+(down.curve[i]/.4)**2;assert(Math.abs(power-1)<1e-6,'Crossfade power must not dip between tracks');}
for(const height of [360,640,1000]){const line=Atmosphere.triggerLine(height);assert(line>=height*.75);assert(line<=height-72);assert(line>height*.42,'Trigger is near entry, not the middle');}
console.log('PASS: matched 2.4 s equal-power curves, no silent dip and entry-based sound threshold.');
