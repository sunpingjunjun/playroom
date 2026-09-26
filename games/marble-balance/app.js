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

  const state = {
    running: false,
    finished: false,
    startedAt: 0,
    elapsed: 0,
    tiltX: 0,
    tiltY: 0,
    targetX: 0,
    targetY: 0,
    centerBeta: 0,
    centerGamma: 0,
    calibrationSamples: [],
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
    const specs = [
      [.18,.18,.03,.46], [.18,.64,.32,.03], [.35,.30,.03,.34],
      [.35,.30,.29,.03], [.62,.30,.03,.43], [.62,.73,.21,.03],
      [.80,.18,.03,.34], [.47,.50,.17,.03]
    ];
    state.walls = specs.map(([x,y,ww,hh]) => ({
      x: board.x + board.w*x, y: board.y + board.h*y,
      w: Math.max(board.w*ww,t), h: Math.max(board.h*hh,t)
    }));
    const point = (x,y) => ({ x: board.x+board.w*x, y: board.y+board.h*y });
    state.holes = [[.27,.39],[.52,.78],[.72,.42]].map(([x,y]) => ({...point(x,y), r:u*.34}));
    state.goal = {...point(.91,.86), r:u*.43};
    state.ball.r = Math.max(11, u*.27);
    reset(false);
  }

  function reset(hideResult = true) {
    const b = state.board;
    state.ball.x = b.x + b.w*.08;
    state.ball.y = b.y + b.h*.10;
    state.ball.vx = state.ball.vy = 0;
    state.finished = false;
    state.startedAt = performance.now();
    state.elapsed = 0;
    statusText.textContent = 'ゴールをめざそう';
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
    resultTime.textContent = won ? `${state.elapsed.toFixed(1)}秒でクリア` : 'ゆっくり傾けてみよう';
    if (navigator.vibrate) navigator.vibrate(won ? [35,40,70] : 80);
    setTimeout(() => { result.hidden = false; }, 350);
  }

  function update(dt, now) {
    if (!state.running || state.finished) return;
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

  function onOrientation(event) {
    if (event.gamma==null || event.beta==null) return;
    // Use the first few readings as the neutral, flat position. This also
    // compensates for a case or table that is not perfectly level.
    if (state.calibrationSamples.length < 12) {
      state.calibrationSamples.push([event.beta, event.gamma]);
      state.centerBeta = state.calibrationSamples.reduce((sum, v) => sum + v[0], 0) / state.calibrationSamples.length;
      state.centerGamma = state.calibrationSamples.reduce((sum, v) => sum + v[1], 0) / state.calibrationSamples.length;
      state.targetX = state.targetY = 0;
      return;
    }
    const angle=(screen.orientation && screen.orientation.angle) || window.orientation || 0;
    const deadzone = value => Math.abs(value) < .7 ? 0 : value - Math.sign(value) * .7;
    // About 12 degrees now reaches full acceleration; a 1–2 degree tilt is
    // enough to start the marble moving from a flat position.
    let x=deadzone(event.gamma-state.centerGamma)/12;
    let y=deadzone(event.beta-state.centerBeta)/12;
    if (angle===90) [x,y]=[y,-x];
    else if (angle===-90 || angle===270) [x,y]=[-y,x];
    else if (angle===180) {x=-x;y=-y;}
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
      state.centerBeta = state.centerGamma = 0;
      window.addEventListener('deviceorientation',onOrientation,true);
      permissionNote.textContent='平らな状態を基準にしています…';
    } else {
      touchPad.classList.add('visible');
      permissionNote.textContent='画面の方向ボタンで操作できます';
    }
    panel.classList.add('hidden');
    state.running=true; reset();
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
  window.addEventListener('resize',resize);
  window.addEventListener('orientationchange',()=>setTimeout(resize,150));
  resize();requestAnimationFrame(frame);
})();
