(() => {
  'use strict';

  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const statusText = document.querySelector('#statusText');
  const statusIcon = document.querySelector('#statusIcon');
  const timer = document.querySelector('#timer');
  const panel = document.querySelector('#startPanel');
  const startButton = document.querySelector('#startButton');
  const permissionNote = document.querySelector('#permissionNote');
  const touchPad = document.querySelector('#touchPad');
  const result = document.querySelector('#result');
  const resultTitle = document.querySelector('#resultTitle');
  const resultKicker = document.querySelector('#resultKicker');
  const resultTime = document.querySelector('#resultTime');
  const nextButton = document.querySelector('#nextButton');
  const levelButton = document.querySelector('#levelButton');
  const levelNumber = document.querySelector('#levelNumber');
  const levelPanel = document.querySelector('#levelPanel');
  const levelGrid = document.querySelector('#levelGrid');
  const closeLevels = document.querySelector('#closeLevels');

  const LEVELS = [
    { name:'はじめの一歩', start:[.08,.10], goal:[.91,.86], walls:[[.20,.18,.03,.50],[.20,.68,.34,.03],[.50,.34,.03,.37],[.50,.34,.28,.03],[.76,.34,.03,.40]], holes:[[.35,.43]] },
    { name:'ジグザグ', start:[.08,.88], goal:[.92,.12], walls:[[.18,.18,.03,.62],[.18,.18,.28,.03],[.43,.18,.03,.58],[.43,.73,.29,.03],[.70,.25,.03,.51]], holes:[[.30,.48],[.57,.47]] },
    { name:'ふたつの門', start:[.08,.10], goal:[.92,.88], walls:[[.22,.00,.03,.42],[.22,.58,.03,.42],[.47,.18,.03,.64],[.72,.00,.03,.42],[.72,.58,.03,.42]], holes:[[.35,.28],[.60,.72],[.84,.32]] },
    { name:'クロスロード', start:[.09,.88], goal:[.91,.12], walls:[[.16,.48,.30,.03],[.54,.48,.30,.03],[.48,.12,.03,.29],[.48,.59,.03,.29],[.24,.22,.03,.18],[.73,.60,.03,.18]], holes:[[.33,.35],[.67,.65],[.50,.50]] },
    { name:'うずまき', start:[.08,.10], goal:[.50,.51], walls:[[.15,.18,.70,.03],[.82,.18,.03,.64],[.27,.79,.58,.03],[.27,.35,.03,.47],[.27,.35,.40,.03],[.64,.35,.03,.29],[.42,.61,.25,.03]], holes:[[.18,.66],[.72,.68],[.52,.46]] },
    { name:'スラローム', start:[.08,.50], goal:[.92,.50], walls:[[.18,.00,.03,.62],[.34,.38,.03,.62],[.50,.00,.03,.62],[.66,.38,.03,.62],[.82,.00,.03,.62]], holes:[[.27,.78],[.43,.22],[.59,.78],[.75,.22]] },
    { name:'ほそみち', start:[.08,.10], goal:[.92,.88], walls:[[.16,.20,.60,.03],[.16,.20,.03,.55],[.16,.72,.63,.03],[.76,.38,.03,.37],[.34,.38,.45,.03],[.34,.38,.03,.20],[.34,.55,.27,.03]], holes:[[.25,.47],[.48,.47],[.68,.63],[.86,.50]] },
    { name:'とりで', start:[.08,.88], goal:[.50,.50], walls:[[.18,.18,.64,.03],[.18,.79,.64,.03],[.18,.18,.03,.22],[.18,.58,.03,.24],[.79,.18,.03,.25],[.79,.58,.03,.24],[.34,.34,.32,.03],[.34,.64,.32,.03],[.34,.34,.03,.12],[.34,.55,.03,.12],[.63,.34,.03,.12],[.63,.55,.03,.12]], holes:[[.26,.30],[.74,.30],[.26,.70],[.74,.70]] },
    { name:'あなの森', start:[.08,.10], goal:[.92,.88], walls:[[.18,.30,.22,.03],[.18,.30,.03,.30],[.36,.57,.25,.03],[.58,.18,.03,.42],[.58,.18,.24,.03],[.78,.42,.03,.40]], holes:[[.25,.18],[.32,.46],[.48,.28],[.49,.72],[.68,.50],[.88,.32]] },
    { name:'ファイナル', start:[.08,.90], goal:[.92,.10], walls:[[.14,.14,.03,.62],[.14,.14,.25,.03],[.36,.14,.03,.45],[.36,.56,.25,.03],[.58,.32,.03,.27],[.58,.32,.27,.03],[.82,.32,.03,.52],[.31,.78,.54,.03]], holes:[[.25,.30],[.27,.68],[.47,.42],[.49,.88],[.70,.46],[.72,.68],[.91,.50]] }
  ];

  const savedUnlocked = Number(localStorage.getItem('marbleUnlocked') || 1);
  let bestTimes = {};
  try { bestTimes = JSON.parse(localStorage.getItem('marbleBestTimes') || '{}'); } catch {}

  const state = {
    running: false,
    finished: false,
    startedAt: 0,
    elapsed: 0,
    tiltX: 0,
    tiltY: 0,
    targetX: 0,
    targetY: 0,
    centerTiltX: 0,
    centerTiltY: 0,
    calibrationSamples: [],
    calibrating: false,
    levelIndex: Math.max(0, Math.min(LEVELS.length - 1, savedUnlocked - 1)),
    unlocked: Math.max(1, Math.min(LEVELS.length, savedUnlocked)),
    paused: false,
    lastFrame: performance.now(),
    board: null,
    walls: [],
    holes: [],
    goal: null,
    ball: { x: 0, y: 0, vx: 0, vy: 0, r: 15 }
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildLevel();
  }

  function buildLevel() {
    const w = innerWidth;
    const h = innerHeight;
    const top = Math.max(82, h * 0.12);
    const margin = Math.max(18, Math.min(w, h) * 0.035);
    const board = { x: margin, y: top, w: w - margin * 2, h: h - top - margin };
    state.board = board;
    const u = Math.min(board.w, board.h) / 10;
    const t = Math.max(11, u * .22);
    const level = LEVELS[state.levelIndex];
    const specs = level.walls;
    state.walls = specs.map(([x,y,ww,hh]) => ({
      x: board.x + board.w*x, y: board.y + board.h*y,
      w: Math.max(board.w*ww,t), h: Math.max(board.h*hh,t)
    }));
    const point = (x,y) => ({ x: board.x+board.w*x, y: board.y+board.h*y });
    state.holes = level.holes.map(([x,y]) => ({...point(x,y), r:u*.34}));
    state.goal = {...point(...level.goal), r:u*.43};
    state.ball.r = Math.max(11, u*.27);
    levelNumber.textContent = state.levelIndex + 1;
    reset(false);
  }

  function reset(hideResult = true) {
    const b = state.board;
    const level = LEVELS[state.levelIndex];
    state.ball.x = b.x + b.w*level.start[0];
    state.ball.y = b.y + b.h*level.start[1];
    state.ball.vx = state.ball.vy = 0;
    state.finished = false;
    state.startedAt = performance.now();
    state.elapsed = 0;
    statusText.textContent = `${state.levelIndex + 1}. ${level.name}`;
    statusIcon.textContent = '◉';
    timer.textContent = '0.0秒';
    if (hideResult) result.hidden = true;
  }

  function circleHitsRect(ball, rect) {
    const nearestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
    const dx = ball.x-nearestX, dy = ball.y-nearestY;
    return dx*dx+dy*dy < ball.r*ball.r;
  }

  function resolveWall(ball, rect) {
    if (!circleHitsRect(ball, rect)) return;
    const fromLeft = Math.abs((ball.x+ball.r)-rect.x);
    const fromRight = Math.abs(ball.x-ball.r-(rect.x+rect.w));
    const fromTop = Math.abs((ball.y+ball.r)-rect.y);
    const fromBottom = Math.abs(ball.y-ball.r-(rect.y+rect.h));
    const min = Math.min(fromLeft,fromRight,fromTop,fromBottom);
    if (min===fromLeft) { ball.x=rect.x-ball.r; ball.vx=-Math.abs(ball.vx)*.3; }
    else if (min===fromRight) { ball.x=rect.x+rect.w+ball.r; ball.vx=Math.abs(ball.vx)*.3; }
    else if (min===fromTop) { ball.y=rect.y-ball.r; ball.vy=-Math.abs(ball.vy)*.3; }
    else { ball.y=rect.y+rect.h+ball.r; ball.vy=Math.abs(ball.vy)*.3; }
  }

  function finish(won) {
    state.finished = true;
    state.ball.vx = state.ball.vy = 0;
    statusText.textContent = won ? 'ゴール！' : '穴に落ちた！';
    statusIcon.textContent = won ? '★' : '↓';
    resultKicker.textContent = won ? 'CLEAR!' : 'OOPS!';
    resultTitle.textContent = won ? 'ゴール！' : '穴に落ちた！';
    if (won) {
      const key = String(state.levelIndex);
      if (!bestTimes[key] || state.elapsed < bestTimes[key]) {
        bestTimes[key] = state.elapsed;
        localStorage.setItem('marbleBestTimes', JSON.stringify(bestTimes));
      }
      state.unlocked = Math.max(state.unlocked, Math.min(LEVELS.length, state.levelIndex + 2));
      localStorage.setItem('marbleUnlocked', String(state.unlocked));
    }
    resultTime.textContent = won ? `${state.elapsed.toFixed(1)}秒でクリア` : 'ゆっくり傾けてみよう';
    nextButton.hidden = !won || state.levelIndex >= LEVELS.length - 1;
    if (won && state.levelIndex === LEVELS.length - 1) {
      resultKicker.textContent = 'ALL CLEAR!';
      resultTitle.textContent = '完全制覇！';
      resultTime.textContent = `全${LEVELS.length}ステージ クリア！`;
    }
    renderLevelGrid();
    if (navigator.vibrate) navigator.vibrate(won ? [35,40,70] : 80);
    setTimeout(() => { result.hidden = false; }, 350);
  }

  function update(dt, now) {
    if (!state.running || state.finished || state.paused) return;
    state.elapsed = (now-state.startedAt)/1000;
    timer.textContent = `${state.elapsed.toFixed(1)}秒`;
    state.tiltX += (state.targetX-state.tiltX)*.16;
    state.tiltY += (state.targetY-state.tiltY)*.16;
    const ball = state.ball;
    const accel = 780;
    ball.vx += state.tiltX*accel*dt;
    ball.vy += state.tiltY*accel*dt;
    const damping = Math.pow(.985,dt*60);
    ball.vx *= damping; ball.vy *= damping;
    const maxSpeed = 620;
    const speed = Math.hypot(ball.vx,ball.vy);
    if (speed>maxSpeed) { ball.vx*=maxSpeed/speed; ball.vy*=maxSpeed/speed; }
    ball.x += ball.vx*dt; ball.y += ball.vy*dt;
    const b = state.board;
    if (ball.x-ball.r<b.x) { ball.x=b.x+ball.r; ball.vx=Math.abs(ball.vx)*.35; }
    if (ball.x+ball.r>b.x+b.w) { ball.x=b.x+b.w-ball.r; ball.vx=-Math.abs(ball.vx)*.35; }
    if (ball.y-ball.r<b.y) { ball.y=b.y+ball.r; ball.vy=Math.abs(ball.vy)*.35; }
    if (ball.y+ball.r>b.y+b.h) { ball.y=b.y+b.h-ball.r; ball.vy=-Math.abs(ball.vy)*.35; }
    state.walls.forEach(w => resolveWall(ball,w));
    for (const hole of state.holes) {
      if (Math.hypot(ball.x-hole.x,ball.y-hole.y)<hole.r*.72) return finish(false);
    }
    const g=state.goal;
    if (Math.hypot(ball.x-g.x,ball.y-g.y)<g.r*.72) finish(true);
  }

  function roundedRect(x,y,w,h,r) {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.closePath();
  }

  function draw() {
    ctx.clearRect(0,0,innerWidth,innerHeight);
    const b=state.board;
    if (!b) return;
    ctx.save();
    roundedRect(b.x,b.y,b.w,b.h,26);
    const bg=ctx.createLinearGradient(b.x,b.y,b.x+b.w,b.y+b.h);
    bg.addColorStop(0,'#102c38'); bg.addColorStop(1,'#0a1d29');
    ctx.fillStyle=bg; ctx.shadowColor='rgba(45,220,210,.22)'; ctx.shadowBlur=25; ctx.fill();
    ctx.shadowBlur=0; ctx.strokeStyle='#45bdb5'; ctx.lineWidth=4; ctx.stroke();
    ctx.setLineDash([2,18]); ctx.strokeStyle='rgba(110,220,215,.09)'; ctx.lineWidth=1;
    for(let y=b.y+18;y<b.y+b.h;y+=22){ctx.beginPath();ctx.moveTo(b.x,y);ctx.lineTo(b.x+b.w,y);ctx.stroke();}
    ctx.setLineDash([]);
    state.walls.forEach(w=>{ roundedRect(w.x,w.y,w.w,w.h,6); ctx.fillStyle='#25726f';ctx.fill();ctx.strokeStyle='#67d9cf';ctx.lineWidth=2;ctx.stroke(); });
    state.holes.forEach(h=>{ const g=ctx.createRadialGradient(h.x,h.y,2,h.x,h.y,h.r);g.addColorStop(0,'#000');g.addColorStop(.68,'#010304');g.addColorStop(.72,'#591c25');g.addColorStop(1,'#b94342');ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill(); });
    const goal=state.goal;
    ctx.save();ctx.shadowColor='#ffd65a';ctx.shadowBlur=22;ctx.beginPath();ctx.arc(goal.x,goal.y,goal.r,0,Math.PI*2);ctx.fillStyle='#e5a72b';ctx.fill();ctx.strokeStyle='#fff3b8';ctx.lineWidth=3;ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='white';ctx.font=`900 ${goal.r*1.2}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('★',goal.x,goal.y+1);ctx.restore();
    const ball=state.ball;
    ctx.save();ctx.shadowColor='#6fe8ff';ctx.shadowBlur=14;const mg=ctx.createRadialGradient(ball.x-ball.r*.3,ball.y-ball.r*.35,1,ball.x,ball.y,ball.r);mg.addColorStop(0,'white');mg.addColorStop(.15,'#d9f8ff');mg.addColorStop(.55,'#62cbe4');mg.addColorStop(1,'#167690');ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fillStyle=mg;ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=2;ctx.stroke();ctx.restore();
    ctx.restore();
  }

  function frame(now) {
    const dt=Math.min((now-state.lastFrame)/1000,.032);state.lastFrame=now;
    update(dt,now);draw();requestAnimationFrame(frame);
  }

  function screenTilt(event) {
    let x = event.gamma;
    let y = event.beta;
    const angle=(screen.orientation && screen.orientation.angle) || window.orientation || 0;
    if (angle===90) [x,y]=[y,-x];
    else if (angle===-90 || angle===270) [x,y]=[-y,x];
    else if (angle===180) { x=-x; y=-y; }
    return [x,y];
  }

  function median(values) {
    const sorted = [...values].sort((a,b) => a-b);
    return sorted[Math.floor(sorted.length/2)];
  }

  function angleDelta(value, center) {
    return ((value - center + 540) % 360) - 180;
  }

  function onOrientation(event) {
    if (event.gamma==null || event.beta==null) return;
    const [screenX, screenY] = screenTilt(event);

    // The exact screen angle held when permission is granted becomes level.
    // A short median sample rejects the initial sensor jump and hand shake.
    if (state.calibrating) {
      state.calibrationSamples.push([screenX, screenY]);
      state.targetX = state.targetY = 0;
      if (state.calibrationSamples.length >= 24) {
        state.centerTiltX = median(state.calibrationSamples.map(v => v[0]));
        state.centerTiltY = median(state.calibrationSamples.map(v => v[1]));
        state.calibrating = false;
        state.running = true;
        startButton.disabled = false;
        startButton.textContent = '傾き操作をオン';
        panel.classList.add('hidden');
        reset();
      }
      return;
    }

    const deadzone = value => Math.abs(value) < .3 ? 0 : value - Math.sign(value) * .3;
    let x=deadzone(angleDelta(screenX,state.centerTiltX))/6;
    let y=deadzone(angleDelta(screenY,state.centerTiltY))/6;
    state.targetX=Math.max(-1,Math.min(1,x));
    state.targetY=Math.max(-1,Math.min(1,y));
  }

  async function start() {
    let allowed=true;
    try {
      if (typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function') {
        allowed=(await DeviceOrientationEvent.requestPermission())==='granted';
      }
    } catch { allowed=false; }
    if (allowed && 'DeviceOrientationEvent' in window) {
      state.calibrationSamples = [];
      state.calibrating = true;
      state.running = false;
      state.targetX = state.targetY = 0;
      window.addEventListener('deviceorientation',onOrientation,true);
      startButton.disabled = true;
      startButton.textContent = 'この角度を水平に設定中…';
      permissionNote.textContent='そのまま約0.4秒間、動かさないでください';
    } else {
      touchPad.classList.add('visible');
      permissionNote.textContent='画面の方向ボタンで操作できます';
      panel.classList.add('hidden');
      state.running=true;
      reset();
    }
  }

  function renderLevelGrid() {
    levelGrid.replaceChildren();
    LEVELS.forEach((level, index) => {
      const button = document.createElement('button');
      button.className = 'stage-card' + (index === state.levelIndex ? ' current' : '');
      button.disabled = index >= state.unlocked;
      const best = bestTimes[String(index)];
      button.innerHTML = `STAGE ${index + 1}<span>${button.disabled ? '🔒' : best ? best.toFixed(1) + '秒' : level.name}</span>`;
      button.addEventListener('click', () => {
        state.levelIndex = index;
        state.paused = false;
        levelPanel.hidden = true;
        buildLevel();
      });
      levelGrid.append(button);
    });
  }

  function openLevelPanel() {
    state.paused = true;
    renderLevelGrid();
    levelPanel.hidden = false;
  }

  function closeLevelPanel() {
    levelPanel.hidden = true;
    state.paused = false;
    reset();
  }

  const dirs={up:[0,-.7],down:[0,.7],left:[-.7,0],right:[.7,0],stop:[0,0]};
  touchPad.querySelectorAll('button').forEach(btn=>{
    const set=()=>{[state.targetX,state.targetY]=dirs[btn.dataset.dir];};
    btn.addEventListener('pointerdown',set);
  });
  window.addEventListener('keydown',e=>{const m={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',' ':'stop'};if(m[e.key]){e.preventDefault();[state.targetX,state.targetY]=dirs[m[e.key]];}});
  startButton.addEventListener('click',start);
  document.querySelector('#resetButton').addEventListener('click',()=>reset());
  document.querySelector('#againButton').addEventListener('click',()=>reset());
  nextButton.addEventListener('click',()=>{
    result.hidden = true;
    if (state.levelIndex < LEVELS.length - 1) state.levelIndex += 1;
    buildLevel();
  });
  levelButton.addEventListener('click',openLevelPanel);
  closeLevels.addEventListener('click',closeLevelPanel);
  window.addEventListener('resize',resize);
  window.addEventListener('orientationchange',()=>setTimeout(resize,150));
  renderLevelGrid();
  resize();requestAnimationFrame(frame);
})();
