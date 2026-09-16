let DATA={blocks:[],commonPersianWords:[]};
let state=JSON.parse(localStorage.getItem("peripheralStudy")||'{"review":{},"reviews":0,"score":0,"hard":0}');
let cardIndex=0, qScore=0, qCurrent=null, tCurrent=null;

fetch("data.json").then(r=>r.json()).then(d=>{DATA=d;init();}).catch(e=>alert("data.json پیدا نشد. فایل را به صورت کامل از ZIP خارج کنید."));

function init(){
  document.getElementById("mTotal").textContent=DATA.learningCount;
  document.getElementById("mTranslated").textContent=DATA.blocks.filter(x=>x.english).length;
  renderLines(); renderFlash(); newQuestion(); newTyping(); renderStats();
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>openView(b.dataset.view));
}
function save(){localStorage.setItem("peripheralStudy",JSON.stringify(state)); renderStats();}
function openView(id){
 document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
 document.getElementById(id).classList.add("active");
 document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===id));
 const titles={dashboard:"آزمایشگاه یادگیری",lines:"تمام دیالوگ‌ها",flashcards:"فلش‌کارت و بازیابی",quiz:"آزمون هوشمند",typing:"تولید جمله",stats:"آمار و مرور"};
 document.getElementById("pageTitle").textContent=titles[id]||"یادگیری";
}
function usable(){return DATA.blocks.filter(x=>!x.isPromo)}
function reviewed(id){return state.review[id]&&state.review[id].n>0}
function mark(id,rating){
 state.review[id]=state.review[id]||{n:0,rating:0,last:0};
 state.review[id].n++; state.review[id].rating=rating; state.review[id].last=Date.now();
 state.reviews++; if(rating===1)state.hard++;
 save();
}
function renderStats(){
 let u=usable(), done=u.filter(x=>reviewed(x.id)).length;
 let pct=Math.round(done/Math.max(1,u.length)*100);
 document.getElementById("progressPct").textContent=pct+"%";
 document.getElementById("progressText").textContent=`${done} از ${u.length} جمله مرور شده`;
 document.getElementById("mReviews").textContent=state.reviews;
 document.getElementById("sToday").textContent=state.reviews;
 document.getElementById("sHard").textContent=state.hard;
 document.getElementById("sMastery").textContent=Math.min(100,Math.round((Object.values(state.review).reduce((a,x)=>a+x.rating,0)/(Math.max(1,Object.keys(state.review).length)*3))*100))+"%";
 const wc=document.getElementById("wordCloud"); wc.innerHTML="";
 DATA.commonPersianWords.slice(0,45).forEach(x=>{let s=document.createElement("span");s.textContent=x.word+" ×"+x.count;wc.appendChild(s)});
}
function renderLines(){
 const list=document.getElementById("lineList");
 const search=document.getElementById("search"), filter=document.getElementById("filter");
 function draw(){
  let q=(search.value||"").toLowerCase(), f=filter.value;
  let arr=DATA.blocks.filter(x=>!x.isPromo && ((!q)||(x.fa+" "+x.english).toLowerCase().includes(q)));
  if(f==="translated")arr=arr.filter(x=>x.english);
  if(f==="pending")arr=arr.filter(x=>!x.english);
  if(f==="reviewed")arr=arr.filter(x=>reviewed(x.id));
  list.innerHTML=arr.map(x=>`<div class="line">
   <div class="num">#${x.id}<br><small>${x.start.slice(0,5)}</small></div>
   <div><div class="fa">${escapeHtml(x.fa)}</div><div class="en ${x.english?"":"pending"}">${x.english?escapeHtml(x.english):"ترجمه آفلاین برای این خط در دیتاست نیست — جمله را از روی زیرنویس تمرین کن."}</div></div>
   <div class="line-tools"><button class="mini" onclick="speakText(${JSON.stringify(x.fa)})">🔊</button><button class="mini" onclick="mark(${x.id},3)">✓</button><button class="mini" onclick="mark(${x.id},1)">سخت</button></div>
  </div>`).join("");
 }
 search.oninput=draw; filter.onchange=draw; draw();
}
function renderFlash(){
 let arr=usable().filter(x=>x.english);
 if(!arr.length)return;
 if(cardIndex>=arr.length)cardIndex=0;
 let x=arr[cardIndex];
 document.getElementById("fcCount").textContent=`${cardIndex+1} / ${arr.length}`;
 document.getElementById("fcNum").textContent="#"+x.id;
 document.getElementById("fcTime").textContent=x.start.slice(0,8);
 document.getElementById("fcFa").textContent=x.fa;
 document.getElementById("fcEn").textContent=x.english;
 document.getElementById("fcEn").classList.add("hidden");
 document.getElementById("revealBtn").classList.remove("hidden");
 document.getElementById("fcActions").classList.add("hidden");
}
function revealCard(){document.getElementById("fcEn").classList.remove("hidden");document.getElementById("revealBtn").classList.add("hidden");document.getElementById("fcActions").classList.remove("hidden")}
function nextCard(){cardIndex++;renderFlash()} function prevCard(){cardIndex--;if(cardIndex<0)cardIndex=0;renderFlash()}
function rateCard(r){let arr=usable().filter(x=>x.english);mark(arr[cardIndex].id,r);nextCard()}
function speakCurrent(){let arr=usable().filter(x=>x.english);speakText(arr[cardIndex].english)}
function speakText(t){if(!("speechSynthesis" in window)){alert("Speech Synthesis در این مرورگر فعال نیست.");return}let u=new SpeechSynthesisUtterance(t);u.lang="en-US";u.rate=.86;window.speechSynthesis.cancel();window.speechSynthesis.speak(u)}
function newQuestion(){
 let arr=usable().filter(x=>x.english); if(arr.length<4)return;
 qCurrent=arr[Math.floor(Math.random()*arr.length)];
 document.getElementById("qFa").textContent=qCurrent.fa;
 let opts=[qCurrent]; while(opts.length<4){let x=arr[Math.floor(Math.random()*arr.length)];if(!opts.includes(x))opts.push(x)}
 opts.sort(()=>Math.random()-.5);
 document.getElementById("qOptions").innerHTML=opts.map(x=>`<button class="option" onclick="answerQ(this,${x.id})">${escapeHtml(x.english)}</button>`).join("");
 document.getElementById("qFeedback").innerHTML="";
 document.getElementById("qScore").textContent="امتیاز: "+qScore;
}
function answerQ(btn,id){
 document.querySelectorAll(".option").forEach(b=>b.disabled=true);
 if(id===qCurrent.id){btn.classList.add("correct");qScore++;mark(id,3);document.getElementById("qFeedback").innerHTML='<div class="feedback good">درست! مغزت ارتباط «معنی ← جمله» را بازیابی کرد.</div>'}
 else{btn.classList.add("wrong");mark(qCurrent.id,1);document.getElementById("qFeedback").innerHTML=`<div class="feedback badf">جواب درست: <b dir="ltr">${escapeHtml(qCurrent.english)}</b></div>`}
 document.getElementById("qScore").textContent="امتیاز: "+qScore;
}
function newTyping(){
 let arr=usable().filter(x=>x.english); tCurrent=arr[Math.floor(Math.random()*arr.length)];
 document.getElementById("tFa").textContent=tCurrent.fa;document.getElementById("answer").value="";document.getElementById("typingFeedback").innerHTML="";
}
function similarity(a,b){
 const A=a.toLowerCase().replace(/[.,!?'"“”]/g,"").split(/\s+/).filter(Boolean), B=b.toLowerCase().replace(/[.,!?'"“”]/g,"").split(/\s+/).filter(Boolean);
 let set=new Set(B), hit=A.filter(x=>set.has(x)).length; return Math.round(hit/Math.max(A.length,B.length)*100);
}
function checkTyping(){
 let val=document.getElementById("answer").value.trim(), s=similarity(val,tCurrent.english);
 if(s>=70){mark(tCurrent.id,3);document.getElementById("typingFeedback").innerHTML=`<div class="feedback good">عالی — شباهت واژگانی ${s}% است. حالا جمله را با صدای بلند بگو.</div>`}
 else{mark(tCurrent.id,1);document.getElementById("typingFeedback").innerHTML=`<div class="feedback badf">شباهت ${s}% است. دوباره تلاش کن؛ لازم نیست کلمه‌به‌کلمه یکسان باشد.</div>`}
}
function showTypingAnswer(){document.getElementById("typingFeedback").innerHTML=`<div class="feedback">پاسخ نمونه: <b dir="ltr">${escapeHtml(tCurrent.english)}</b></div>`}
function startSmartSession(){openView("flashcards");cardIndex=0;renderFlash()}
function randomLine(){let arr=usable();let x=arr[Math.floor(Math.random()*arr.length)];openView("lines");document.getElementById("search").value=x.fa;document.getElementById("search").dispatchEvent(new Event("input"))}
document.getElementById("focusBtn").onclick=()=>document.body.classList.toggle("focus");
document.getElementById("resetBtn").onclick=()=>{if(confirm("تمام پیشرفت محلی پاک شود؟")){state={review:{},reviews:0,score:0,hard:0};save();location.reload()}};
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
