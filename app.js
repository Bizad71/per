
const stateKey="peripheral-immersion-v2";
let DATA, state=JSON.parse(localStorage.getItem(stateKey)||'{"mastery":{},"correct":0,"attempts":0,"streak":0,"lastDay":""}');
let mode="words", index=0, meaning=false, quizIndex=0, quizAnswered=false;

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function save(){localStorage.setItem(stateKey,JSON.stringify(state)); updateStats();}
function toast(t){let x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1600)}
function mastery(id){return state.mastery[id]||0}
function bump(id,delta){state.mastery[id]=Math.max(0,Math.min(5,(state.mastery[id]||0)+delta));save()}
function updateStats(){
  const vals=Object.values(state.mastery), m=vals.filter(x=>x>=4).length;
  $("#mastered").textContent=m; $("#streak").textContent=state.streak||0;
  $("#accuracy").textContent=state.attempts?Math.round(state.correct/state.attempts*100)+"%":"0%";
}
function go(id){
  $$(".screen").forEach(s=>s.classList.toggle("active",s.id===id));
  $$(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.go===id));
  if(id==="words")renderWords(); if(id==="phrases")renderPhrases(); if(id==="sentences")renderSentences(); if(id==="review")renderReview(); if(id==="quiz")startQuiz(); if(id==="settings")renderSettings();
  window.scrollTo({top:0,behavior:"smooth"});
}
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
$("#soundToggle").onclick=()=>toast("English audio uses your device's built-in voice.");

function speak(text){
  if(!text || !("speechSynthesis" in window)){toast("Speech is not available here.");return}
  speechSynthesis.cancel(); let u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=.88;speechSynthesis.speak(u);
}
function startLearning(){
  mode="words"; index=0; renderLesson(); go("learn");
}
$("#nextBtn").onclick=()=>{if(mode==="words" && index>=DATA.words.length-1){mode="sentences";index=0}else if(mode==="sentences" && index>=DATA.sentences.length-1){mode="words";index=0}else index++;renderLesson()}
$("#prevBtn").onclick=()=>{if(index>0)index--;renderLesson()}
$$('[data-go="learn"]').forEach(x=>x.addEventListener("click",startLearning));

function renderLesson(){
  const total=mode==="words"?DATA.words.length:DATA.sentences.length;
  const x=(mode==="words"?DATA.words:DATA.sentences)[index];
  $("#progressBar").style.width=((index+1)/total*100)+"%";
  $("#learnTitle").textContent=mode==="words"?"Words first":"Now: sentences";
  if(mode==="words"){
    const id="w:"+x.word.toLowerCase();
    $("#lesson").innerHTML=`<div class="lesson-card">
      <div class="lesson-type">STEP 1 · VOCABULARY · ${index+1}/${total}</div>
      <div class="bigword">${esc(x.word)}</div>
      <div class="phonetic">${esc(x.pos||"")}</div>
      <div class="meaning hidden-meaning" id="lessonMeaning" title="Tap to reveal">${esc(x.fa||"Meaning not included in the source build")}</div>
      <div class="hint">${esc(x.example||"Build your own sentence after learning this word.")}</div>
      <div class="item-actions"><button class="tiny" onclick="document.querySelector('#lessonMeaning').classList.remove('hidden-meaning')">Reveal meaning</button><button class="tiny" onclick="speak(${JSON.stringify(x.word)})">🔊 Listen</button><button class="tiny" onclick="bump(${JSON.stringify(id)},1);toast('Saved as learned')">+ Learned</button></div>
    </div>`;
  }else{
    const id="s:"+x.id;
    $("#lesson").innerHTML=`<div class="lesson-card">
      <div class="lesson-type">STEP 3 · SENTENCE · ${index+1}/${total}</div>
      <div class="quiz-q">${esc(x.en)}</div>
      <div class="item-actions"><button class="tiny" onclick="speak(${JSON.stringify(x.en)})">🔊 Listen</button><button class="tiny" onclick="document.querySelector('#lessonMeaning').classList.toggle('hidden-meaning')">Toggle Persian</button></div>
      <div class="meaning ${meaning?'':'hidden-meaning'}" id="lessonMeaning">${esc(x.fa)}</div>
      <div class="hint">Try to say it from memory before revealing the meaning.</div>
      <div class="item-actions"><button class="tiny" onclick="bump(${JSON.stringify(id)},1);toast('Good — remembered')">I knew it</button><button class="tiny" onclick="bump(${JSON.stringify(id)},-1);toast('Queued for review')">Need review</button></div>
    </div>`;
  }
}
function renderWords(){
 let q=($("#wordSearch").value||"").toLowerCase(), f=$("#wordFilter").value;
 let a=DATA.words.filter(x=>!q||x.word.toLowerCase().includes(q));
 if(f==="learned")a=a.filter(x=>mastery("w:"+x.word.toLowerCase())>0);if(f==="new")a=a.filter(x=>mastery("w:"+x.word.toLowerCase())===0);
 $("#wordList").innerHTML=a.slice(0,120).map(x=>`<div class="item">
 <div class="item-top"><b>${esc(x.word)}</b><span class="tag">${mastery("w:"+x.word.toLowerCase())>=4?"MASTERED":"LEARN"}</span></div>
 <p>${esc(x.example||"")}</p><div class="fa">${esc(x.fa||"Meaning unavailable in this source build")}</div>
 <div class="item-actions"><button class="tiny" onclick="this.closest('.item').classList.toggle('show-fa')">Meaning</button><button class="tiny" onclick="speak(${JSON.stringify(x.word)})">🔊</button><button class="tiny" onclick="bump('w:${esc(x.word.toLowerCase())}',1);renderWords()">✓</button></div></div>`).join("")||`<div class="item">No matching words.</div>`;
}
$("#wordSearch").oninput=renderWords;$("#wordFilter").onchange=renderWords;

