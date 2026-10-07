/* =========================================================
   YOUR IMAGES
   ---------------------------------------------------------
   Put your own image paths here.
   Example: Q: "images/quas.png"
   Leave "" until you add the image.
   ========================================================= */
const IMAGES = {
  Q: "assets/img/Quas.png",
  W: "assets/img/Wex.png",
  E: "assets/img/Exort.png",
  INVOKE: "assets/img/Invoke.png"
};

/* =========================================================
   ALL 10 INVOKER SPELLS
   ---------------------------------------------------------
   img = your own spell image path.
   ========================================================= */
const SPELLS = [
  { n:"Cold Snap",       c:"QQQ", img:"assets/img/Coldsnap.png" },
  { n:"Ghost Walk",       c:"QQW", img:"assets/img/Ghost_walk.png" },
  { n:"Ice Wall",         c:"QQE", img:"assets/img/Ice_wall.png" },

  { n:"EMP",              c:"WWW", img:"assets/img/E_M_P.png" },
  { n:"Tornado",          c:"QWW", img:"assets/img/Tornado.png" },
  { n:"Alacrity",         c:"WWE", img:"assets/img/Alacrity.png" },

  { n:"Sun Strike",       c:"EEE", img:"assets/img/Sunstrike.png" },
  { n:"Forge Spirit",     c:"EEQ", img:"../assets/img/ForgeSpirit.png" },
  { n:"Chaos Meteor",     c:"EEW", img:"assets/img/Choas_meteor.png" },

  { n:"Deafening Blast",  c:"QWE", img:"assets/img/Blast.png" }
];

/* =========================================================
   THE 10 FAMILIAR COMBOS YOU PROVIDED
   ---------------------------------------------------------
   These are used as the preferred source when building the
   growing multi-spell challenges.
   ========================================================= */
const FAMILIAR_COMBOS = [
  ["Cold Snap", "Forge Spirit", "Alacrity"],
  ["Tornado", "EMP"],
  ["Tornado", "Chaos Meteor", "Deafening Blast", "Sun Strike"],
  ["Ice Wall", "Cold Snap", "Forge Spirit"],
  ["Ghost Walk", "Sun Strike"],
  ["Alacrity", "Forge Spirit", "Chaos Meteor"],
  ["Tornado", "EMP", "Chaos Meteor", "Deafening Blast"],
  ["Cold Snap", "Chaos Meteor", "Sun Strike"],
  ["Tornado", "Ice Wall", "Forge Spirit"],
  ["Deafening Blast", "Chaos Meteor", "Alacrity"]
];

const $ = id => document.getElementById(id);
const slotEls = [...document.querySelectorAll(".slot")];
let phase = "idle";
let score = 0;
let casts = 0;
let orbs = [];
let challenge = [];
let completed = new Set();
let challengeNumber = 0;
let limit = 8;
let t0 = 0;
let raf = 0;

const BASE_PER_SPELL = 8;
const MIN_PER_SPELL = 2;
const DECAY = .94;

function safe(text){
  return String(text).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}

function key(s){
  return s.split("").sort().join("");
}

function findSpell(name){
  return SPELLS.find(s => s.n === name);
}

/* Returns how many spells the next challenge should require. */
function requiredSpellCount(s){
  if(s < 1600) return 1;
  if(s < 2600) return 2;
  if(s < 3600) return 3;
  if(s < 4600) return 4;
  if(s < 5600) return 5;
  if(s < 6600) return 6;
  if(s < 7600) return 7;
  if(s < 8600) return 8;
  if(s < 9600) return 9;
  return 10;
}

function orbMarkup(o, cls="orb-mini"){
  const src = IMAGES[o];
  return src
    ? `<img class="${cls}" src="${src}" alt="${safe(o)}">`
    : `<span class="orb-placeholder">${safe(o)}</span>`;
}

function spellMarkup(spell, className="spell-img"){
  return spell.img
    ? `<img class="${className}" src="${spell.img}" alt="${safe(spell.n)}">`
    : `<span class="book-placeholder">IMAGE</span>`;
}

function setOptionalImage(containerId, src, alt, cls=""){
  const el = $(containerId);
  if(!src){
    el.innerHTML = `<span class="placeholder ${cls}">IMAGE</span>`;
    return;
  }
  el.innerHTML = `<img src="${src}" alt="${safe(alt)}" class="${cls}">`;
}

/* Set Q/W/E/Invoke visuals. */
setOptionalImage("qOrb", IMAGES.Q, "Quas", "orb-visual");
setOptionalImage("wOrb", IMAGES.W, "Wex", "orb-visual");
setOptionalImage("eOrb", IMAGES.E, "Exort", "orb-visual");
setOptionalImage("invokeImg", IMAGES.INVOKE, "Invoke", "invoke-visual");


