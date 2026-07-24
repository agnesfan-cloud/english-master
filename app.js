let lessons=[];
let hotspotData={version:1,lessons:{}};
const $=s=>document.querySelector(s);
const state={completed:new Set(JSON.parse(localStorage.getItem('em_completed')||'[]')),favorites:new Set(JSON.parse(localStorage.getItem('em_favorites')||'[]')),favOnly:false,category:'全部',query:'',current:1,dark:localStorage.getItem('em_theme')==='dark',editing:false,selectedHotspot:null,showHotspots:true,history:[]};
if(state.dark)document.body.classList.add('dark');

function save(){localStorage.setItem('em_completed',JSON.stringify([...state.completed]));localStorage.setItem('em_favorites',JSON.stringify([...state.favorites]));}
function speak(text,rate=.88){if(!('speechSynthesis'in window))return alert('此瀏覽器不支援語音朗讀。');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=rate;const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>v.lang==='en-US')||voices.find(v=>v.lang.startsWith('en-US'))||null;speechSynthesis.speak(u);}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function filtered(){return lessons.filter(l=>{const t=`${l.id} ${l.title} ${l.titleZh}`.toLowerCase();return t.includes(state.query.toLowerCase())&&(state.category==='全部'||l.category===state.category)&&(!state.favOnly||state.favorites.has(l.id));});}
function render(){const arr=filtered();$('#grid').innerHTML=arr.map(l=>`<article class="card"><button class="thumb" onclick="openLesson(${l.id})">${l.image?`<img src="${l.image}" alt="Lesson ${l.id} ${esc(l.title)}">`:`<div class="placeholder"><b>Lesson ${l.id}</b><span>圖卡待匯入</span></div>`}</button><div class="body"><span class="lesson-no">Lesson ${l.id}</span><h3>${esc(l.title)}</h3><p>${esc(l.titleZh)}</p><div class="actions"><button onclick="toggleFav(${l.id})">${state.favorites.has(l.id)?'★ 已收藏':'☆ 收藏'}</button><button onclick="toggleDone(${l.id})">${state.completed.has(l.id)?'✓ 已完成':'標記完成'}</button></div></div></article>`).join('');updateProgress();}
function updateProgress(){const n=state.completed.size;$('#doneText').textContent=`${n} / 100 課`;$('#bar').style.width=n+'%';$('#percent').textContent=n+'%';const next=lessons.find(l=>!state.completed.has(l.id))||lessons[0];$('#continueTitle').textContent=`Lesson ${next.id}｜${next.titleZh}`;$('#continueBtn').onclick=()=>openLesson(next.id);}
function toggleFav(id){state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);save();render();}
function toggleDone(id){state.completed.has(id)?state.completed.delete(id):state.completed.add(id);save();render();updateDoneBtn();}
function updateDoneBtn(){$('#markDone').textContent=state.completed.has(state.current)?'取消完成':'標記完成';}

