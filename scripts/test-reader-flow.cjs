const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const ReaderFlow=require('../dist/reader-flow.js'),ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/story.js'),'utf8'),ctx);const chapters=ctx.window.STORY.chapters;
assert.equal(new ReaderFlow(chapters[0]).gate,null,'Red prologue remains readable');
const chapter=chapters[2],gates=chapter.blocks.filter(b=>b.requiresReveal),flow=new ReaderFlow(chapter);
assert(gates.length>2);assert.equal(flow.gate.id,gates[0].id);assert.equal(flow.visibleBlocks.at(-1).id,gates[0].id);
assert(flow.isLocked(gates[0].id));assert.equal(flow.restore(chapter.blocks.at(-1).id),gates[0].id);assert(!flow.reveal(gates[1].id),'Cannot reveal out of order');
assert(flow.reveal(gates[0].id));assert(!flow.isLocked(gates[0].id));assert.equal(flow.gate.id,gates[1].id);
const resumed=new ReaderFlow(chapter,JSON.parse(JSON.stringify(flow.serialize())));assert.equal(resumed.gate.id,gates[1].id);
for(const prefix of ['Мы с Ильёй крикнули одновременно','То ли услышал']){const b=chapter.blocks.find(b=>b.text?.startsWith(prefix));assert(b);assert(!b.category);assert(!b.requiresReveal);}
for(const b of gates.slice(1))assert(flow.reveal(b.id));assert.equal(flow.gate,null);assert.equal(flow.visibleBlocks.length,chapter.blocks.length);
assert.equal(new ReaderFlow(chapter,['invalid']).gate.id,gates[0].id);
console.log(`PASS: ${gates.length} sequential reveals, restore, persistence, prologue and unmarked passages.`);