function renderSpellBook(){
  $("book").innerHTML = SPELLS.map(spell => `
    <div>
      ${spellMarkup(spell)}
      ${[...spell.c].map(o => orbMarkup(o)).join("")}
      <b>${safe(spell.n)}</b>
    </div>
  `).join("");

  $("familiarBook").innerHTML = FAMILIAR_COMBOS.map((combo,i) => `
    <div class="familiar">
      <strong>${i+1}. ${combo.map(safe).join(" + ")}</strong><br>
      <span>${combo.map(name => {
        const sp = findSpell(name);
        return `${safe(name)} (${sp ? sp.c : ""})`;
      }).join(" → ")}</span>
    </div>
  `).join("");
}
renderSpellBook();

$("qm").addEventListener("click", () => {
  renderScoreBoard();
  $("help").classList.remove("hide");
});
$("close").addEventListener("click", () => $("help").classList.add("hide"));
$("help").addEventListener("click", ev => {
  if(ev.target === $("help")) $("help").classList.add("hide");
});

/*
  Build a challenge with N UNIQUE spells.
  We first use one of your familiar combos, then fill any
  remaining slots from the full 10-spell Invoker pool.
*/
function buildChallenge(count){
  const result = [];
  const used = new Set();

  const familiar = FAMILIAR_COMBOS[Math.floor(Math.random()*FAMILIAR_COMBOS.length)];
  const shuffledFamiliar = [...familiar].sort(() => Math.random() - .5);

  for(const name of shuffledFamiliar){
    if(result.length >= count) break;
    const spell = findSpell(name);
    if(spell && !used.has(spell.n)){
      result.push(spell);
      used.add(spell.n);
    }
  }

  const rest = [...SPELLS].sort(() => Math.random() - .5);
  for(const spell of rest){
    if(result.length >= count) break;
    if(!used.has(spell.n)){
      result.push(spell);
      used.add(spell.n);
    }
  }

  return result;
}

function renderChallenge(){
  $("comboTargets").innerHTML = challenge.map((spell,index) => `
    <div class="targetSpell ${completed.has(index) ? "done" : ""}" data-index="${index}">
      ${spell.img ? `<img src="${spell.img}" alt="${safe(spell.n)}">` : `<div class="placeholder">IMAGE</div>`}
      <b>${safe(spell.n)}</b>
    </div>
  `).join("");

  const doneCount = completed.size;
  $("progress").textContent = `${doneCount} / ${challenge.length} cast`;
  $("spellHeader").textContent =
    challenge.length === 1 ? "1 SPELL" : `${challenge.length} SPELLS`;
}

function start(){
  score = 0;
  casts = 0;
  challengeNumber = 0;
  phase = "play";
  orbs = [];
  challenge = [];
  completed = new Set();

  document.body.classList.remove("err");
  $("over").classList.add("hide");
  $("pauseOverlay").classList.add("hide");
  $("msg").textContent = "";
  draw();
  nextChallenge();
  renderScoreBoard();
}

function nextChallenge(){
  const count = requiredSpellCount(score);
  challenge = buildChallenge(count);
  completed = new Set();
  challengeNumber++;

  /* More spells = more total time. Repeated challenges become faster. */
  limit = Math.max(
    MIN_PER_SPELL * count,
    BASE_PER_SPELL * count * Math.pow(DECAY, challengeNumber - 1)
  );

  renderChallenge();
  $("msg").textContent = count === 1
    ? "Remember its Q/W/E combination, then Invoke."
    : `Remember the combinations and cast all ${count} skills in any order.`;

  t0 = performance.now();
  cancelAnimationFrame(raf);
  tick();
}

function tick(){
  if(phase !== "play") return;

  const left = limit - (performance.now() - t0) / 1000;
  $("fill").style.transform = `scaleX(${Math.max(0,left/limit)})`;

  if(left <= 0){
    fail("Time's up!");
    return;
  }

  raf = requestAnimationFrame(tick);
}

function addOrb(o){
  if(phase !== "play") return;
  orbs.push(o);
  if(orbs.length > 3) orbs.shift();
  draw();
}

function draw(){
  slotEls.forEach((slot,i) => {
    const o = orbs[i];
    slot.className = "slot" + (o ? " f" : "");
    slot.innerHTML = o && IMAGES[o]
      ? `<img src="${IMAGES[o]}" alt="${safe(o)}">`
      : "";
  });
}