function hotspotStorageKey(id){return `em_hotspots_v7_${id}`;}
function getHotspots(id){const saved=JSON.parse(localStorage.getItem(hotspotStorageKey(id))||'null');return saved||hotspotData.lessons[String(id)]||[];}
function clone(v){return JSON.parse(JSON.stringify(v));}
function pushHistory(id){state.history.push({id,list:clone(getHotspots(id))});if(state.history.length>30)state.history.shift();}
function setHotspots(id,list){localStorage.setItem(hotspotStorageKey(id),JSON.stringify(list));}
function hotspotMarkup(h,i){return `<button class="hotspot" data-index="${i}" aria-label="${esc(h.en)}；長按顯示中文" style="left:${h.x}%;top:${h.y}%;width:${h.width}%;height:${h.height}%"><span>${esc(h.en)}</span>${state.editing?'<i class="resize-handle" aria-hidden="true"></i>':''}</button>`;}
function imageCardMarkup(l){if(!l.image)return '<div class="empty">本課圖卡尚未匯入。</div>';const hs=getHotspots(l.id);return `<div class="image-tools"><p>點一下英文單字聽美式英文；長按約半秒顯示中文。</p><button id="editorToggle">${state.editing?'結束編輯':'Hotspot Editor'}</button></div><div id="hotspotStage" class="hotspot-stage ${state.editing?'editing':''} ${state.editing&&state.showHotspots?'show-hotspots':'hide-hotspots'}"><img class="lesson-image" src="${l.image}" alt="Lesson ${l.id} ${esc(l.title)}" draggable="false">${hs.map(hotspotMarkup).join('')}<div id="translation" class="translation" role="status" aria-live="polite"></div></div><div id="editorPanel" class="editor-panel ${state.editing?'open':''}"><div class="editor-help">拖曳空白處新增；拖曳熱區可移動；拖曳右下角圓點可調整大小。</div><label>英文<input id="hotspotEn" placeholder="English"></label><label>中文<input id="hotspotZh" placeholder="中文"></label><div class="editor-actions"><button id="updateHotspot">更新文字</button><button id="deleteHotspot">刪除選取</button><button id="toggleHotspots">${state.showHotspots?'隱藏熱區':'顯示熱區'}</button><button id="undoHotspot" ${state.history.length?'':'disabled'}>復原上一步</button><button id="resetHotspots">還原本課</button><button id="downloadHotspots">匯出 hotspots.json</button></div></div>`;}
function openLesson(id){state.current=id;state.editing=false;state.selectedHotspot=null;const l=lessons.find(x=>x.id===id);if(!l)return;$('#modalTitle').textContent=`Lesson ${l.id}｜${l.title}`;$('#modalSub').textContent=l.titleZh;renderImagePane(l);const c=l.content;$('#wordsPane').innerHTML=c&&c.vocabulary?`<div class="words">${c.vocabulary.map(v=>`<button class="word" onclick='speak(${JSON.stringify(v[0])})'><strong>${esc(v[0])}</strong><span>${esc(v[1])}</span></button>`).join('')}</div>`:`<div class="empty">本課單字資料尚未匯入。</div>`;$('#readingPane').innerHTML=c?`<div class="reading">${(c.core||[]).map(x=>`<button class="speakline" onclick='speak(${JSON.stringify(x)})'>${esc(x)} 🔊</button>`).join('')}<p>${esc(c.reading||'')}</p><button class="primary" onclick='speak(${JSON.stringify(c.reading||'')},.82)'>全文朗讀</button></div>`:`<div class="empty">本課朗讀資料尚未匯入。</div>`;buildQuiz(l);$('#modal').classList.add('open');showTab('image');updateDoneBtn();}
function renderImagePane(l=lessons.find(x=>x.id===state.current)){$('#imagePane').innerHTML=imageCardMarkup(l);if(l.image)bindHotspotUI(l);}

