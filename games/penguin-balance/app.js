const $=id=>document.getElementById(id);
let mode='free',limit=5,left=[],right=[],history=[],sound=false,problem=0,solved=false,selection=null,drag=null;
const tasks={5:[[1,1],[2,1],[2,2],[3,2],[1,3]],10:[[2,3],[4,2],[3,4],[5,3],[4,5],[5,5]]};
const sum=a=>a.reduce((n,p)=>n+p.value,0);
const mascotFrames={neutral:'penguin.png',strained:'penguin-strained.png',relieved:'penguin-relieved.png'};
Object.values(mascotFrames).forEach(src=>{const img=new Image();img.src=src});
function updateMascot(l,r){
  const expression=l>0&&l===r?'relieved':Math.abs(l-r)>=2?'strained':'neutral';
  const mascot=$('mascot');
  if(mascot.dataset.expression!==expression){
    mascot.dataset.expression=expression;
    mascot.src=mascotFrames[expression];
  }
}
function speak(t){if(sound&&'speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=.8;speechSynthesis.speak(u)}}
let effects=true,audioContext=null,wasBalanced=false,celebrationTimer=0;
function unlockAudio(){if(!effects)return;try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch{}}
window.addEventListener('pointerdown',unlockAudio,{capture:true});window.addEventListener('keydown',unlockAudio,{capture:true});
function celebrate(){clearTimeout(celebrationTimer);$('game').classList.remove('celebrating');void $('game').offsetWidth;$('game').classList.add('celebrating');celebrationTimer=setTimeout(()=>$('game').classList.remove('celebrating'),1800);
if(!effects)return;unlockAudio();if(!audioContext||audioContext.state!=='running')return;
const now=audioContext.currentTime;[[523.25,0,.16],[659.25,.16,.16],[783.99,.32,.18],[1046.5,.52,.55],[659.25,.52,.55],[783.99,.52,.55]].forEach(([frequency,delay,duration])=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type='triangle';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,now+delay);gain.gain.linearRampToValueAtTime(.055,now+delay+.025);gain.gain.exponentialRampToValueAtTime(.001,now+delay+duration);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now+delay);oscillator.stop(now+delay+duration+.03);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}})}
function clearCelebration(){wasBalanced=false;clearTimeout(celebrationTimer);$('game').classList.remove('celebrating')}
function remember(){history.push({left:left.map(p=>({...p})),right:right.map(p=>({...p}))})}
function clearPick(){selection=null;document.querySelectorAll('.picked').forEach(b=>b.classList.remove('picked'))}
function move(item,target){if(mode==='quiz'&&solved||item.source==='left'&&mode==='quiz'||target==='left'&&mode==='quiz')return false;if(item.source===target)return false;const a=target==='left'?left:right;if(target!=='tray'&&(a.length>=10||sum(a)+item.value>20)){speak('いっぱいだよ');return false}if(target==='tray'&&!item.source)return false;remember();if(item.source)(item.source==='left'?left:right).splice(item.index,1);if(target!=='tray')a.push({value:item.value,duck:item.duck});clearPick();render();return true}
function piece(p,source,index){const b=document.createElement('button');b.className=(source?'piece':'number')+(p.duck?' duck':'');if(p.duck){const img=document.createElement('img');img.src='penguin.png';img.alt='';img.draggable=false;b.append(img)}else b.textContent=p.value;b.setAttribute('aria-label',p.duck?'ぺんぎん':String(p.value));b.disabled=mode==='quiz'&&(solved||source==='left');const item={...p,source,index};b.onpointerdown=e=>{if(b.disabled||e.button!==0||drag)return;e.preventDefault();clearPick();const ghost=b.cloneNode(true);ghost.disabled=false;ghost.removeAttribute('id');ghost.classList.add('ghost');ghost.setAttribute('aria-hidden','true');document.body.append(ghost);drag={item,ghost,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,button:b};b.setPointerCapture(e.pointerId);document.body.classList.add('dragging');track(e)};b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(mode==='free'&&source){move(item,'tray');return}clearPick();selection=item;b.classList.add('picked');$('hint').textContent='おさらを えらぼう'}};return b}
function targetAt(x,y){for(const id of ['left','right','tray']){const r=$(id).getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom&&!(mode==='quiz'&&id==='left'))return id}return null}
function track(e){if(!drag||e.pointerId!==drag.id)return;drag.moved ||= Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8;drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';document.querySelectorAll('.over').forEach(el=>el.classList.remove('over'));const t=targetAt(e.clientX,e.clientY);if(t)$(t).classList.add('over')}
function cancelDrag(){if(!drag)return;drag.ghost.remove();drag=null;document.body.classList.remove('dragging');document.querySelectorAll('.over').forEach(el=>el.classList.remove('over'))}
window.addEventListener('pointermove',track);window.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag,t=targetAt(e.clientX,e.clientY);cancelDrag();if(d.moved){if(t)move(d.item,t)}else if(mode==='free'&&d.item.source){move(d.item,'tray')}else{selection=d.item;d.button.classList.add('picked');$('hint').textContent='おさらを えらぼう'}});window.addEventListener('pointercancel',cancelDrag);window.addEventListener('blur',cancelDrag);window.addEventListener('keydown',e=>{if(e.key==='Escape'){cancelDrag();clearPick();$('hint').textContent='つかんで おさらに のせよう'}});
// A smooth restoring response: every added weight changes the equilibrium.
// The fixed restoring term keeps a single duck visible; total load reduces sensitivity.
function balanceAngle(l,r){return -22*(2/Math.PI)*Math.atan((l-r)/(2+.2*(l+r)))}
let scaleAngle=0,scaleVelocity=0,scaleFrame=0,scaleTime=0;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function drawScale(angle){const w=$('stage').clientWidth,h=$('stage').clientHeight;
const rad=angle*Math.PI/180,arm=w*.31,cy=h*.60;
const beam=$('beam');beam.style.width=arm*2+'px';beam.style.left=w/2-arm+'px';beam.style.top=cy-9+'px';beam.style.transform=`rotate(${angle}deg)`;
for(const [s,d] of [['left',-1],['right',1]]){$(s).style.left=w/2+d*arm*Math.cos(rad)+'px';$(s).style.top=cy+d*arm*Math.sin(rad)-$(s).offsetHeight+14+'px'}}
function positionScale(){if($('game').hidden)return;
if(reducedMotion.matches){cancelAnimationFrame(scaleFrame);scaleFrame=0;scaleVelocity=0;scaleAngle=balanceAngle(sum(left),sum(right));drawScale(scaleAngle);return}
drawScale(scaleAngle);if(!scaleFrame){scaleTime=0;scaleFrame=requestAnimationFrame(stepScale)}}
function stepScale(time){scaleFrame=0;if($('game').hidden){scaleVelocity=0;return}
const target=balanceAngle(sum(left),sum(right));
const dt=scaleTime?Math.min((time-scaleTime)/1000,.032):1/60;scaleTime=time;
// Slightly underdamped spring: one gentle settle, with a slower response under load.
const inertia=1+(sum(left)+sum(right))*.025;
scaleVelocity+=((target-scaleAngle)*70/inertia-scaleVelocity*14/Math.sqrt(inertia))*dt;
scaleAngle+=scaleVelocity*dt;
if(Math.abs(target-scaleAngle)<.015&&Math.abs(scaleVelocity)<.04){scaleAngle=target;scaleVelocity=0;drawScale(scaleAngle);return}
drawScale(scaleAngle);scaleFrame=requestAnimationFrame(stepScale)}

