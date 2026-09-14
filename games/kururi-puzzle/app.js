'use strict';
const backToPlayroom=document.createElement('a');
backToPlayroom.href='../../index.html';
backToPlayroom.className='back-playroom';
backToPlayroom.textContent='← PLAYROOM';
document.querySelector('header').prepend(backToPlayroom);
const svg=document.querySelector('#game'),NS='http://www.w3.org/2000/svg';
const patterns={
 yellow:{width:8,height:5,forms:[[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[2,0],[2,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[0,1]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[1,1],[2,1]],[[1,0],[2,0],[0,1],[1,1]],[[1,0],[0,1],[1,1],[2,1]],[[1,0],[0,1],[1,1],[2,1]]],colors:['#dfff43','#c8ee48','#ffb82e','#ffa927','#cce94a','#ffce37','#ffae31','#f7a62a','#ddeb40','#e9d934']},
 blue:{width:6,height:10,forms:[
  [[0,0],[0,1],[0,2],[1,2],[0,3]], // Y
  [[1,0],[0,1],[1,1],[2,1],[1,2]], // X
  [[0,0],[1,0],[2,0],[1,1],[1,2]], // T
  [[0,0],[0,1],[0,2],[1,2],[2,2]], // V
  [[0,0],[1,0],[0,1],[1,1],[1,2]], // P
  [[0,0],[1,0],[2,0],[0,1],[2,1]], // U
  [[0,0],[0,1],[0,2],[0,3],[0,4]], // I
  [[0,0],[1,0],[1,1],[1,2],[2,2]], // Z
  [[1,0],[0,1],[1,1],[2,1],[2,2]], // F
  [[1,0],[2,0],[0,1],[1,1],[0,2]], // W
  [[0,0],[0,1],[0,2],[1,2],[1,3]], // N
  [[0,0],[0,1],[0,2],[0,3],[1,3]]  // L
 ],colors:['#225de8','#1248cb','#1559df','#1b53d2','#25c8dc','#22b8d1','#23c4db','#1ab0cf','#24bdd6','#2bc4d9','#20b2d1','#27bdd6']}
};
let pattern=patterns.yellow;
let pieces=[],history=[],selected=null,gesture=null,pointers=new Map(),layout,board,boardLayer,ghostLayer,pieceLayer;
const $=s=>document.querySelector(s);
function node(tag,attrs={},parent){let n=document.createElementNS(NS,tag);for(let[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(parent)parent.append(n);return n}
function cells(p){let a=pattern.forms[p.id].map(([x,y])=>[p.flip?-x:x,y]);for(let r=0;r<p.rot;r++)a=a.map(([x,y])=>[-y,x]);let mx=Math.min(...a.map(c=>c[0])),my=Math.min(...a.map(c=>c[1]));return a.map(([x,y])=>[x-mx,y-my]);}
function dims(p){let a=cells(p);return [Math.max(...a.map(c=>c[0]))+1,Math.max(...a.map(c=>c[1]))+1]}
function snapshot(){return pieces.map(({id,x,y,rot,flip,placed})=>({id,x,y,rot,flip,placed}))}
function remember(s=snapshot()){history.push(s);if(history.length>100)history.shift()}
function slot(id){if(pattern===patterns.blue)return layout.portrait?[7+(id%2)*5,.35+Math.floor(id/2)*3.05]:[8+(id%3)*5.1,.35+Math.floor(id/3)*3.15];return layout.portrait?[1+(id%2)*5,6.7+Math.floor(id/2)*2.2]:[10.8+(id%2)*4.5,.65+Math.floor(id/2)*2.2]}
function reset(){$('#hint').textContent='ピースを枠に運んでみましょう';gesture=null;pointers.clear();history=[];selected=null;pieces=pattern.forms.map((_,id)=>({id,rot:0,flip:false,placed:false,x:0,y:0}));if(pattern===patterns.blue)for(let p of pieces){let best=0,shortest=Infinity;for(let r=0;r<4;r++){p.rot=r;let[w,h]=dims(p);if(w<=5&&h<shortest){best=r;shortest=h}}p.rot=best}pieces.forEach(p=>[p.x,p.y]=slot(p.id));render()}
function setup(force=false){let r=svg.getBoundingClientRect(),portrait=r.width/r.height<1.25;if(!force&&layout?.portrait===portrait){positionRotate();return;}cancelGesture();layout=pattern===patterns.blue?{portrait,w:portrait?17.3:23.5,h:portrait?19:13.2}:{portrait,w:portrait?12:20,h:portrait?17.8:12};board=pattern===patterns.blue?{x:portrait?.45:.8,y:portrait?4.5:1.55}:{x:portrait?2:1,y:portrait?.6:3};svg.setAttribute('viewBox',`0 0 ${layout.w} ${layout.h}`);history=[];pieces.forEach(p=>{if(!p.placed)[p.x,p.y]=slot(p.id)});render()}
function outline(a){let occupied=new Set(a.map(([x,y])=>`${x},${y}`)),d='';for(let[x,y]of a){if(!occupied.has(`${x},${y-1}`))d+=`M${x} ${y}h1`;if(!occupied.has(`${x+1},${y}`))d+=`M${x+1} ${y}v1`;if(!occupied.has(`${x},${y+1}`))d+=`M${x+1} ${y+1}h-1`;if(!occupied.has(`${x-1},${y}`))d+=`M${x} ${y+1}v-1`;}return d}
function render(){if(!layout)return;svg.replaceChildren();boardLayer=node('g',{},svg);ghostLayer=node('g',{'pointer-events':'none'},svg);pieceLayer=node('g',{},svg);node('rect',{x:board.x-.14,y:board.y-.14,width:pattern.width+.28,height:pattern.height+.28,rx:.16,fill:'#0a1424',stroke:'#52617a','stroke-width':.04},boardLayer);for(let x=0;x<pattern.width;x++)for(let y=0;y<pattern.height;y++)node('rect',{x:board.x+x+.025,y:board.y+y+.025,width:.95,height:.95,rx:.04,fill:'#17263b',stroke:'#263750','stroke-width':.015},boardLayer);let t=node('text',{x:board.x,y:board.y+pattern.height+.65,fill:'#8195ae','font-size':'.23','letter-spacing':'.035'},boardLayer);t.textContent=`${pattern.width} × ${pattern.height}  /  すきまなく、ぴったり。`;for(let p of pieces)drawPiece(p);if(selected!==null)pieceLayer.append(pieces[selected].el);update();}
function drawPiece(p){let g=node('g',{'class':'piece'+(p.id===selected?' active':''),tabindex:'0',role:'button','aria-label':`ピース${p.id+1}。タップで裏返す。矢印キーで移動、Rで回転、Enterで配置。`,'data-id':p.id},pieceLayer);p.el=g;g=node('g',{},g);let a=cells(p);for(let[x,y]of a)node('rect',{x,y,width:1.005,height:1.005,fill:pattern.colors[p.id],class:'face'},g);node('path',{d:outline(a),fill:'none',stroke:p.id===selected?'#fffad0':'#b4ecff','stroke-width':p.id===selected?.065:.035,'stroke-linejoin':'round',class:'outline'},g);let [w,h]=dims(p);node('path',{d:outline(a),fill:'none',stroke:'#082039','stroke-opacity':'.24','stroke-width':'.09','pointer-events':'none'},g);node('circle',{cx:a[0][0]+.5,cy:a[0][1]+.5,r:.09,fill:p.flip?'#223422':'none',stroke:'#34421d','stroke-width':'.025',opacity:'.6'},g);transform(p);p.el.addEventListener('keydown',e=>key(e,p));}
function transform(p,angle=0){let[w,h]=dims(p);p.el?.setAttribute('transform',`translate(${p.x+(p.placed?board.x:0)} ${p.y+(p.placed?board.y:0)}) rotate(${angle} ${w/2} ${h/2})`)}
function valid(p,x,y){let occupied=new Set(pieces.filter(q=>q.id!==p.id&&q.placed).flatMap(q=>cells(q).map(([a,b])=>`${q.x+a},${q.y+b}`)));return cells(p).every(([a,b])=>x+a>=0&&x+a<pattern.width&&y+b>=0&&y+b<pattern.height&&!occupied.has(`${x+a},${y+b}`))}
function candidate(p){let x=Math.round(p.x-board.x),y=Math.round(p.y-board.y);return {x,y,ok:valid(p,x,y)}}
function preview(p){ghostLayer.replaceChildren();let c=candidate(p);if(c.ok&&Math.abs(p.x-board.x-c.x)<.48&&Math.abs(p.y-board.y-c.y)<.48)for(let[x,y]of cells(p))node('rect',{x:board.x+c.x+x+.04,y:board.y+c.y+y+.04,width:.92,height:.92,rx:.04,fill:'#eaff53','fill-opacity':'.23',stroke:'#eaff53','stroke-width':'.025'},ghostLayer)}
function update(){let n=pieces.filter(p=>p.placed).length;$('#count').textContent=n;$('#total').textContent=pieces.length;$('#win-total').textContent=pieces.length;$('#win').hidden=n!==pieces.length;$('#undo').disabled=!history.length;$('#rotate').disabled=$('#flip').disabled=selected===null;positionRotate();}
function pt(e){let m=svg.getScreenCTM();return new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse())}
function angle(){let a=[...pointers.values()];return Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x)}
function center(){let a=[...pointers.values()];return {x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2}}
svg.addEventListener('pointerdown',e=>{if(e.button!==0||pointers.size>=2)return;let p;if(!gesture){let g=e.target.closest('[data-id]');if(!g)return;p=pieces[+g.dataset.id];selected=p.id;let before=snapshot();let pos=pt(e);if(p.placed){p.x+=board.x;p.y+=board.y;p.placed=false;}gesture={p,before,start:pos,origin:{x:p.x,y:p.y},screen:{x:e.clientX,y:e.clientY},moved:false,two:false,delta:0};render();}pointers.set(e.pointerId,pt(e));svg.setPointerCapture(e.pointerId);if(pointers.size===2){gesture.two=true;gesture.lastAngle=angle();gesture.delta=0;gesture.mid=center();gesture.origin={x:gesture.p.x,y:gesture.p.y};}e.preventDefault();});
svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,pt(e));let g=gesture,p=g.p;if(Math.hypot(e.clientX-g.screen.x,e.clientY-g.screen.y)>7)g.moved=true;if(pointers.size===2){let a=angle(),d=a-g.lastAngle;while(d>Math.PI)d-=2*Math.PI;while(d< -Math.PI)d+=2*Math.PI;g.delta+=d;g.lastAngle=a;let mid=center();p.x=g.origin.x+mid.x-g.mid.x;p.y=g.origin.y+mid.y-g.mid.y;transform(p,g.delta*180/Math.PI);ghostLayer.replaceChildren();}else{let a=pt(e);p.x=g.origin.x+a.x-g.start.x;p.y=g.origin.y+a.y-g.start.y;transform(p);preview(p)}e.preventDefault();});
function snapRotation(){let g=gesture,p=g.p,[w,h]=dims(p);p.rot=((p.rot+Math.round(g.delta/(Math.PI/2)))%4+4)%4;let[nw,nh]=dims(p);p.x+=(w-nw)/2;p.y+=(h-nh)/2;g.delta=0;render();}
svg.addEventListener('pointerup',e=>{if(!gesture||!pointers.has(e.pointerId))return;let g=gesture;if(pointers.size===2)snapRotation();pointers.delete(e.pointerId);if(pointers.size){let a=[...pointers.values()][0];g.start=a;g.origin={x:g.p.x,y:g.p.y};return;}let p=g.p;if(!g.moved&&!g.two){let old=g.before[p.id];Object.assign(p,old);gesture=null;action('flip',g.before);return;}remember(g.before);finish(p,g.before);gesture=null;render();});
function finish(p,before){let c=candidate(p);if(c.ok&&Math.abs(p.x-board.x-c.x)<.48&&Math.abs(p.y-board.y-c.y)<.48){p.x=c.x;p.y=c.y;p.placed=true;$('#hint').textContent='ぴったり！ タップで裏返し、横の↻ボタンで回転';return;}let a=cells(p),over=a.some(([x,y])=>p.x+x<board.x+pattern.width&&p.x+x+1>board.x&&p.y+y<board.y+pattern.height&&p.y+y+1>board.y);if(over){Object.assign(p,before[p.id]);$('#hint').textContent='そこには置けません。位置や向きを変えてみましょう';}else{let[w,h]=dims(p);p.x=Math.max(.12,Math.min(layout.w-w-.12,p.x));p.y=Math.max(.12,Math.min(layout.h-h-.12,p.y));p.placed=false;$('#hint').textContent='ピース横の↻ボタンで回転できます';}}
function cancelGesture(){if(gesture){let s=gesture.before;gesture=null;pointers.clear();pieces=s;render();}}
svg.addEventListener('pointercancel',cancelGesture);svg.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))cancelGesture()});window.addEventListener('blur',cancelGesture);
function action(type,before=snapshot()){if(selected===null||gesture)return;let p=pieces[selected],[w,h]=dims(p);remember(before);if(type==='flip')p.flip=!p.flip;else p.rot=(p.rot+1)%4;let[nw,nh]=dims(p);if(p.placed){if(!valid(p,p.x,p.y)){Object.assign(p,before[p.id]);history.pop();$('#hint').textContent='枠の外へ出してから、向きを変えてください';}}else{p.x=Math.max(0,Math.min(layout.w-nw,p.x+(w-nw)/2));p.y=Math.max(0,Math.min(layout.h-nh,p.y+(h-nh)/2));}render();if(type==='flip')p.el.firstElementChild.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)',offset:.5},{transform:'scaleX(1)'}],{duration:240});}
function undo(){if(gesture||!history.length)return;pieces=history.pop();selected=null;render();$('#hint').textContent='1手戻しました';}
function key(e,p){if(gesture)return;selected=p.id;update();if(e.key==='r'||e.key==='R'){action('rotate');e.preventDefault()}else if(e.key===' '||e.key==='f'||e.key==='F'){action('flip');e.preventDefault()}else if(e.key.startsWith('Arrow')){e.preventDefault();remember();if(p.placed){p.x+=board.x;p.y+=board.y;p.placed=false}p.x+=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;p.y+=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;let[w,h]=dims(p);p.x=Math.max(0,Math.min(layout.w-w,p.x));p.y=Math.max(0,Math.min(layout.h-h,p.y));transform(p);preview(p);update()}else if(e.key==='Enter'&&!p.placed){remember();finish(p,history.at(-1));render()}}
function positionRotate(){
 const button=$('#piece-rotate');button.hidden=selected===null||!!gesture||pieces.every(p=>p.placed);if(button.hidden)return;
 const p=pieces[selected],[w,h]=dims(p),matrix=svg.getScreenCTM();if(!matrix)return;
 const x=p.x+(p.placed?board.x:0),y=p.y+(p.placed?board.y:0),area=$('.play').getBoundingClientRect();
 const left=new DOMPoint(x,y+h/2).matrixTransform(matrix),right=new DOMPoint(x+w,y+h/2).matrixTransform(matrix);
 const size=56,gap=12;let bx=right.x-area.left+gap;if(bx+size>area.width-4)bx=left.x-area.left-gap-size;
 button.style.left=Math.max(4,Math.min(area.width-size-4,bx))+'px';button.style.top=Math.max(4,Math.min(area.height-size-4,right.y-area.top-size/2))+'px';
}
$('#piece-rotate').onclick=()=>action('rotate');
$('#pattern').onchange=e=>{cancelGesture();pattern=patterns[e.target.value];pieces=[];setup(true);reset()};
$('#undo').onclick=undo;$('#rotate').onclick=()=>action('rotate');$('#flip').onclick=()=>action('flip');$('#reset').onclick=()=>$('#reset-dialog').showModal();$('#cancel-reset').onclick=()=>$('#reset-dialog').close();$('#confirm-reset').onclick=()=>{$('#reset-dialog').close();reset()};$('#again').onclick=reset;new ResizeObserver(setup).observe(svg);setup();reset();
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_puzzle_state',description:'Read the current puzzle pieces and board occupancy.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({board:{width:pattern.width,height:pattern.height},pieces:snapshot(),complete:pieces.every(p=>p.placed)})})).catch(()=>{});}catch{}}
