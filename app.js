import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { QUESTION_BANK } from "./questions.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ROUND_COUNT = 3;
const QUESTIONS_PER_ROUND = 5;
const QUESTION_MS = 15000;
const REVEAL_MS = 2200;

const state = {
  lang: localStorage.getItem("trivia_lang") || "en",
  room: null,
  userId: sessionStorage.getItem("trivia_uid") || crypto.randomUUID(),
  isHost: false,
  roomData: null,
  selectedCategory: "general",
  selectedDifficulty: "mixed",
  timer: null,
  resolving: false
};
sessionStorage.setItem("trivia_uid", state.userId);

const $ = s => document.querySelector(s);
const screens = ["home","setup","lobby","game","roundResult","final"].map(id => $("#"+id));

const I18N = {
  en:{
    eyebrow:"FRIEND VS FRIEND",heroTitle:"Think fast. Beat your friend.",heroSub:"Create a private room, share the code, and battle across three quick trivia rounds.",
    nameLabel:"Your name",create:"Create Challenge",or:"OR",join:"Join",gameSetup:"GAME SETUP",chooseGame:"Choose your battle",
    category:"Category",difficulty:"Difficulty",rounds:"Rounds",questions:"Questions",timer:"Timer",scoring:"Scoring",speedBonus:"Speed bonus",
    createRoom:"Create Room",back:"Back",privateRoom:"PRIVATE ROOM",sendCode:"Send this code to your friend",tapCopy:"Tap the code to copy it",
    startBattle:"Start Battle ⚔️",leave:"Leave",roundComplete:"ROUND COMPLETE",nextRound:"Next Round",matchComplete:"MATCH COMPLETE",
    rematch:"Rematch 🔥",leaveRoom:"Leave Room",waiting:"Waiting for your opponent...",ready:"Both players are ready 🔥",
    answerLocked:"Answer locked 🔒",choose:"Choose your answer",nextQuestion:"Next question...",copied:"Room code copied",
    roomNotFound:"Room not found.",roomFull:"This room is already full.",needName:"Enter your name first.",needCode:"Enter your name and room code.",
    youWin:"You win!",friendWins:"wins!",draw:"It's a draw!",roundWin:"wins the round!",roundDraw:"Round draw!",
    round:"ROUND",question:"QUESTION",wins:"round wins",hostStarts:"Waiting for host to start…",
    general:"General",science:"Science",geography:"Geography",sports:"Sports",entertainment:"Entertainment",technology:"Technology",
    easy:"Easy",medium:"Medium",hard:"Hard",mixed:"Mixed",bestOf:"Best of 3","fiveRound":"5 / round","seconds":"15 sec",
    firebaseMissing:"Add your Firebase settings in firebase-config.js first."
  },
  ar:{
    eyebrow:"صديق ضد صديق",heroTitle:"فكّر بسرعة. واهزم صاحبك.",heroSub:"أنشئ غرفة خاصة، أرسل الكود لصديقك، وتنافسوا في ثلاث جولات سريعة.",
    nameLabel:"اسمك",create:"إنشاء تحدّي",or:"أو",join:"دخول",gameSetup:"إعداد اللعبة",chooseGame:"اختر التحدّي",
    category:"الفئة",difficulty:"الصعوبة",rounds:"الجولات",questions:"الأسئلة",timer:"الوقت",scoring:"النقاط",speedBonus:"نقاط إضافية للسرعة",
    createRoom:"إنشاء الغرفة",back:"رجوع",privateRoom:"غرفة خاصة",sendCode:"أرسل هذا الكود لصديقك",tapCopy:"اضغط على الكود لنسخه",
    startBattle:"ابدأ التحدّي ⚔️",leave:"مغادرة",roundComplete:"انتهت الجولة",nextRound:"الجولة التالية",matchComplete:"انتهت المباراة",
    rematch:"إعادة التحدّي 🔥",leaveRoom:"مغادرة الغرفة",waiting:"بانتظار صديقك...",ready:"اللاعبان جاهزان 🔥",
    answerLocked:"تم تثبيت الإجابة 🔒",choose:"اختر إجابتك",nextQuestion:"السؤال التالي...",copied:"تم نسخ كود الغرفة",
    roomNotFound:"الغرفة غير موجودة.",roomFull:"الغرفة ممتلئة.",needName:"اكتب اسمك أولاً.",needCode:"اكتب اسمك وكود الغرفة.",
    youWin:"فزت!",friendWins:"فاز!",draw:"تعادل!",roundWin:"فاز بالجولة!",roundDraw:"تعادل في الجولة!",
    round:"الجولة",question:"السؤال",wins:"جولات فوز",hostStarts:"بانتظار صاحب الغرفة لبدء اللعبة…",
    general:"عام",science:"علوم",geography:"جغرافيا",sports:"رياضة",entertainment:"ترفيه",technology:"تقنية",
    easy:"سهل",medium:"متوسط",hard:"صعب",mixed:"متنوع",bestOf:"الأفضل من 3","fiveRound":"5 / جولة","seconds":"15 ثانية",
    firebaseMissing:"أضف بيانات Firebase داخل firebase-config.js أولاً."
  }
};

