const settings = {
  easy: { speed: 720, swaps: 5, label: "EASY" },
  normal: { speed: 500, swaps: 8, label: "NORMAL" },
  hard: { speed: 330, swaps: 12, label: "HARD" },
};

const cups = [...document.querySelectorAll(".cup-slot")];
const levelButtons = [...document.querySelectorAll("[data-level]")];
const startButton = document.querySelector("#startButton");
const soundButton = document.querySelector("#soundButton");
const ball = document.querySelector("#ball");
const arena = document.querySelector("#arena");
const instruction = document.querySelector("#instruction");
const result = document.querySelector("#result");
const roundLabel = document.querySelector("#roundLabel");
const difficultyLabel = document.querySelector("#difficultyLabel");
const scoreEl = document.querySelector("#score");
const streakEl = document.querySelector("#streak");
const bestEl = document.querySelector("#best");

let level = "normal";
let ballCup = 0;
let score = 0;
let streak = 0;
let best = Number(localStorage.getItem("vision-cups-best") || 0);
let round = 0;
let state = "ready";
let soundOn = true;

bestEl.textContent = best;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setBallPosition(index, instant = false) {
  if (instant) ball.classList.add("instant-position");
  ball.style.setProperty("--ball-x", `${(index + 0.5) * (100 / 3)}%`);
  if (instant) {
    void ball.offsetWidth;
    ball.classList.remove("instant-position");
  }
}

function tone(frequency, duration = 80, type = "sine", volume = .035) {
  if (!soundOn) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration / 1000);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration / 1000);
  oscillator.onended = () => context.close();
}

function randomOtherIndex(index) {
  const options = [0, 1, 2].filter((value) => value !== index);
  return options[Math.floor(Math.random() * options.length)];
}

function clearCupStates() {
  cups.forEach((cup) => cup.classList.remove("selectable", "correct", "wrong", "has-ball"));
  arena.classList.remove("reveal");
  ball.classList.remove("visible");
}

async function startRound() {
  if (state === "showing" || state === "shuffling") return;
  state = "showing";
  round += 1;
  clearCupStates();
  result.textContent = "";
  result.className = "result";
  startButton.disabled = true;
  levelButtons.forEach((button) => { button.disabled = true; });
  roundLabel.textContent = `ROUND ${String(round).padStart(2, "0")}`;
  ballCup = Math.floor(Math.random() * 3);
  setBallPosition(ballCup, true);
  cups[ballCup].classList.add("has-ball");
  arena.classList.add("reveal");
  ball.classList.add("visible");
  instruction.textContent = "球の場所を覚えて！";
  tone(620, 130);
  await wait(1450);

  arena.classList.remove("reveal");
  ball.classList.remove("visible");
  cups[ballCup].classList.remove("has-ball");
  instruction.textContent = "カップを目で追って…";
  state = "shuffling";
  await wait(480);

  const { speed, swaps } = settings[level];
  let lastPair = "";
  for (let i = 0; i < swaps; i += 1) {
    let a = Math.floor(Math.random() * 3);
    let b = randomOtherIndex(a);
    let pair = [a, b].sort().join("");
    if (pair === lastPair && Math.random() > .25) {
      a = (a + 1) % 3;
      b = randomOtherIndex(a);
      pair = [a, b].sort().join("");
    }
    lastPair = pair;
    await swapCups(a, b, speed);
    if (ballCup === a) ballCup = b;
    else if (ballCup === b) ballCup = a;
  }

  // 回答前に、非表示のまま球を正解位置へ移す。
  // これにより回答後の表示時に横移動が見えることを防ぐ。
  setBallPosition(ballCup, true);

  state = "answering";
  instruction.textContent = "球はどこ？ カップをタップ！";
  cups.forEach((cup) => cup.classList.add("selectable"));
  if (navigator.vibrate) navigator.vibrate(35);
  tone(880, 95);
}

async function swapCups(a, b, duration) {
  const first = cups[a];
  const second = cups[b];
  const distance = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
  const arc = Math.max(22, Math.abs(distance) * .16);
  const easing = "cubic-bezier(.55, 0, .45, 1)";
  first.style.zIndex = "4";
  second.style.zIndex = "3";
  first.style.transition = `transform ${duration}ms ${easing}`;
  second.style.transition = `transform ${duration}ms ${easing}`;
  first.style.transform = `translate(${distance}px, -${arc}px)`;
  second.style.transform = `translate(${-distance}px, ${arc * .32}px)`;
  tone(260 + a * 45, 45, "triangle", .018);
  await wait(duration);
  first.style.transition = "none";
  second.style.transition = "none";
  first.style.transform = "";
  second.style.transform = "";
  first.style.zIndex = "";
  second.style.zIndex = "";
  const marker = document.createComment("swap");
  first.before(marker);
  second.before(first);
  marker.replaceWith(second);
  cups[a] = second;
  cups[b] = first;
  await wait(55);
}

async function answer(event) {
  if (state !== "answering") return;
  state = "result";
  cups.forEach((cup) => cup.classList.remove("selectable"));
  const selected = cups.indexOf(event.currentTarget);
  const correct = selected === ballCup;
  cups[ballCup].classList.add("has-ball", "correct");
  arena.classList.add("reveal");
  ball.classList.add("visible");

  if (correct) {
    score += 100 + streak * 10;
    streak += 1;
    best = Math.max(best, streak);
    localStorage.setItem("vision-cups-best", best);
    result.textContent = "CORRECT!  正解";
    result.className = "result good";
    instruction.textContent = "ナイス！しっかり追えています";
    tone(660, 120); setTimeout(() => tone(990, 180), 110);
    if (navigator.vibrate) navigator.vibrate(45);
  } else {
    streak = 0;
    event.currentTarget.classList.add("wrong");
    result.textContent = "MISS  惜しい！";
    result.className = "result bad";
    instruction.textContent = "球はここでした";
    tone(180, 260, "sawtooth", .025);
    if (navigator.vibrate) navigator.vibrate([70, 40, 70]);
  }
  scoreEl.textContent = score;
  streakEl.textContent = streak;
  bestEl.textContent = best;
  startButton.textContent = "NEXT ROUND";
  startButton.disabled = false;
  levelButtons.forEach((button) => { button.disabled = false; });
}

levelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (state === "showing" || state === "shuffling") return;
    level = button.dataset.level;
    levelButtons.forEach((item) => item.classList.toggle("active", item === button));
    difficultyLabel.textContent = settings[level].label;
    tone(420, 55);
  });
});

cups.forEach((cup) => cup.addEventListener("click", answer));
startButton.addEventListener("click", startRound);
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  soundButton.textContent = soundOn ? "♪" : "×";
  soundButton.setAttribute("aria-label", soundOn ? "効果音をオフにする" : "効果音をオンにする");
  if (soundOn) tone(600, 70);
});
