/* Local story progression; unopened fragments never enter the reading DOM. */
class ReaderFlow {
 constructor(chapter,revealed=[]){this.chapter=chapter;const valid=new Set(chapter.blocks.filter(b=>b.requiresReveal).map(b=>b.id));this.revealed=new Set((Array.isArray(revealed)?revealed:[]).filter(id=>valid.has(id)));}
 get gateIndex(){return this.chapter.blocks.findIndex(b=>b.requiresReveal&&!this.revealed.has(b.id));}
 get gate(){const i=this.gateIndex;return i<0?null:this.chapter.blocks[i];}
 get visibleBlocks(){const i=this.gateIndex;return i<0?this.chapter.blocks:this.chapter.blocks.slice(0,i+1);}
 isLocked(id){const index=this.chapter.blocks.findIndex(b=>b.id===id),gate=this.gateIndex;return index>=0&&gate>=0&&index>=gate;}
 restore(id){const index=this.chapter.blocks.findIndex(b=>b.id===id),gate=this.gateIndex;if(gate>=0&&index>=gate)return this.chapter.blocks[gate].id;return index>=0?id:null;}
 reveal(id){if(this.gate?.id!==id)return false;this.revealed.add(id);return true;}
 serialize(){return [...this.revealed];}
}
if(typeof window!=='undefined')window.ReaderFlow=ReaderFlow;
if(typeof module!=='undefined')module.exports=ReaderFlow;