function renderPhrases(){
 const phrases=DATA.words.filter(x=>x.pos==="phrase"||x.word.includes(" "));
 $("#phraseList").innerHTML=phrases.map(x=>`<div class="item"><div class="item-top"><b>${esc(x.word)}</b><span class="tag">CHUNK</span></div><p>${esc(x.example)}</p><div class="fa">${esc(x.fa)}</div><div class="item-actions"><button class="tiny" onclick="this.closest('.item').classList.toggle('show-fa')">Meaning</button><button class="tiny" onclick="speak(${JSON.stringify(x.word)})">🔊</button></div></div>`).join("")||`<div class="item">More phrases appear as English source dialogue is added.</div>`;
}
function renderSentences(){
 $("#sentenceList").innerHTML=DATA.sentences.map(x=>`<div class="item ${meaning?'show-fa':''}">
 <div class="item-top"><b>${esc(x.en)}</b><span class="tag">${x.start.slice(0,5)}</span></div><div class="fa">${esc(x.fa)}</div>
 <div class="item-actions"><button class="tiny" onclick="this.closest('.item').classList.toggle('show-fa')">Meaning</button><button class="tiny" onclick="speak(${JSON.stringify(x.en)})">🔊</button><button class="tiny" onclick="bump('s:${x.id}',1);toast('Marked familiar')">✓</button></div></div>`).join("");
}
$("#meaningToggle").onclick=()=>{meaning=!meaning;$("#meaningToggle").classList.toggle("on",meaning);renderSentences()};

function startQuiz(){
 quizIndex=0;quizAnswered=false;renderQuiz();
}
function renderQuiz(){
 const pool=DATA.sentences; if(!pool.length){$("#quizBox").innerHTML="<p>No English source sentences are available yet.</p>";return}
 const x=pool[quizIndex%pool.length]; const others=[...pool].filter(y=>y.id!==x.id).sort(()=>Math.random()-.5).slice(0,3);let opts=[x,...others].sort(()=>Math.random()-.5);
 $("#quizBox").innerHTML=`<div class="lesson-type">RECALL · ${quizIndex+1}</div>
 <div class="quiz-q">What does this sentence mean?</div><div class="item" style="margin-bottom:12px"><b>${esc(x.en)}</b><button class="tiny" style="float:right" onclick="speak(${JSON.stringify(x.en)})">🔊</button></div>
 <div class="choices">${opts.map(o=>`<button class="choice" data-id="${o.id}">${esc(o.fa)}</button>`).join("")}</div>
 <div class="quiz-feedback" id="feedback"></div><button class="primary" id="quizNext">Next</button>`;
 $$(".choice").forEach(c=>c.onclick=()=>answer(c,x));
 $("#quizNext").onclick=()=>{quizIndex++;renderQuiz()}
}
function answer(c,x){
 if(quizAnswered)return;quizAnswered=true;state.attempts++;
 if(Number(c.dataset.id)===Number(x.id)){state.correct++;c.classList.add("correct");bump("s:"+x.id,1);$("#feedback").textContent="Correct. Keep going."}
 else{c.classList.add("wrong");bump("s:"+x.id,-1);$("#feedback").textContent="Not this time. The correct meaning is shown by the green option.";$$(".choice").find(z=>Number(z.dataset.id)===Number(x.id))?.classList.add("correct")}
 save();
}
function renderReview(){
 const all=[];
 DATA.words.forEach(x=>{let m=mastery("w:"+x.word.toLowerCase());if(m<3)all.push({type:"Word",title:x.word,sub:x.fa||"Meaning not available"})});
 DATA.sentences.forEach(x=>{let m=mastery("s:"+x.id);if(m<3)all.push({type:"Sentence",title:x.en,sub:x.fa})});
 $("#reviewList").innerHTML=all.slice(0,80).map(x=>`<div class="item"><span class="tag">${x.type}</span><p><b>${esc(x.title)}</b></p><div class="fa" style="display:block">${esc(x.sub)}</div></div>`).join("")||`<div class="item">Your review queue is empty. Nice work.</div>`;
}
function renderSettings(){
 $("#coverage").textContent=`${DATA.meta.englishReadyCount} learning translations are ready from ${DATA.meta.subtitleCount} usable subtitle lines. The remaining lines stay in the dataset and are not fabricated.`;
}
$("#resetProgress").onclick=()=>{if(confirm("Reset all learning progress?")){state={mastery:{},correct:0,attempts:0,streak:0,lastDay:""};save();toast("Progress reset")}}
$("#exportBtn").onclick=()=>{let blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="peripheral-progress.json";a.click();URL.revokeObjectURL(a.href)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function init(){DATA=await fetch("data.json").then(r=>r.json());$("#coverage").textContent=`${DATA.meta.englishReadyCount} / ${DATA.meta.subtitleCount} subtitle lines have English learning translations.`;updateStats();renderLesson();go("home")}
init();