const t = key => I18N[state.lang][key] ?? key;
const escapeHTML = s => String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function screen(id){
  screens.forEach(x => x.classList.add("hidden"));
  $("#"+id).classList.remove("hidden");
}
function showToast(msg){
  const el=$("#toast"); el.textContent=msg; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),1600);
}
function setLang(lang){
  state.lang=lang; localStorage.setItem("trivia_lang",lang);
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  $("#langBtn").textContent=lang==="en"?"العربية":"English";
  document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));
  renderCategoryChips(); renderDifficultyChips();
  if(state.roomData) render();
}
setLang(state.lang);

function firebaseConfigured(){
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("PASTE_");
}
function uidRoomCode(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function availableQuestions(category,diff){
  let pool=QUESTION_BANK.filter(q=>q.cat===category && (diff==="mixed" || q.diff===diff));
  if(pool.length<QUESTIONS_PER_ROUND*ROUND_COUNT){
    const extras=QUESTION_BANK.filter(q=>q.cat===category && !pool.some(p=>p.id===q.id));
    pool=[...pool,...extras];
  }
  if(pool.length<QUESTIONS_PER_ROUND*ROUND_COUNT){
    const extras=QUESTION_BANK.filter(q=>!pool.some(p=>p.id===q.id));
    pool=[...pool,...extras];
  }
  return shuffle(pool).slice(0,QUESTIONS_PER_ROUND*ROUND_COUNT).map(q=>q.id);
}
function findQ(id){return QUESTION_BANK.find(q=>q.id===id)}
function pointsForAnswer(correct,answeredAt,deadline){
  if(!correct) return 0;
  const left=Math.max(0,deadline-answeredAt);
  const speed=Math.floor((left/QUESTION_MS)*500);
  return 1000+speed;
}
function playerCards(data){
  const entries=Object.entries(data.players||{});
  return entries.map(([id,p])=>`
    <div class="player-card">
      <div class="player-name">${escapeHTML(p.name)}${id===data.host?" 👑":""}</div>
      <div class="big-score">${p.score||0}</div>
      <div class="round-wins">${p.roundWins||0} ${t("wins")}</div>
    </div>`).join("");
}
function settingsPills(data){
  return `<span class="pill">${t(data.category)}</span><span class="pill">${t(data.difficulty)}</span><span class="pill">${t("bestOf")}</span>`;
}

const categories=["general","science","geography","sports","entertainment","technology"];
const difficulties=["mixed","easy","medium","hard"];

function renderCategoryChips(){
  $("#categoryChips").innerHTML=categories.map(c=>`<button class="chip ${state.selectedCategory===c?"active":""}" data-cat="${c}">${t(c)}</button>`).join("");
  document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{state.selectedCategory=b.dataset.cat;renderCategoryChips()});
}
function renderDifficultyChips(){
  $("#difficultyChips").innerHTML=difficulties.map(d=>`<button class="chip ${state.selectedDifficulty===d?"active":""}" data-diff="${d}">${t(d)}</button>`).join("");
  document.querySelectorAll("[data-diff]").forEach(b=>b.onclick=()=>{state.selectedDifficulty=b.dataset.diff;renderDifficultyChips()});
}
renderCategoryChips(); renderDifficultyChips();

