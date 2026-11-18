(() => {
'use strict';
const S=window.STORY,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const windowsHost=window.chrome?.webview;
const icons={book:'<path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4zM20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3z"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',back:'<path d="M19 12H5m5-5-5 5 5 5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',sound:'<path d="m11 4-6 5H2v6h3l6 5zM16 7a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',mute:'<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>',full:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',exit:'<path d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5"/>',settings:'<path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 3h3l1-3 3-1 2-3-2-2 1-3-2-3-3 1-2-3z"/><circle cx="11.5" cy="11.5" r="3"/>',palette:'<circle cx="12" cy="12" r="9"/><circle cx="8" cy="8" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="17" cy="13" r="1"/><path d="M5 15h5l2 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',check:'<path d="m5 12 4 4L20 5"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">${icons[n]||icons.book}</svg>`;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer;
const storage={get(k,fallback){try{return JSON.parse(localStorage.getItem(k))??fallback;}catch{return fallback;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{toast('Не удалось сохранить данные на устройстве.');}}};
const defaults={size:21,line:1.9,width:720,font:'literata',theme:'night',ambient:10,effects:15,effectsEnabled:true,highlights:true,motion:true,sound:false};
let settings={...defaults,...storage.get('ron1nz.settings.v1',{})};
if(!storage.get('ron1nz.audioDefaults.v2',false)){if(settings.ambient===26)settings.ambient=10;if(settings.effects===30)settings.effects=15;storage.set('ron1nz.settings.v1',settings);storage.set('ron1nz.audioDefaults.v2',true);}
for(const [k,min,max] of [['size',16,30],['line',1.5,2.3],['width',560,900],['ambient',0,70],['effects',0,70]]){const value=Number(settings[k]);settings[k]=Number.isFinite(value)?Math.max(min,Math.min(max,value)):defaults[k];}
if(!['night','coal'].includes(settings.theme))settings.theme='night';
let progress=storage.get('ron1nz.progress.v1',{}),bookmarks=storage.get('ron1nz.bookmarks.v1',[]);
if(!Array.isArray(bookmarks))bookmarks=[];
if(!progress||typeof progress!=='object'||Array.isArray(progress))progress={};
let reveals=storage.get('ron1nz.reveals.v3',{});
if(!reveals||typeof reveals!=='object'||Array.isArray(reveals))reveals={};
let flow=null,textObserver=null,playedCues=new Set(),pendingCues=new Set(),openingCue=[];
function chapterFlow(index){const c=S.chapters[index];return new window.ReaderFlow(c,reveals[c.id]);}
function stopTextAnimation(){textObserver?.disconnect();textObserver=null;}
function animateText(root=document){
 const blocks=$$('.flow-block',root);if(!settings.motion||matchMedia('(prefers-reduced-motion: reduce)').matches||!window.IntersectionObserver){blocks.forEach(el=>el.classList.remove('appear-pending'));return;}
 if(!textObserver)textObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');textObserver.unobserve(entry.target);}},{rootMargin:'0px 0px 35px 0px',threshold:0});
 for(const el of blocks){if(el.classList.contains('is-visible'))continue;el.classList.add('appear-pending');textObserver.observe(el);}
}
function blockHTML(b,i){
 if(flow?.gate?.id===b.id)return `<button type="button" id="${b.id}" data-block="${i}" data-reveal="${b.id}" class="sealed-fragment flow-block" aria-label="Расшифровать фрагмент" title="Нажмите в любом месте, чтобы расшифровать"><span class="cipher-text" aria-hidden="true"></span></button>`;
 if(b.type==='image')return `<figure id="${b.id}" data-block="${i}" class="flow-block"><img src="${b.src}" alt="${escape(b.alt)}" loading="lazy"><figcaption>Иллюстрация из авторской версии рассказа</figcaption></figure>`;
 if(b.type==='heading')return `<h2 id="${b.id}" data-block="${i}" class="flow-block">${b.html}</h2>`;
 return `<p id="${b.id}" data-block="${i}" class="flow-block ${b.category?'marked '+b.category:''}" ${b.category?`title="${categoryNames[b.category]}"`:''}><button class="paragraph-anchor" data-save-block="${b.id}" aria-label="Закладка на этот абзац" title="Закладка на этот абзац">${icon('bookmark')}</button>${b.html}${b.cue?`<button class="cue-replay" data-cue="${b.cue}" title="Повторить звуковой эффект" aria-label="Повторить звуковой эффект">${icon('sound')}</button>`:''}</p>`;
}
function layoutCiphers(){
 const article=$('.reading-text');if(!article)return;const cs=getComputedStyle(article),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
 for(const el of $$('[data-reveal]')){const b=S.chapters[chapterIndex].blocks[Number(el.dataset.block)],style=getComputedStyle(el),width=Math.max(1,el.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)),space=ctx.measureText(' ').width,lines=[];let line=0;
 for(const word of b.text.split(/\s+/)){const w=ctx.measureText(word).width;if(line&&line+space+w>width){lines.push(line);line=0;}line+=(line?space:0)+w;}if(line)lines.push(line);
 $('.cipher-text',el).innerHTML=lines.map((w,i)=>{const chars='ЖШЩЫФДЮЪЯЭХЧЦЙЛЗУ';let seed=Number(el.dataset.block)*31+i*17,ink='';for(let n=0;n<Math.max(2,Math.ceil(w/(parseFloat(cs.fontSize)*.66)));n++){seed=(seed*1664525+1013904223)>>>0;ink+=chars[seed%chars.length];}return `<span class="cipher-line" style="width:${Math.min(width,w)}px;height:${cs.lineHeight}"><span class="cipher-ink">${ink}</span></span>`;}).join('');
 }
}
function cueAt(b,el,delay=0,opening=false){
 if(!audio.enabled||audio.paused||!b.cue||playedCues.has(b.id)||pendingCues.has(b.id))return;
 const revision=pageRevision,pending=pendingCues;pending.add(b.id);setTimeout(async()=>{try{if(view!=='reader'||revision!==pageRevision||!el?.isConnected)return;const started=await audio.cue(b.cue,{maxDelay:opening?1500:200,isCurrent:()=>{const r=el.getBoundingClientRect();return !modal&&revision===pageRevision&&el.isConnected&&r.bottom>76&&r.top<innerHeight-50;}});if(started&&revision===pageRevision){playedCues.add(b.id);if(opening||openingCue.includes(b.id))setTimeout(()=>{if(revision===pageRevision)checkOpeningCue();},1000);}}finally{pending.delete(b.id);}},delay);
}
function checkOpeningCue(){if(!openingCue.length||!audio.enabled||audio.paused||modal)return;for(const id of openingCue){if(playedCues.has(id))continue;if(pendingCues.has(id))return;const b=S.chapters[chapterIndex].blocks.find(b=>b.id===id),el=document.getElementById(id);if(!b||!el||flow.isLocked(id))continue;const r=el.getBoundingClientRect();if(r.bottom>76&&r.top<innerHeight-50){cueAt(b,el,80,true);return;}}}
function cueOnSoundEnable(){if(view!=='reader'||modal)return;const b=S.chapters[chapterIndex].blocks.find(b=>{const el=document.getElementById(b.id);if(!el||!b.cue||flow.isLocked(b.id)||playedCues.has(b.id))return false;const r=el.getBoundingClientRect();return r.bottom>76&&r.top<innerHeight-50;});if(b){const first=S.chapters[chapterIndex].blocks.slice(0,2).filter(x=>x.cue).map(x=>x.id);if(first.includes(b.id))openingCue=first;cueAt(b,document.getElementById(b.id),80,true);}}
async function revealFragment(id){
 if(view!=='reader'||!flow?.reveal(id))return;const old=document.getElementById(id),top=old.getBoundingClientRect().top,chapter=S.chapters[chapterIndex],start=chapter.blocks.findIndex(b=>b.id===id),revealingFlow=flow;
 reveals[chapter.id]=flow.serialize();storage.set('ron1nz.reveals.v3',reveals);old.disabled=true;
 if(motionAllowed()){old.classList.add('decoding');await new Promise(resolve=>setTimeout(resolve,360));}if(!old.isConnected||flow!==revealingFlow||view!=='reader')return;
 const remaining=flow.visibleBlocks.slice(start);let first=null;
 for(let offset=0;offset<remaining.length;offset+=20){
  if(view!=='reader'||flow!==revealingFlow)return;
  const template=document.createElement('template');template.innerHTML=remaining.slice(offset,offset+20).map((b,j)=>blockHTML(b,start+offset+j)).join('');const nodes=[...template.content.children];
  if(!offset){first=nodes[0];old.replaceWith(template.content);first.classList.add('just-revealed','is-visible');first.tabIndex=-1;if(!modal)first.focus({preventScroll:true});window.scrollBy({top:first.getBoundingClientRect().top-top,behavior:'instant'});const b=chapter.blocks[start];if(b.cue&&!playedCues.has(id)){cueAt(b,first,motionAllowed()?100:0);}}
  else $('.reading-text').append(template.content);
  for(const node of nodes){if(node===first)continue;animateText({querySelectorAll:()=>[node]});}
  if(offset+20<remaining.length)await new Promise(requestAnimationFrame);
 }
 layoutCiphers();$('.chapter-end').hidden=!!flow.gate;updateReading(true);
}
function restartChapter(){reveals[S.chapters[chapterIndex].id]=[];storage.set('ron1nz.reveals.v3',reveals);openChapter(chapterIndex,null,true);}

let view='home',chapterIndex=0,activeIndex=-1,modal=null,lastFocus=null,modalPosition=null,saveTimer,scrollScheduled=false,restoreUntil=0,fullscreen=false;
const sceneNames={city:'Ночной город',station:'Вокзал',idle:'Поезд на стоянке',platform:'Перрон',prologue:'Внутри дома',train:'Колёса по рельсам',wind:'Зимний воздух',shelter:'Приглушённый фон',still:'Далёкий зимний фон',fire:'Треск камина',tension:'Воздух за окном',silence:'Тишина'};
const categoryNames={character:'Герои',danger:'Опасность',clue:'Детали и улики',thought:'Мысли и предчувствия'};
const audio=new window.Atmosphere(message=>{toast(message);updateSoundUI();});
if(window.READER_DEV){audio.onFailure=error=>console.warn('[reader] failure '+String(error));audio.onCueStarted=name=>console.info('[reader] cue '+name);audio.onSceneChanged=name=>console.info('[reader] scene '+name);}
const weather=new window.WinterWeather($('#snow'));
let pageRevision=0,pageAnimation=null,pageLeaving=false,modalRevision=0,cueAfterResume=false;
const backgroundControls=[$('#main'),$('.topbar'),$('#reader-dock-root'),$('.skip')];
function motionAllowed(){return settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
function updateBackground(){
 document.documentElement.classList.toggle('has-modal',!!modal);
 for(const element of backgroundControls)element.inert=!!modal||pageLeaving;
}
function transitionPage(render){
 if(modal==='agreement')return;
 if(modal)closeModal();
 const main=$('#main'),ticket=++pageRevision;
 const animated=motionAllowed()&&!!main.firstElementChild&&typeof main.animate==='function';
 pageLeaving=true;
 updateBackground();

 const commit=()=>{
  if(ticket!==pageRevision)return;
  pageAnimation?.cancel();
  pageAnimation=null;
  render();
  pageLeaving=false;
  updateBackground();
  if(!modal)main.focus({preventScroll:true});
  if(!animated||!motionAllowed())return;
  const entrance=main.animate([{opacity:0},{opacity:1}],{
   duration:1000,easing:'cubic-bezier(.2,.65,.25,1)'
  });
  pageAnimation=entrance;
  entrance.onfinish=()=>{if(pageAnimation===entrance)pageAnimation=null;};
 };
 if(!animated){commit();return;}

 // A return during the entrance should fade from the frame already on screen.
 const opacity=getComputedStyle(main).opacity;
 pageAnimation?.cancel();
 pageAnimation=main.animate([{opacity},{opacity:0}],{
  duration:400,easing:'ease',fill:'forwards'
 });
 pageAnimation.onfinish=commit;
}
function resetSecrets(){reveals[3]=[];storage.set('ron1nz.reveals.v3',reveals);if(view==='reader'&&chapterIndex===2)transitionPage(()=>openChapter(2));else{closeModal();toast('Опасные фрагменты снова зашифрованы.');}}

function setView(next){if(next!=='reader')$('#reader-dock-root').innerHTML='';stopTextAnimation();view=next;document.body.dataset.view=next;document.body.dataset.chapter=next==='reader'?String(chapterIndex+1):'0';$('#menu-button').hidden=next==='home';weather.configure(settings.motion,view==='reader'?chapterIndex+1:0,view);}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3400);}
function applySettings(){
 document.documentElement.dataset.theme=settings.theme;
 document.documentElement.style.setProperty('--reader-size',settings.size+'px');document.documentElement.style.setProperty('--reader-line',settings.line);document.documentElement.style.setProperty('--reader-width',settings.width+'px');
 document.documentElement.style.setProperty('--reader-font',settings.font==='serif'?'Georgia, serif':settings.font==='sans'?'Manrope, sans-serif':'Literata, Georgia, serif');
 document.body.classList.toggle('no-highlights',!settings.highlights);document.body.classList.toggle('no-motion',!settings.motion);audio.configure(settings);weather.configure(settings.motion,view==='reader'?chapterIndex+1:0,view);if(!settings.motion){stopTextAnimation();$$('.appear-pending').forEach(el=>el.classList.remove('appear-pending'));}
}
function persistSettings(){storage.set('ron1nz.settings.v1',settings);}
function updateSoundUI(){
 const button=$('#sound-button');button.innerHTML=icon(audio.enabled?'sound':'mute');button.classList.toggle('active',audio.enabled);button.title=button.ariaLabel=audio.enabled?'Выключить звук':'Включить звук';
 const dock=$('.scene-status');if(dock&&dock.dataset.sound!==String(audio.enabled)){dock.dataset.sound=String(audio.enabled);dock.innerHTML=icon(audio.enabled?'sound':'mute');}const scene=$('#scene-label');if(scene)scene.textContent=audio.enabled?(sceneNames[audio.scene]||'Атмосфера'):'Звук выключен';
}
function updateFullUI(){const b=$('#fullscreen-button');b.innerHTML=icon(fullscreen?'exit':'full');b.title=b.ariaLabel=fullscreen?'Выйти из полного экрана · Esc':'Полный экран · F11';}
function renderHome(){
 if(view==='reader')saveProgress();setView('home');activeIndex=-1;audio.setScene('silence');audio.stopEffects();
 $('#top-context').innerHTML='';
 $('#main').innerHTML=`<div class="shelf"><div class="shelf-header"><div><div class="eyebrow">АВТОРСКАЯ БИБЛИОТЕКА</div><h1>Истории</h1></div><span class="shelf-count">01 / РАССКАЗ</span></div><button class="story-card" data-action="intro" aria-label="Открыть историю «Долгая тьма»"><span class="story-card-art" aria-hidden="true"><img src="assets/original-art.png" width="500" height="500" alt=""></span><span class="story-number">I</span><span class="story-card-copy"><span class="story-overline">МИСТИКА · ПСИХОЛОГИЧЕСКИЙ ХОРРОР <span class="age-stamp">18+</span></span><span class="story-name">Долгая<br>тьма</span><span class="red-rule"></span><span class="story-open">ОТКРЫТЬ ИСТОРИЮ${icon('arrow')}</span></span><span class="story-caption">СИБИРЬ. КОНЕЦ ДЕКАБРЯ.</span></button><footer class="library-footer"><span>© 2026 _ron1nz_</span><div class="footer-links"><button class="text-button" data-action="bookmarks">Закладки</button><button class="text-button" data-action="about">О приложении</button><a href="https://ron1nz.ru" target="_blank" rel="noopener">ron1nz.ru</a></div></footer></div>`;
 document.body.prepend(weather.canvas);window.scrollTo({top:0,behavior:'instant'});updateSoundUI();
}
function renderIntro(){
 if(view==='reader')saveProgress();setView('intro');activeIndex=-1;audio.setScene('silence');audio.stopEffects();
 const last=progress.last,continued=last&&S.chapters[last.chapter-1],minutes=S.chapters.reduce((n,c)=>n+c.minutes,0);
 $('#top-context').innerHTML='<span class="context-label">Долгая тьма / Перед началом</span>';
 $('#main').innerHTML=`<section class="intro-page" aria-label="Знакомство с историей"><button class="back-link intro-return" data-action="home">${icon('back')}Все истории</button><div class="intro-grid"><div class="book-jacket original-poster"><img src="assets/original-art.png" width="500" height="500" alt="Оригинальная обложка «Долгая тьма» из Notion"></div><div class="intro-copy"><h1>Долгая тьма</h1><p class="intro-author">Рассказ _ron1nz_<a href="https://ron1nz.ru" target="_blank" rel="noopener">ron1nz.ru ↗</a></p><p class="intro-summary">Перед Новым годом Денис и его друзья отправляются в Сибирь. Впереди — горы, снег и несколько дней в поезде. Но одна остановка меняет всё. И зимний лес оказывается гораздо ближе, чем хотелось бы.</p><div class="intro-meta"><span>ТОМ I · 3 ГЛАВЫ</span><span>≈ ${minutes} МИНУТА ЧТЕНИЯ</span><span>ОФЛАЙН</span></div><div class="intro-warning"><strong>18+ · ХУДОЖЕСТВЕННОЕ ПРОИЗВЕДЕНИЕ</strong><p>Все имена, характеры, места действий и события выдуманы; любые совпадения с реальностью случайны. В тексте есть ненормативная лексика, сцены угрозы и насилия. Звуковое оформление содержит внезапные эффекты.</p></div><div class="intro-actions"><button class="primary" data-action="continue">${continued?'Продолжить чтение':'Начать чтение'}${icon('arrow')}</button><button class="secondary" data-action="chapters">Оглавление</button>${continued?'<button class="text-button" data-action="start-over">С первой главы</button>':''}</div><p class="intro-note">${continued?`Вы остановились: глава ${last.chapter}, «${escape(continued.title)}», ${Math.round(last.percent||0)}%.<br>`:''}</p></div></div></section>`;
 document.body.prepend(weather.canvas);window.scrollTo({top:0,behavior:'instant'});updateSoundUI();
}
function bookmarkHTML(limit=100){return bookmarks.length?bookmarks.slice(-limit).reverse().map(b=>`<div class="bookmark-row"><button data-bookmark="${escape(b.id)}">Глава ${b.chapter}<br>${chapterFlow(b.chapter-1).isLocked(b.block)?'Скрытый фрагмент — раскройте его в главе':escape(b.excerpt.slice(0,80))+'…'}</button><button class="remove" data-remove-bookmark="${escape(b.id)}" title="Удалить закладку" aria-label="Удалить закладку">×</button></div>`).join(''):'<p class="empty-note">Сохраните важный момент кнопкой закладки внизу экрана.</p>';}
function openChapter(index,target=null,fromStart=false){
 index=Number(index);if(!Number.isInteger(index)||!S.chapters[index])return;
 if(view==='reader')saveProgress();chapterIndex=index;setView('reader');activeIndex=-1;restoreUntil=performance.now()+900;audio.stopEffects();
 const chapter=S.chapters[index],saved=progress[chapter.id];flow=chapterFlow(index);playedCues=new Set();pendingCues=new Set();openingCue=[];
 $('#top-context').innerHTML=`<span class="context-label">Долгая тьма <span> / </span> Глава ${chapter.id}</span>`;
 $('#main').innerHTML=`<div class="reader-shell"><div class="reader-content"><button class="back-story" data-action="intro">${icon('back')}К истории</button><div class="reader-title-block"><div class="reader-kicker">ТОМ I <span>/</span> ГЛАВА ${['I','II','III'][index]} <span>/</span> ${chapter.minutes} МИН ЧТЕНИЯ</div><h1>${escape(chapter.title)}</h1><p class="reader-subtitle">${escape(chapter.subtitle)}</p><div class="reader-ornament"></div></div><article class="reading-text" aria-label="Текст главы ${chapter.id}">${flow.visibleBlocks.map(blockHTML).join('')}</article><div class="chapter-end" ${flow.gate?'hidden':''}><div class="chapter-end-text"><strong>${index<2?'Дальше — '+S.chapters[index+1].title:'Продолжение следует…'}</strong></div>${index<2?`<button class="primary" data-chapter="${index+1}" data-start="true">Следующая глава${icon('arrow')}</button>`:'<button class="primary" data-action="intro">К истории</button>'}</div></div></div><div class="reading-dock"><button class="dock-button scene-status" data-action="sound" aria-label="Переключить звуковое оформление">${icon('sound')}</button><div class="progress-track" role="progressbar" aria-label="Прогресс главы" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-bar" style="width:0%"></div></div><span id="progress-label">0%</span><button class="dock-button" data-action="bookmark" title="Добавить закладку · B" aria-label="Добавить закладку">${icon('bookmark')}Закладка</button></div>`;
 $('#reader-dock-root').replaceChildren($('.reading-dock'));$('.reader-content').prepend(weather.canvas);layoutCiphers();
 const location=target?{block:target,offset:0}:!fromStart&&saved?{...saved}:null;if(location){const clamped=flow.restore(location.block);if(clamped!==location.block)location.offset=0;location.block=clamped;}openingCue=!location?chapter.blocks.slice(0,2).filter(b=>b.cue).map(b=>b.id):[];audio.beginChapter(chapter.blocks.find(b=>b.id===location?.block)?.scene||chapter.blocks[0].scene);animateText($('.reading-text'));
 const restore=()=>{if(view!=='reader'||chapterIndex!==index)return;const el=location&&document.getElementById(location.block);const top=el?el.getBoundingClientRect().top+window.scrollY-135+(location.offset||0):0;window.scrollTo({top:Math.max(0,top),behavior:'instant'});updateReading(true);};
 requestAnimationFrame(restore);setTimeout(()=>{if(view==='reader'&&chapterIndex===index)checkOpeningCue();},1150);document.fonts.ready.then(()=>{if(view==='reader'&&chapterIndex===index){layoutCiphers();requestAnimationFrame(restore);}});
 updateSoundUI();
}
function currentAnchor(){const blocks=$$('[data-block]');let result=blocks[0];for(const el of blocks){if(el.getBoundingClientRect().top<=155)result=el;else break;}return result;}
function chapterPercent(){
 const chapter=S.chapters[chapterIndex],blocks=$$('[data-block]');if(!blocks.length)return 0;
 const atBottom=scrollY+innerHeight>=document.documentElement.scrollHeight-8;if(atBottom&&!flow.gate)return 100;
 const line=atBottom?innerHeight-90:innerHeight*.42;let index=0,fraction=0;
 for(const el of blocks){const rect=el.getBoundingClientRect();if(rect.top<=line){index=Number(el.dataset.block);fraction=Math.max(0,Math.min(.99,(line-rect.top)/Math.max(1,rect.height)));}else break;}
 if(flow.gateIndex>=0&&index>=flow.gateIndex){index=flow.gateIndex;fraction=0;}
 return Math.min(99,100*(index+fraction)/chapter.blocks.length);
}
function saveProgress(){if(view!=='reader')return;const el=currentAnchor();if(!el)return;const chapter=S.chapters[chapterIndex],value={chapter:chapter.id,block:el.id,offset:135-el.getBoundingClientRect().top,percent:chapterPercent()};progress[chapter.id]=value;progress.last=value;storage.set('ron1nz.progress.v1',progress);}
function updateReading(restoring=false){
 if(view!=='reader')return;const blocks=$$('[data-block]');let index=0;
 const line=(restoring||performance.now()<restoreUntil)?innerHeight*.42:window.Atmosphere.triggerLine(innerHeight);for(const el of blocks){if(el.getBoundingClientRect().top<line)index=Number(el.dataset.block);else break;}
 const b=S.chapters[chapterIndex].blocks[index];if(!b)return;
 if(index!==activeIndex){const previous=activeIndex;activeIndex=index;audio.setScene(b.scene);if(!restoring&&performance.now()>restoreUntil&&previous>=0&&index>previous&&index-previous<=2){for(let i=previous+1;i<=index;i++){const item=S.chapters[chapterIndex].blocks[i];if(item.cue&&!flow.isLocked(item.id))cueAt(item,document.getElementById(item.id));}}}
 if(!restoring)checkOpeningCue();const percent=Math.round(chapterPercent());$('.progress-bar').style.width=percent+'%';$('.progress-track').setAttribute('aria-valuenow',percent);$('#progress-label').textContent=percent+'%';updateSoundUI();
 clearTimeout(saveTimer);saveTimer=setTimeout(saveProgress,250);
}
function saveBookmark(blockId){
 if(view!=='reader')return;const el=blockId?document.getElementById(blockId):currentAnchor();if(!el)return;
 const b=S.chapters[chapterIndex].blocks[Number(el.dataset.block)];if(flow.isLocked(b.id)){toast('Сначала раскройте скрытый фрагмент.');return;}if(!b.text){toast('Выберите абзац текста для закладки.');return;}
 const id=chapterIndex+'-'+b.id;if(bookmarks.some(x=>x.id===id)){toast('Закладка на это место уже есть.');return;}
 bookmarks.push({id,chapter:chapterIndex+1,block:b.id,excerpt:b.text,date:Date.now()});storage.set('ron1nz.bookmarks.v1',bookmarks);const list=$('#sidebar-bookmarks');if(list)list.innerHTML=bookmarkHTML(4);toast('Место сохранено в закладках.');
}
function goToBookmark(id){const b=bookmarks.find(x=>x.id===id);if(b)transitionPage(()=>{openChapter(b.chapter-1,b.block);flash(b.block);});}
function flash(id){setTimeout(()=>document.getElementById(id)?.classList.add('focused-paragraph'),80);}
function openModal(name,title,body,{wide=false,required=false,footer=''}={}){
 if(modal==='agreement'&&!required)return;++modalRevision;if(!modal){const anchor=view==='reader'?currentAnchor():null;modalPosition={scroll:window.scrollY,block:anchor?.id,top:anchor?.getBoundingClientRect().top};lastFocus=document.activeElement;}modal=name;updateBackground();audio.pause(true);
 const textDialog=required||name==='legal'||name==='license';
 $('#modal-root').innerHTML=`<div class="modal-overlay"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><header class="modal-header"><h2 id="modal-title">${title}</h2>${required?'':`<button class="icon-btn" data-action="close-modal" aria-label="Закрыть">${icon('close')}</button>`}</header><div class="modal-body"${textDialog?' tabindex="0" role="region" aria-label="Текст документа"':''}>${body}</div>${footer}</section></div>`;
 if(modalPosition)window.scrollTo({top:modalPosition.scroll,behavior:'instant'});$('.modal').focus({preventScroll:true});$('.modal-body').scrollTop=0;
}
function closeModal(immediate=false){
 if(modal==='agreement')return;const old=modal,overlay=$('.modal-overlay'),revision=++modalRevision;modal=null;
 const clear=()=>{if(revision===modalRevision)$('#modal-root').innerHTML='';};
 if(overlay&&!immediate&&motionAllowed()){overlay.classList.add('is-closing');overlay.inert=true;overlay.setAttribute('aria-hidden','true');setTimeout(clear,420);}else clear();
 updateBackground();
 if(old){restoreUntil=performance.now()+500;const anchor=modalPosition?.block&&document.getElementById(modalPosition.block);const top=anchor?anchor.getBoundingClientRect().top+window.scrollY-modalPosition.top:modalPosition?.scroll;window.scrollTo({top:top||0,behavior:'instant'});if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});audio.pause(document.hidden).then(()=>{checkOpeningCue();if(cueAfterResume){cueAfterResume=false;cueOnSoundEnable();}});modalPosition=null;}
}
function showChapters(){openModal('chapters','Оглавление',`<p class="modal-description">Долгая тьма · _ron1nz_ · Том I</p><nav class="modal-nav">${S.chapters.map((c,i)=>`<button data-chapter="${i}" ${view==='reader'&&i===chapterIndex?'class="active"':''}>0${c.id} &nbsp; ${c.title}<small>${c.subtitle} · ${c.minutes} мин</small></button>`).join('')}</nav><section class="settings-section"><div class="footer-links"><button class="text-button" data-action="search">Найти в истории</button><button class="text-button" data-action="bookmarks">Сохранённые моменты</button>${view==='reader'?'<button class="text-button" data-action="restart-chapter">Читать эту главу заново</button>':''}</div></section>`);}
function showLegend(){openModal('legend','Язык цвета',`<p class="modal-description">Небольшие акценты помогают заметить важное. Основной текст остаётся спокойным и удобным для чтения.</p><div class="legend-item"><span class="legend-symbol character">◉</span><div><h3 class="character">Герои</h3><p>Внешность, характер и первое знакомство с персонажем.</p></div></div><div class="legend-item"><span class="legend-symbol danger">△</span><div><h3 class="danger">Опасность</h3><p>Опасные фрагменты третьей главы скрыты до нажатия. Раскройте их, чтобы прочитать продолжение. Красный пролог открыт сразу.</p></div></div><div class="legend-item"><span class="legend-symbol clue">◇</span><div><h3 class="clue">Детали и улики</h3><p>Карта, странные следы, названия и другие важные наблюдения.</p></div></div><div class="legend-item"><span class="legend-symbol thought">☾</span><div><h3 class="thought">Мысли и предчувствия</h3><p>Внутренний голос рассказчика и ощущение надвигающейся беды.</p></div></div><p class="keyboard-hint">Наведите указатель на выделенный абзац, чтобы увидеть обозначение. Подсветку можно отключить в настройках.</p>`);}
function slider(key,label,min,max,step,unit){return `<div class="setting-row"><label for="setting-${key}">${label}</label><input id="setting-${key}" type="range" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${settings[key]}"><output for="setting-${key}" data-output="${key}">${settings[key]}${unit}</output></div>`;}
function toggle(key,label,small=''){return `<div class="setting-row"><label for="setting-${key}">${label}${small?`<small>${small}</small>`:''}</label><input class="toggle" id="setting-${key}" type="checkbox" data-setting="${key}" ${settings[key]?'checked':''}></div>`;}
function showSettings(){openModal('settings','Настройки',`<section class="settings-section"><h3>Текст и пространство</h3>${slider('size','Размер текста',16,30,1,' px')}${slider('line','Межстрочный интервал',1.5,2.3,.1,'')}${slider('width','Ширина строки',560,900,20,' px')}<div class="setting-row"><label for="font-select">Шрифт</label><select id="font-select" data-setting="font"><option value="literata" ${settings.font==='literata'?'selected':''}>Literata</option><option value="serif" ${settings.font==='serif'?'selected':''}>Системный с засечками</option><option value="sans" ${settings.font==='sans'?'selected':''}>Manrope</option></select></div>${toggle('highlights','Цветовые акценты')}<div class="secret-setting"><p class="empty-note">Опасные фрагменты третьей главы зашифрованы до нажатия. Пролог открыт сразу.</p><button class="text-button" data-action="reset-secrets">Снова зашифровать фрагменты</button></div></section><section class="settings-section"><h3>Тёмная тема</h3><div class="theme-options"><button class="theme-choice ${settings.theme==='night'?'active':''}" data-theme="night">Ночная</button><button class="theme-choice ${settings.theme==='coal'?'active':''}" data-theme="coal">Угольная</button></div>${toggle('motion','Снег и плавные переходы','Отключите, если движение мешает чтению')}</section><section class="settings-section"><h3>Звуковое оформление</h3>${toggle('sound','Звук включён','Звуковые сцены следуют за текстом')}${slider('ambient','Атмосфера',0,70,1,'%')}${slider('effects','Эффекты',0,70,1,'%')}${toggle('effectsEnabled','Эффекты действий','Стук, разбитое стекло, выстрел')}<p class="empty-note">Внезапные эффекты звучат только при последовательном чтении. В меню и при сворачивании приложения звук приостанавливается.</p></section><p class="keyboard-hint"><kbd>F11</kbd> полный экран &nbsp; <kbd>Esc</kbd> закрыть окно настроек<br><kbd>B</kbd> закладка &nbsp; <kbd>Ctrl</kbd> + <kbd>F</kbd> поиск</p>`);}
async function showAgreement(required=false){
 openModal(required?'agreement':'legal','Перед началом чтения','<p class="empty-note" role="status">Загрузка пользовательского соглашения…</p>',{
  wide:true,required,footer:required?'<div class="agreement-footer" hidden><p>Нажимая кнопку, вы принимаете пользовательское соглашение.</p><button class="primary" data-action="accept-agreement">Принять и продолжить</button></div>':''
 });
 const revision=modalRevision;
 try{
  const response=await fetch('EULA.txt');if(!response.ok)throw Error();const text=await response.text();
  if(revision!==modalRevision)return;
  $('.modal-body').innerHTML=`<p class="modal-description">История для взрослых читателей. В тексте есть ненормативная лексика, сцены угрозы и насилия.</p><div class="legal-text">${escape(text)}</div>`;
  if(required)$('.agreement-footer').hidden=false;
 }catch{
  if(revision!==modalRevision)return;
  $('.modal-body').innerHTML='<p class="empty-note" role="status">Не удалось открыть пользовательское соглашение.</p><button class="secondary" data-action="retry-agreement">Повторить</button>';
 }
}
function showAbout(){
 openModal('about','Об этой библиотеке',`
 <div class="about-author"><div><h3>Истории · _ron1nz_</h3><p>Версия 1.9.2</p></div></div>
 <p class="modal-description">«Долгая тьма», том I. Первые три главы перенесены из Notion.</p>
 <div class="about-note">Всё работает на вашем устройстве. Без регистрации, рекламы и сбора данных.<br>Сохранения не синхронизируются между устройствами.</div>
 <details class="settings-section audio-credits">
  <summary>Источники звуков · Freesound</summary>
  <ul class="source-list">
   <li><a href="https://freesound.org/people/Cameron%20Johnson/sounds/72062/" target="_blank" rel="noopener">Город — Cameron Johnson</a></li>
   <li><a href="https://freesound.org/people/theplax/sounds/613873/" target="_blank" rel="noopener">Стоянка — theplax</a></li>
   <li><a href="https://freesound.org/people/allh/sounds/133099/" target="_blank" rel="noopener">Поезд — allh</a></li>
   <li><a href="https://freesound.org/people/audible-edge/sounds/69512/" target="_blank" rel="noopener">Зимний фон — audible-edge</a></li>
   <li><a href="https://freesound.org/people/Davor/sounds/382616/" target="_blank" rel="noopener">Камин — Davor</a></li>
   <li><a href="https://freesound.org/people/oldhiccup/sounds/567607/" target="_blank" rel="noopener">Стук в дверь — oldhiccup</a></li>
   <li><a href="https://freesound.org/people/Wenpire/sounds/574812/" target="_blank" rel="noopener">Разбитое стекло — Wenpire</a></li>
   <li><a href="https://freesound.org/people/AnthonyChan0/sounds/159707/" target="_blank" rel="noopener">Выстрел — AnthonyChan0</a></li>
   <li><a href="https://freesound.org/people/evisneffo/sounds/66964/" target="_blank" rel="noopener">Удар двери — evisneffo</a></li>
  </ul>
  <p class="empty-note">«train at station interior.wav» — theplax. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Фильтрация, выравнивание громкости и зацикливание. Остальные записи — CC0.</p>
 </details>
 <section class="settings-section"><h3>Шрифты и компоненты</h3><p class="empty-note">Literata — TypeTogether и Manrope — Mikhail Sharanda, SIL Open Font License 1.1. Windows использует Microsoft WebView2, Android — системный Android WebView.</p><div class="footer-links"><a href="assets/Literata-OFL.txt" target="_blank">Лицензия Literata</a><a href="assets/Manrope-OFL.txt" target="_blank">Лицензия Manrope</a></div></section>
 <section class="settings-section"><div class="footer-links">${windowsHost?'':'<button class="text-button" data-action="legal">Пользовательское соглашение</button>'}<a href="https://ron1nz.ru" target="_blank" rel="noopener">Страница автора</a></div></section>`,{wide:true});
}
function showBookmarks(){openModal('bookmarks','Сохранённые моменты',`<p class="modal-description">Ваши закладки хранятся на этом устройстве.</p><div class="bookmark-list">${bookmarkHTML()}</div>`);}
function showSearch(){openModal('search','Найти в истории','<form class="search-row" id="search-form"><input id="search-input" type="search" placeholder="Слово или фраза…" aria-label="Поиск в тексте" maxlength="100"><button class="secondary" type="submit">Найти</button></form><div class="search-results" id="search-results"><p class="empty-note">Поиск по всем трём главам.</p></div>');$('#search-input').focus();}
function search(query){
 query=query.trim();if(query.length<2){$('#search-results').innerHTML='<p class="empty-note">Введите хотя бы два символа.</p>';return;}
 const results=[];for(const [i,c]of S.chapters.entries())for(const b of c.blocks){const at=b.text?.toLocaleLowerCase('ru').indexOf(query.toLocaleLowerCase('ru'));if(at>=0){if(chapterFlow(i).isLocked(b.id)){results.push(`<button class="search-result" data-search-chapter="${i}" data-target="${b.id}"><small>Глава ${c.id} · ${c.title}</small>Совпадение в скрытом фрагменте. Раскройте его в главе.</button>`);continue;}const start=Math.max(0,at-55),end=Math.min(b.text.length,at+query.length+90);results.push(`<button class="search-result" data-search-chapter="${i}" data-target="${b.id}"><small>Глава ${c.id} · ${c.title}</small>${start?'…':''}${escape(b.text.slice(start,at))}<mark class="search-hit">${escape(b.text.slice(at,at+query.length))}</mark>${escape(b.text.slice(at+query.length,end))}${end<b.text.length?'…':''}</button>`);}}
 $('#search-results').innerHTML=results.length?`<p class="empty-note">Найдено: ${results.length}</p>`+results.slice(0,80).join(''):'<p class="empty-note">Совпадений не найдено.</p>';
}
async function toggleSound(force){const value=typeof force==='boolean'?force:!audio.enabled;settings.sound=value;persistSettings();await audio.setEnabled(value);updateSoundUI();if(value&&modal){cueAfterResume=true;await audio.pause(true);}if(value&&!modal)cueOnSoundEnable();if(value)toast('Атмосфера включена. Громкость — в настройках.');}
async function toggleFullscreen(){
 if(windowsHost){windowsHost.postMessage('fullscreen');return;}
 if(window.AndroidHost?.setFullscreen){fullscreen=!fullscreen;window.AndroidHost.setFullscreen(fullscreen);updateFullUI();return;}
 try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Полный экран недоступен в этом окне.');}
}
window.addEventListener('native-fullscreen',e=>{fullscreen=!!e.detail;updateFullUI();});document.addEventListener('fullscreenchange',()=>{fullscreen=!!document.fullscreenElement;updateFullUI();});
const actions={home:()=>transitionPage(renderHome),intro:()=>transitionPage(renderIntro),'start-over':()=>{reveals[3]=[];storage.set('ron1nz.reveals.v3',reveals);transitionPage(()=>openChapter(0,null,true));},'restart-chapter':()=>transitionPage(restartChapter),'reset-secrets':resetSecrets,continue:()=>transitionPage(()=>{const c=progress.last?.chapter||1;openChapter(c-1);}),chapters:showChapters,settings:showSettings,legend:showLegend,about:showAbout,bookmarks:showBookmarks,search:showSearch,legal:()=>showAgreement(false),'retry-agreement':()=>showAgreement(modal==='agreement'),sound:()=>toggleSound(),fullscreen:toggleFullscreen,bookmark:()=>saveBookmark(),'close-modal':closeModal,'accept-agreement':()=>{if(modal!=='agreement'||$('.agreement-footer').hidden)return;storage.set('ron1nz.agreement.v1',{acceptedAt:new Date().toISOString(),version:'1.0'});modal='accepted';closeModal();$('.story-card')?.focus({preventScroll:true});}};
document.addEventListener('click',event=>{
 const license=event.target.closest('a[href^="assets/"]');if(license&&license.getAttribute('href').endsWith('.txt')){event.preventDefault();fetch(license.getAttribute('href')).then(r=>{if(!r.ok)throw Error();return r.text();}).then(text=>openModal('license','Лицензия шрифта',`<div class="legal-text">${escape(text)}</div>`,{wide:true})).catch(()=>toast('Не удалось открыть лицензию.'));return;}
 const button=event.target.closest('button');if(button){
  if(button.dataset.action){actions[button.dataset.action]?.();return;}
  if(button.dataset.chapter!==undefined){transitionPage(()=>openChapter(button.dataset.chapter,null,button.dataset.start==='true'));return;}
  if(button.dataset.bookmark){goToBookmark(button.dataset.bookmark);return;}
  if(button.dataset.removeBookmark){bookmarks=bookmarks.filter(x=>x.id!==button.dataset.removeBookmark);storage.set('ron1nz.bookmarks.v1',bookmarks);if(modal==='bookmarks')showBookmarks();else if($('#sidebar-bookmarks'))$('#sidebar-bookmarks').innerHTML=bookmarkHTML(4);return;}
  if(button.dataset.reveal){revealFragment(button.dataset.reveal);return;}
  if(button.dataset.saveBlock){saveBookmark(button.dataset.saveBlock);return;}
  if(button.dataset.cue){if(!audio.enabled){toast('Включите звук кнопкой вверху экрана.');return;}audio.cue(button.dataset.cue);return;}
  if(button.dataset.theme){settings.theme=button.dataset.theme;applySettings();persistSettings();$$('.theme-choice').forEach(b=>b.classList.toggle('active',b.dataset.theme===settings.theme));return;}
  if(button.dataset.searchChapter!==undefined){transitionPage(()=>{openChapter(button.dataset.searchChapter,button.dataset.target);flash(button.dataset.target);});return;}
 }
 if(event.target.classList.contains('modal-overlay'))closeModal();
});
document.addEventListener('input',event=>{const input=event.target,key=input.dataset.setting;if(!key)return;settings[key]=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value;const output=$(`[data-output="${key}"]`);if(output)output.textContent=input.value+(['ambient','effects'].includes(key)?'%':['size','width'].includes(key)?' px':'');applySettings();persistSettings();if(key==='sound')toggleSound(input.checked);});
document.addEventListener('submit',event=>{if(event.target.id==='search-form'){event.preventDefault();search($('#search-input').value);}});
window.addEventListener('scroll',()=>{if(!scrollScheduled){scrollScheduled=true;requestAnimationFrame(()=>{scrollScheduled=false;updateReading();});}},{passive:true});
window.addEventListener('resize',()=>{layoutCiphers();updateReading(true);});window.addEventListener('pagehide',saveProgress);
document.addEventListener('visibilitychange',()=>{saveProgress();audio.pause(document.hidden||!!modal);});
document.addEventListener('keydown',event=>{
 if(event.key==='F11'){event.preventDefault();toggleFullscreen();return;}
 if(event.key==='Escape'){if(modal&&modal!=='agreement')closeModal();else if(fullscreen)toggleFullscreen();return;}
 if(modal&&event.key==='Tab'){
  const list=$$('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],details > summary:first-of-type,[tabindex="0"]',$('.modal')).filter(el=>el.getClientRects().length);
  const first=list[0],last=list[list.length-1],current=document.activeElement;
  if(!first||!list.includes(current)||current===(event.shiftKey?first:last)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
  return;
 }
 if(/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)||modal)return;
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='f'){event.preventDefault();showSearch();return;}
 if(view==='reader'&&!event.ctrlKey&&!event.altKey&&(event.code==='KeyB')){event.preventDefault();saveBookmark();}
});
window.appBack=()=>{if(modal==='agreement')return false;if(modal){closeModal();return true;}if(view==='reader'){transitionPage(renderIntro);return true;}if(view==='intro'){transitionPage(renderHome);return true;}return false;};
window.nativePause=value=>audio.pause(value||!!modal);
applySettings();$('#menu-button').innerHTML=icon('list');$$('[data-action="legend"]')[0].innerHTML=icon('palette');$$('[data-action="settings"]')[0].innerHTML=icon('settings');updateFullUI();renderHome();
// Windows handles agreement in Setup. The development server shows a dismissible preview.
if(!windowsHost&&!storage.get('ron1nz.agreement.v1',null))showAgreement(!window.READER_DEV);
// Web Audio resumes only after an intentional interaction on each app launch.
if(settings.sound){settings.sound=false;persistSettings();}
})();