function render(){const l=sum(left),r=sum(right);const balanced=l>0&&l===r;updateMascot(l,r);if(balanced&&!wasBalanced)celebrate();wasBalanced=balanced;if(mode==='quiz'&&l===r&&!solved){solved=true;speak('できた！ぴったり！')}for(const s of ['left','right']){$(s+'Pieces').replaceChildren(...(s==='left'?left:right).map((p,i)=>piece(p,s,i)));$(s).setAttribute('aria-label',(s==='left'?'ひだり':'みぎ')+'の おさら');$(s).setAttribute('aria-disabled',String(solved||mode==='quiz'&&s==='left'))}palette();$('feedback').textContent=solved?'できた！ ぴったり！':l===r&&l>0?'ぴったり！':'';$('next').hidden=!solved;$('undo').disabled=!history.length||solved;$('hint').textContent='つかんで おさらに のせよう';positionScale()}
function palette(){$('numbers').replaceChildren(...Array.from({length:limit+1},(_,i)=>piece({value:i||1,duck:i===0}))) }
function start(){clearCelebration();cancelDrag();clearPick();history=[];solved=false;right=[];if(mode==='quiz'){const [a,b]=tasks[limit][problem%tasks[limit].length];left=[{value:a},{value:b}];$('prompt').textContent='おなじ おもさに しよう'}else{left=[];$('prompt').textContent='じゆうに あそぼう'}render()}
function enter(m){mode=m;problem=0;$('home').hidden=true;$('game').hidden=false;start();$('prompt').focus();speak($('prompt').textContent)}
$('free').onclick=()=>enter('free');$('quiz').onclick=()=>enter('quiz');$('back').onclick=()=>{clearCelebration();cancelDrag();clearPick();$('game').hidden=true;$('home').hidden=false;$(mode==='free'?'free':'quiz').focus()};$('limit').onchange=e=>limit=Number(e.target.value);$('reset').onclick=start;$('next').onclick=()=>{problem++;start()};$('undo').onclick=()=>{const h=history.pop();if(h){clearPick();left=h.left;right=h.right;render()}};for(const s of ['left','right','tray']){$(s).addEventListener('click',e=>{if(selection&&!e.target.closest('.piece,.number'))move(selection,s)});$(s).addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&selection&&e.target===$(s)){e.preventDefault();move(selection,s)}})}$('voice').onclick=()=>{sound=!sound;$('voice').textContent=sound?'こえ オン':'こえ オフ';$('voice').setAttribute('aria-pressed',sound);if(!sound&&'speechSynthesis'in window)speechSynthesis.cancel();speak('こえを つけたよ')};new ResizeObserver(positionScale).observe($('stage'));

$('effects').onclick=()=>{effects=!effects;$('effects').textContent=effects?'おと オン':'おと オフ';$('effects').setAttribute('aria-pressed',effects);if(effects)unlockAudio();else if(audioContext)audioContext.suspend().catch(()=>{});};