$("#langBtn").onclick=()=>setLang(state.lang==="en"?"ar":"en");
$("#createBtn").onclick=()=>{
  $("#homeError").textContent="";
  if(!$("#nameInput").value.trim()){ $("#homeError").textContent=t("needName"); return; }
  if(!firebaseConfigured()){ $("#homeError").textContent=t("firebaseMissing"); return; }
  screen("setup");
};
$("#backHomeBtn").onclick=()=>screen("home");
$("#confirmSetupBtn").onclick=createRoom;
$("#joinBtn").onclick=joinRoom;
$("#startBtn").onclick=startMatch;
$("#nextRoundBtn").onclick=startNextRound;
$("#rematchBtn").onclick=rematch;
$("#copyCodeBtn").onclick=async()=>{ await navigator.clipboard.writeText(state.room); showToast(t("copied")); };
$("#leaveLobbyBtn").onclick=leaveRoom;
$("#leaveFinalBtn").onclick=leaveRoom;

async function createRoom(){
  const name=$("#nameInput").value.trim();
  state.room=uidRoomCode(); state.isHost=true;
  await set(ref(db,`rooms/${state.room}`),{
    host:state.userId,status:"lobby",category:state.selectedCategory,difficulty:state.selectedDifficulty,
    round:0,questionIndex:0,players:{[state.userId]:{name,score:0,roundScore:0,roundWins:0,streak:0}}
  });
  await onDisconnect(ref(db,`rooms/${state.room}/players/${state.userId}`)).remove();
  subscribeRoom();
}
async function joinRoom(){
  $("#homeError").textContent="";
  const name=$("#nameInput").value.trim(), code=$("#roomInput").value.trim().toUpperCase();
  if(!name||!code){ $("#homeError").textContent=t("needCode"); return; }
  if(!firebaseConfigured()){ $("#homeError").textContent=t("firebaseMissing"); return; }
  const snap=await get(ref(db,`rooms/${code}`));
  if(!snap.exists()){ $("#homeError").textContent=t("roomNotFound"); return; }
  const data=snap.val(), players=Object.keys(data.players||{});
  if(players.length>=2 && !players.includes(state.userId)){ $("#homeError").textContent=t("roomFull"); return; }
  state.room=code; state.isHost=data.host===state.userId;
  await update(ref(db,`rooms/${code}/players/${state.userId}`),{name,score:0,roundScore:0,roundWins:0,streak:0});
  await onDisconnect(ref(db,`rooms/${code}/players/${state.userId}`)).remove();
  subscribeRoom();
}
function subscribeRoom(){
  $("#roomInput").value=state.room;
  onValue(ref(db,`rooms/${state.room}`),snap=>{
    if(!snap.exists()){ screen("home"); return; }
    state.roomData=snap.val(); state.isHost=state.roomData.host===state.userId; render();
  });
}
function render(){
  const d=state.roomData;
  if(d.status==="lobby") renderLobby(d);
  if(d.status==="playing"||d.status==="reveal") renderGame(d);
  if(d.status==="roundResult") renderRoundResult(d);
  if(d.status==="finished") renderFinal(d);
}
function renderLobby(d){
  screen("lobby"); $("#roomCode").textContent=state.room; $("#lobbyPlayers").innerHTML=playerCards(d); $("#lobbySettings").innerHTML=settingsPills(d);
  const full=Object.keys(d.players||{}).length===2;
  $("#waitingText").textContent=full?t("ready"):t("waiting");
  $("#startBtn").classList.toggle("hidden",!(state.isHost&&full));
}
async function startMatch(){
  if(!state.isHost) return;
  const d=(await get(ref(db,`rooms/${state.room}`))).val();
  const qids=availableQuestions(d.category,d.difficulty);
  const up={status:"playing",round:0,questionIndex:0,questionIds:qids,answers:null,deadline:Date.now()+QUESTION_MS};
  Object.keys(d.players).forEach(id=>{up[`players/${id}/score`]=0;up[`players/${id}/roundScore`]=0;up[`players/${id}/roundWins`]=0;up[`players/${id}/streak`]=0});
  await update(ref(db,`rooms/${state.room}`),up);
}
function renderGame(d){
  screen("game");
  $("#roundLabel").textContent=`${t("round")} ${d.round+1} / ${ROUND_COUNT}`;
  $("#questionLabel").textContent=`${t("question")} ${(d.questionIndex%QUESTIONS_PER_ROUND)+1} / ${QUESTIONS_PER_ROUND}`;
  $("#gamePlayers").innerHTML=playerCards(d);
  const me=d.players?.[state.userId], streak=me?.streak||0;
  $("#streakBadge").textContent=`🔥 ${streak}`; $("#streakBadge").classList.toggle("hidden",streak<2);
  const qid=d.questionIds[d.questionIndex], q=findQ(qid), text=q[state.lang];
  $("#questionText").textContent=text.q;
  const myAnswer=d.answers?.[state.userId]?.choice;
  $("#answers").innerHTML="";
  text.a.forEach((ans,i)=>{
    const b=document.createElement("button"); b.className="answer"; b.textContent=`${String.fromCharCode(65+i)}. ${ans}`;
    if(myAnswer===i) b.classList.add("selected");
    if(d.status==="reveal"){
      b.disabled=true;
      if(i===q.c) b.classList.add("correct");
      if(myAnswer===i&&i!==q.c) b.classList.add("wrong");
    }
    b.onclick=()=>submitAnswer(i);
    $("#answers").appendChild(b);
  });
  $("#gameStatus").textContent=d.status==="reveal"?t("nextQuestion"):(myAnswer!==undefined?t("answerLocked"):t("choose"));
  startTimer(d);
  if(state.isHost && d.status==="playing") maybeResolve();
}
async function submitAnswer(choice){
  const d=state.roomData;
  if(d.status!=="playing"||d.answers?.[state.userId]) return;
  await set(ref(db,`rooms/${state.room}/answers/${state.userId}`),{choice,answeredAt:Date.now()});
}
function startTimer(d){
  clearInterval(state.timer);
  const tick=()=>{
    if(d.status==="reveal"){ $("#timerBar").style.width="0%"; return; }
    const left=Math.max(0,d.deadline-Date.now());
    $("#timerBar").style.width=`${left/QUESTION_MS*100}%`;
    if(left<=0 && state.isHost){ clearInterval(state.timer); maybeResolve(); }
  };
  tick(); state.timer=setInterval(tick,100);
}
async function maybeResolve(){
  if(state.resolving) return;
  const snap=await get(ref(db,`rooms/${state.room}`)); if(!snap.exists()) return;
  const d=snap.val(); if(d.status!=="playing") return;
  const playerCount=Object.keys(d.players||{}).length, answerCount=Object.keys(d.answers||{}).length;
  if(answerCount<playerCount && Date.now()<d.deadline) return;
  state.resolving=true;
  try{ await resolveQuestion(d); } finally {state.resolving=false}
}
async function resolveQuestion(d){
  const q=findQ(d.questionIds[d.questionIndex]);
  const up={status:"reveal"};
  for(const [id,p] of Object.entries(d.players)){
    const ans=d.answers?.[id]; const correct=ans?.choice===q.c;
    const pts=ans?pointsForAnswer(correct,ans.answeredAt,d.deadline):0;
    up[`players/${id}/score`]=(p.score||0)+pts;
    up[`players/${id}/roundScore`]=(p.roundScore||0)+pts;
    up[`players/${id}/streak`]=correct?(p.streak||0)+1:0;
  }
  await update(ref(db,`rooms/${state.room}`),up);
  setTimeout(advanceAfterReveal,REVEAL_MS);
}
async function advanceAfterReveal(){
  if(!state.isHost) return;
  const snap=await get(ref(db,`rooms/${state.room}`)); if(!snap.exists()) return;
  const d=snap.val(); if(d.status!=="reveal") return;
  const pos=(d.questionIndex%QUESTIONS_PER_ROUND)+1;
  if(pos>=QUESTIONS_PER_ROUND){ await finishRound(d); return; }
  await update(ref(db,`rooms/${state.room}`),{status:"playing",questionIndex:d.questionIndex+1,answers:null,deadline:Date.now()+QUESTION_MS});
}
async function finishRound(d){
  const entries=Object.entries(d.players), max=Math.max(...entries.map(([,p])=>p.roundScore||0));
  const winners=entries.filter(([,p])=>(p.roundScore||0)===max).map(([id])=>id);
  const up={status:"roundResult",roundWinners:winners};
  if(winners.length===1) up[`players/${winners[0]}/roundWins`]=(d.players[winners[0]].roundWins||0)+1;
  await update(ref(db,`rooms/${state.room}`),up);
}
function renderRoundResult(d){
  clearInterval(state.timer); screen("roundResult"); $("#roundPlayers").innerHTML=playerCards(d);
  const winners=d.roundWinners||[];
  if(winners.length!==1) $("#roundWinnerText").textContent=t("roundDraw");
  else $("#roundWinnerText").textContent=`${d.players[winners[0]].name} ${t("roundWin")}`;
  $("#nextRoundBtn").classList.toggle("hidden",!state.isHost);
  if(state.isHost){
    const wins=Object.values(d.players).map(p=>p.roundWins||0);
    if(Math.max(...wins)>=2 || d.round>=ROUND_COUNT-1) finishMatchIfNeeded(d);
  }
}
async function finishMatchIfNeeded(d){
  const maxWins=Math.max(...Object.values(d.players).map(p=>p.roundWins||0));
  if(maxWins>=2 || d.round>=ROUND_COUNT-1){
    await update(ref(db,`rooms/${state.room}`),{status:"finished"}); return true;
  }
  return false;
}
async function startNextRound(){
  if(!state.isHost) return;
  const d=(await get(ref(db,`rooms/${state.room}`))).val();
  if(await finishMatchIfNeeded(d)) return;
  const up={status:"playing",round:d.round+1,questionIndex:d.questionIndex+1,answers:null,roundWinners:null,deadline:Date.now()+QUESTION_MS};
  Object.keys(d.players).forEach(id=>{up[`players/${id}/roundScore`]=0;up[`players/${id}/streak`]=0});
  await update(ref(db,`rooms/${state.room}`),up);
}
function renderFinal(d){
  clearInterval(state.timer); screen("final"); $("#finalPlayers").innerHTML=playerCards(d);
  const entries=Object.entries(d.players), maxWins=Math.max(...entries.map(([,p])=>p.roundWins||0));
  const winners=entries.filter(([,p])=>(p.roundWins||0)===maxWins);
  if(winners.length!==1){ $("#winnerText").textContent=t("draw"); $("#winnerSub").textContent=""; }
  else{
    const [wid,wp]=winners[0];
    $("#winnerText").textContent=wid===state.userId?t("youWin"):`${wp.name} ${t("friendWins")}`;
    $("#winnerSub").textContent=`${wp.roundWins} - ${Math.min(...entries.map(([,p])=>p.roundWins||0))}`;
  }
  $("#rematchBtn").classList.toggle("hidden",!state.isHost);
}
async function rematch(){
  if(!state.isHost) return;
  const d=(await get(ref(db,`rooms/${state.room}`))).val();
  const up={status:"lobby",round:0,questionIndex:0,questionIds:null,answers:null,roundWinners:null,deadline:null};
  Object.keys(d.players).forEach(id=>{up[`players/${id}/score`]=0;up[`players/${id}/roundScore`]=0;up[`players/${id}/roundWins`]=0;up[`players/${id}/streak`]=0});
  await update(ref(db,`rooms/${state.room}`),up);
}
async function leaveRoom(){
  clearInterval(state.timer);
  if(state.room){
    try{
      if(state.isHost) await remove(ref(db,`rooms/${state.room}`));
      else await remove(ref(db,`rooms/${state.room}/players/${state.userId}`));
    }catch{}
  }
  state.room=null; state.roomData=null; state.isHost=false;
  screen("home");
}
