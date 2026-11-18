const fs = require('fs');
const path = require('path');
const base=path.resolve(__dirname,'..');
const names=['Начало','Новые знакомства','Ветер в проводах'];
const subtitles=['Поезд отправляется ночью','Девять попутчиков. Один маршрут.','Станция «Безликое»'];
const decode=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x20;/g,' ');
const plain=s=>decode(s.replace(/<[^>]*>/g,'')).replace(/\s+/g,' ').trim();
const story={id:'long-dark',title:'Долгая тьма',author:'_ron1nz_',age:'18+',edition:'Том I',description:'Поездка в Сибирь должна была стать обычным зимним приключением. Но на затерянной станции поезд исчезает, оставляя друзей среди снега, леса и чужих голосов в темноте.',source:'https://app.notion.com/p/3067899b49d2804d921ed7d2d6546d06',chapters:[]};
for(let c=1;c<=3;c++){
 const source=JSON.parse(fs.readFileSync(path.join(base,'content',`notion-chapter${c}.json`),'utf8'));
 const data=source.text?source:source.structuredContent || JSON.parse(source.content[0].text);
 if(data.truncated || data.unknown_block_count>0) throw Error('Incomplete Notion source');
 let text=data.text.match(/<content>\n([\s\S]*?)\n<\/content>/)[1];
 text=text.replace(/<page\b[^>]*>[\s\S]*?<\/page>/g,'').replace(/<p color="gray">[\s\S]*?<\/p>/g,'').replace(/<p\s*\/>/g,'').replace(/<\/?p[^>]*>/g,'').trim();
 text=text.replace(/<br\s*\/>/g,'\n\n');
 const blocks=[];
 let scene=c===1?'prologue':c===2?'train':'idle';
 for(let raw of text.split(/\n\s*\n/)){
  raw=raw.trim();if(!raw)continue;
  if(raw.startsWith('<image')) {blocks.push({id:`c${c}-p${blocks.length}`,type:'image',src:'assets/station.png',alt:'Иллюстрация станции из авторской страницы в Notion',scene});continue;}
  const heading=raw.startsWith('# '); raw=raw.replace(/^# /,'');
  // Only preserve trusted formatting, never links/scripts/remote resources.
  const html=raw.replace(/<(?!\/?(?:b|i)\b)[^>]*>/g,'');
  const t=plain(html); if(!t)continue;
  if(c===1){if(t.startsWith('За четыре'))scene='city'; if(t.startsWith('Недолго думая'))scene='station'; if(t.startsWith('Наконец, добежав'))scene='train';}
  if(c===2&&t.startsWith('Мои размышления прервал'))scene='idle';
  if(c===3){
   if(t.startsWith('У тамбура'))scene='platform';
   if(t.startsWith('Пока я разглядывал'))scene='shelter';
   if(t.startsWith('На улице по-прежнему'))scene='platform';
   if(t==='Поезда не было.')scene='still';
   if(t.startsWith('Совет дельный'))scene='shelter';
   if(t.startsWith('На улице было на удивление'))scene='wind';
   if(t.startsWith('Зайдя в магазин'))scene='shelter';
   if(t.startsWith('Она выглядела абсолютно'))scene='wind';
   if(t.startsWith('Воняло плесенью'))scene='shelter';
   if(t.startsWith('В этот момент в дом ввалился'))scene='fire';
   if(t.startsWith('Я проснулся от стука'))scene='tension';
  }
  let category='';
  if(/^(Меня зовут Денис|Кирилл –|Максим, а для друзей|Юля –|Маша –|Настя –|Илья –|Егор –|После разговора с девчонками мы)/.test(t))category='character';
  if(/(Срок годности|зона без связи|Название станции|«Безликое»|Рельсы были обильно|идеально чистые|карта обрывалась|на карте значилось|Зарисуй карту)/i.test(t))category='clue';
  if(/^«/.test(t)||/В голове пустота|И тут я снова посмотрел на рельсы|Я долго сидел, смотрел на огонь/.test(t))category='thought';
  if(t==='Поезда не было.'||/Илья, дай ружьё|в окно влетел огромный валун|А потом – УДАР|Дверь затрещала|Новый удар в дверь|Шкаф с грохотом|В окно резко влетела рука|БАМ!/.test(t))category='danger';
  if(c===3&&(t.startsWith('Мы с Ильёй крикнули одновременно')||t.startsWith('То ли услышал')))category='';
  const requiresReveal=c===3&&category==='danger';
  let cue='';
  if(c===1){if(t.startsWith('— Илья, дай ружьё'))cue='glass';if(t.startsWith('Илья молниеносно'))cue='shot';}
  if(c===3){
   if(t==='Я проснулся от стука в дверь.')cue='knock';
   if(t.startsWith('Новый стук.'))cue='knock';
   if(t.startsWith('А потом – УДАР'))cue='impact';
   if(t.startsWith('То ли услышал'))cue='glass';
   if(t==='БАМ!')cue='shot';
  }
  blocks.push({id:`c${c}-p${blocks.length}`,type:heading?'heading':'paragraph',html,text:t,scene,...category&&{category},...cue&&{cue},...requiresReveal&&{requiresReveal:true}});
 }
 const words=blocks.reduce((n,b)=>n+(b.text?.split(/\s+/).length||0),0);
 story.chapters.push({id:c,title:names[c-1],subtitle:subtitles[c-1],source:data.url,words,minutes:Math.ceil(words/190),blocks});
}
fs.writeFileSync(path.join(base,'dist','story.js'),'window.STORY = '+JSON.stringify(story,null,2)+';\n');
console.log(JSON.stringify(story.chapters.map(c=>({chapter:c.id,blocks:c.blocks.length,words:c.words,minutes:c.minutes,cues:c.blocks.filter(b=>b.cue).map(b=>({id:b.id,cue:b.cue})),categories:c.blocks.filter(b=>b.category).length})),null,2));