function cast(){
  if(phase !== "play") return;

  if(orbs.length < 3){
    $("msg").textContent = "Pick 3 orbs first.";
    return;
  }

  const combo = key(orbs.join(""));
  const targetIndex = challenge.findIndex((spell,index) =>
    !completed.has(index) && key(spell.c) === combo
  );

  if(targetIndex === -1){
    fail("Wrong combo! Cast one of the remaining spells.");
    return;
  }

  const left = limit - (performance.now() - t0) / 1000;
  score += 100 + Math.round(left * 10);
  casts++;
  completed.add(targetIndex);
  orbs = [];
  draw();
  renderChallenge();

  if(completed.size === challenge.length){
    $("msg").textContent = "Combo complete! Next challenge...";
    setTimeout(nextChallenge, 350);
  }else{
    $("msg").textContent = `${completed.size}/${challenge.length} complete — cast any remaining spell.`;
  }
}

function fail(text){
  if(phase !== "play") return;
  phase = "dying";
  cancelAnimationFrame(raf);
  $("msg").textContent = text;
  document.body.classList.add("err");

  const f = $("flash");
  f.classList.remove("on");
  void f.offsetWidth;
  f.classList.add("on");

  const t = $("target");
  t.classList.remove("shake");
  void t.offsetWidth;
  t.classList.add("shake");

  setTimeout(end,800);
}

function getScores(){
  try{
    const saved = JSON.parse(localStorage.getItem("invokerScores") || "[]");
    return Array.isArray(saved) ? saved : [];
  }catch(e){
    return [];
  }
}

function saveLeaderboardEntry(name, value){
  const cleanName = (name || "Anonymous").trim().slice(0,20) || "Anonymous";
  const scores = getScores();
  scores.push({name: cleanName, score: Number(value) || 0, date: Date.now()});
  scores.sort((a,b) => b.score - a.score);
  const top = scores.slice(0,10);
  try{
    localStorage.setItem("invokerScores", JSON.stringify(top));
  }catch(e){}
  return top;
}

function renderScoreBoard(){
  const scores = getScores();
  const rows = list => list.map((entry,i) => `
    <div class="scoreRow">
      <span class="scoreRank">#${i+1}</span>
      <span class="scoreName">${safe(entry.name)}</span>
      <span class="scoreValue">${Number(entry.score).toLocaleString()}</span>
    </div>`).join("");
  const empty = '<div class="emptyScores">No scores yet.</div>';

  $("scoreBoard").innerHTML = scores.length ? rows(scores) : empty;
  $("overBoard").innerHTML = '<h3>Top Scores</h3>' + (scores.length ? rows(scores.slice(0,5)) : empty);
}

function end(){
  phase = "over";
  $("oTitle").textContent = "Game over";
  $("oText").textContent = `You scored ${score.toLocaleString()} with ${casts} successful casts.`;
  $("playerName").value = "";
  $("saveScore").disabled = false;
  $("start").textContent = "Play Again";
  $("playerName").classList.remove("hide");
  $("nameHint").classList.remove("hide");
  $("saveScore").classList.remove("hide");
  $("nameHint").textContent = "Your score will be saved to the local score board.";
  $("over").classList.remove("hide");
  renderScoreBoard();
}

let pausedRemaining = 0;

function pauseGame(){
  if(phase !== "play") return;
  pausedRemaining = Math.max(0, limit - (performance.now() - t0) / 1000);
  phase = "paused";
  cancelAnimationFrame(raf);
  $("pauseOverlay").classList.remove("hide");
}

function resumeGame(){
  if(phase !== "paused") return;
  phase = "play";
  t0 = performance.now() - (limit - pausedRemaining) * 1000;
  $("pauseOverlay").classList.add("hide");
  tick();
}

function saveCurrentScore(){
  const name = $("playerName").value.trim();
  saveLeaderboardEntry(name, score);
  renderScoreBoard();
  $("saveScore").disabled = true;
  $("nameHint").textContent = "Score saved. Open ? to view the full score board.";
}

[["q","Q"],["w","W"],["e","E"]].forEach(([id,o]) => {
  $(id).addEventListener("pointerdown",ev => {
    ev.preventDefault();
    addOrb(o);
  });
});

$("cast").addEventListener("pointerdown",ev => {
  ev.preventDefault();
  cast();
});

$("pauseBtn").addEventListener("click",pauseGame);
$("resumeBtn").addEventListener("click",resumeGame);
$("saveScore").addEventListener("click",saveCurrentScore);

$("start").addEventListener("click",start);

addEventListener("keydown",ev => {
  if(ev.target.tagName === "INPUT") return;
  if(ev.repeat) return;
  const k = ev.key.toUpperCase();

  if(k === "ESCAPE"){
    ev.preventDefault();

    if(!$("help").classList.contains("hide")){
      $("help").classList.add("hide");
      return;
    }

    if(phase === "play") pauseGame();
    else if(phase === "paused") resumeGame();
    return;
  }

  if(phase === "paused") return;

  if(k === "Q" || k === "W" || k === "E") addOrb(k);
  else if(k === "R") cast();
  else if((k === "ENTER" || k === " ") && (phase === "idle" || phase === "over")){
    ev.preventDefault();
    start();
  }
});

renderScoreBoard();