function bindHotspotUI(l){
  const stage=$('#hotspotStage');
  $('#editorToggle').onclick=()=>{state.editing=!state.editing;state.selectedHotspot=null;renderImagePane(l);};
  stage.querySelectorAll('.hotspot').forEach(btn=>{
    let timer=null,longPressed=false,cancelled=false,startPoint=null;
    const index=Number(btn.dataset.index);
    const start=e=>{e.preventDefault();if(state.editing){beginHotspotEdit(e,l,index,btn,stage);return;}longPressed=false;cancelled=false;startPoint={x:e.clientX,y:e.clientY};timer=setTimeout(()=>{longPressed=true;btn.classList.add('pressed');showTranslation(getHotspots(l.id)[index],btn);},520);};
    const move=e=>{if(startPoint&&Math.hypot(e.clientX-startPoint.x,e.clientY-startPoint.y)>8){cancelled=true;if(timer)clearTimeout(timer);}};
    const end=()=>{if(timer)clearTimeout(timer);btn.classList.remove('pressed');if(!state.editing&&!longPressed&&!cancelled){btn.classList.remove('activated');void btn.offsetWidth;btn.classList.add('activated');speak(getHotspots(l.id)[index].en);}startPoint=null;};
    const cancel=()=>{if(timer)clearTimeout(timer);cancelled=true;};
    btn.addEventListener('pointerdown',start);btn.addEventListener('pointermove',move);btn.addEventListener('pointerup',end);btn.addEventListener('pointercancel',cancel);btn.addEventListener('pointerleave',cancel);btn.addEventListener('contextmenu',e=>e.preventDefault());btn.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});btn.addEventListener('selectstart',e=>e.preventDefault());
  });
  if(!state.editing)return;
  let start=null,draft=null;
  stage.addEventListener('pointerdown',e=>{if(e.target.closest('.hotspot'))return;const r=stage.getBoundingClientRect();start={x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};draft=document.createElement('div');draft.className='hotspot draft';stage.appendChild(draft);stage.setPointerCapture(e.pointerId);});
  stage.addEventListener('pointermove',e=>{if(!start||!draft)return;const r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;Object.assign(draft.style,{left:Math.min(start.x,x)+'%',top:Math.min(start.y,y)+'%',width:Math.abs(x-start.x)+'%',height:Math.abs(y-start.y)+'%'});});
  stage.addEventListener('pointerup',e=>{if(!start||!draft)return;const box={x:parseFloat(draft.style.left),y:parseFloat(draft.style.top),width:parseFloat(draft.style.width),height:parseFloat(draft.style.height)};start=null;draft.remove();draft=null;if(box.width<1||box.height<1)return;pushHistory(l.id);const list=getHotspots(l.id);list.push({...box,en:'New word',zh:'新單字'});setHotspots(l.id,list);state.selectedHotspot=list.length-1;renderImagePane(l);selectHotspot(state.selectedHotspot);});
  $('#updateHotspot').onclick=()=>updateSelected(l.id);$('#deleteHotspot').onclick=()=>deleteSelected(l.id);$('#toggleHotspots').onclick=()=>{state.showHotspots=!state.showHotspots;renderImagePane(l);};$('#undoHotspot').onclick=()=>undoHotspot(l.id);$('#resetHotspots').onclick=()=>{pushHistory(l.id);localStorage.removeItem(hotspotStorageKey(l.id));state.selectedHotspot=null;renderImagePane(l);};$('#downloadHotspots').onclick=downloadHotspots;
}
function beginHotspotEdit(e,l,index,btn,stage){
  e.preventDefault();e.stopPropagation();selectHotspot(index);pushHistory(l.id);
  const list=getHotspots(l.id),original={...list[index]},stageRect=stage.getBoundingClientRect();
  const resizing=Boolean(e.target.closest('.resize-handle'));
  const startX=e.clientX,startY=e.clientY;
  btn.setPointerCapture?.(e.pointerId);
  const move=ev=>{
    const dx=(ev.clientX-startX)/stageRect.width*100,dy=(ev.clientY-startY)/stageRect.height*100;
    if(resizing){
      list[index].width=Math.max(2,Math.min(100-original.x,original.width+dx));
      list[index].height=Math.max(2,Math.min(100-original.y,original.height+dy));
    }else{
      list[index].x=Math.max(0,Math.min(100-original.width,original.x+dx));
      list[index].y=Math.max(0,Math.min(100-original.height,original.y+dy));
    }
    Object.assign(btn.style,{left:list[index].x+'%',top:list[index].y+'%',width:list[index].width+'%',height:list[index].height+'%'});
  };
  const finish=ev=>{
    btn.removeEventListener('pointermove',move);btn.removeEventListener('pointerup',finish);btn.removeEventListener('pointercancel',finish);
    setHotspots(l.id,list);btn.releasePointerCapture?.(ev.pointerId);selectHotspot(index);
  };
  btn.addEventListener('pointermove',move);btn.addEventListener('pointerup',finish);btn.addEventListener('pointercancel',finish);
}
function selectHotspot(index){state.selectedHotspot=index;document.querySelectorAll('.hotspot').forEach((b,i)=>b.classList.toggle('selected',i===index));const h=getHotspots(state.current)[index];if(h){$('#hotspotEn').value=h.en;$('#hotspotZh').value=h.zh;}}
function updateSelected(id){if(state.selectedHotspot===null)return alert('請先點選一個 hotspot。');pushHistory(id);const list=getHotspots(id),h=list[state.selectedHotspot];h.en=$('#hotspotEn').value.trim()||h.en;h.zh=$('#hotspotZh').value.trim()||h.zh;setHotspots(id,list);renderImagePane();selectHotspot(state.selectedHotspot);}
function deleteSelected(id){if(state.selectedHotspot===null)return;pushHistory(id);const list=getHotspots(id);list.splice(state.selectedHotspot,1);setHotspots(id,list);state.selectedHotspot=null;renderImagePane();}
function undoHotspot(id){let item;while(state.history.length&&(item=state.history.pop()).id!==id){}if(!item)return;setHotspots(id,item.list);state.selectedHotspot=null;renderImagePane();}
function downloadHotspots(){const merged=JSON.parse(JSON.stringify(hotspotData));lessons.forEach(l=>{const saved=localStorage.getItem(hotspotStorageKey(l.id));if(saved)merged.lessons[String(l.id)]=JSON.parse(saved);});const blob=new Blob([JSON.stringify(merged,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='hotspots.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function showTranslation(h,btn){const t=$('#translation'),stage=$('#hotspotStage'),br=btn.getBoundingClientRect(),sr=stage.getBoundingClientRect();t.textContent=h.zh;t.style.left=Math.max(7,Math.min(93,(br.left+br.width/2-sr.left)/sr.width*100))+'%';t.style.top=Math.max(4,(br.top-sr.top)/sr.height*100)+'%';t.classList.add('show');clearTimeout(showTranslation.timer);showTranslation.timer=setTimeout(()=>t.classList.remove('show'),1600);}

function buildQuiz(l){const c=l.content;if(!c||!c.vocabulary||c.vocabulary.length<3){$('#quizPane').innerHTML='<div class="empty">本課測驗資料尚未匯入。</div>';return;}const q=c.vocabulary[0],opts=[q[1],c.vocabulary[1][1],c.vocabulary[2][1]].sort(()=>Math.random()-.5);$('#quizPane').innerHTML=`<h3>「${esc(q[0])}」的中文是什麼？</h3><div class="quiz-options">${opts.map(o=>`<button onclick="selectAnswer(this,${JSON.stringify(q[1])})">${esc(o)}</button>`).join('')}</div><p id="quizResult" class="result"></p>`;}
function selectAnswer(btn,correct){const r=$('#quizResult');if(btn.textContent===correct){r.textContent='答對了。';r.className='result good';}else{r.textContent='再想一次。正確答案：'+correct;r.className='result bad';}}
function showTab(name){document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.tabpane').forEach(p=>p.classList.remove('active'));$('#'+name+'Pane').classList.add('active');}
async function init(){try{[lessons,hotspotData]=await Promise.all([fetch('./lessons.json').then(checkJson),fetch('./hotspots.json').then(checkJson)]);const cats=['全部',...new Set(lessons.map(l=>l.category))];$('#category').innerHTML=cats.map(c=>`<option>${esc(c)}</option>`).join('');render();}catch(err){console.error(err);$('#grid').innerHTML='<div class="empty">教材載入失敗，請重新整理頁面。</div>';}}
function checkJson(r){if(!r.ok)throw new Error(`${r.url}: ${r.status}`);return r.json();}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('#closeBtn').onclick=()=>{$('#modal').classList.remove('open');window.speechSynthesis?.cancel();};
$('#prevBtn').onclick=()=>openLesson(Math.max(1,state.current-1));$('#nextBtn').onclick=()=>openLesson(Math.min(100,state.current+1));$('#markDone').onclick=()=>toggleDone(state.current);
$('#search').oninput=e=>{state.query=e.target.value;render();};$('#favOnly').onclick=()=>{state.favOnly=!state.favOnly;$('#favOnly').textContent=state.favOnly?'顯示全部':'只看收藏';render();};
$('#themeBtn').onclick=()=>{document.body.classList.toggle('dark');state.dark=document.body.classList.contains('dark');localStorage.setItem('em_theme',state.dark?'dark':'light');$('#themeBtn').textContent=state.dark?'淺色':'深色';};$('#category').onchange=e=>{state.category=e.target.value;render();};
init();
