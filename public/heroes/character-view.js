import {Vector3,Spherical,MathUtils} from 'three';

// Camera-only inspection: never rotate the skeleton or interfere with dice poses.
export function createCharacterView(canvas,camera,{locale='en',enabled=()=>true,onChange=()=>{}}={}){
 const copy={zh:['拖动旋转 · 滚轮 / 双指缩放','放大人物','缩小人物','恢复正面','向左查看','向右查看'],en:['Drag to rotate · Scroll / pinch to zoom','Zoom in','Zoom out','Reset view','View left','View right'],fr:['Glissez pour tourner · Molette / pincez pour zoomer','Agrandir','Réduire','Vue de face','Voir à gauche','Voir à droite']}[locale]||[];
 let yaw=0,pitch=0,zoom=1,blockedUntil=0,pinch=0;const pointers=new Map();
 const toolbar=document.createElement('div');toolbar.className='character-view-controls';toolbar.setAttribute('aria-label',copy[0]);
 Object.assign(toolbar.style,{position:'absolute',left:'12px',bottom:'12px',zIndex:'5',display:'flex',alignItems:'center',gap:'5px',maxWidth:'calc(100% - 24px)',flexWrap:'wrap',font:'11px system-ui',color:'#6c5732'});
 const hint=document.createElement('span');hint.textContent=copy[0];Object.assign(hint.style,{flexBasis:'100%',textShadow:'0 1px 3px #fff',pointerEvents:'none'});toolbar.append(hint);
 const changed=()=>{canvas.dataset.viewYaw=yaw.toFixed(3);canvas.dataset.viewPitch=pitch.toFixed(3);canvas.dataset.viewZoom=zoom.toFixed(3);onChange()};
 function magnify(factor){if(!enabled())return;zoom=MathUtils.clamp(zoom*factor,.38,1.45);changed()}
 function reset(){yaw=0;pitch=0;zoom=1;changed()}
 for(const [text,label,action]of [['‹',copy[4],()=>{yaw-=.3;changed()}],['›',copy[5],()=>{yaw+=.3;changed()}],['+',copy[1],()=>magnify(.83)],['−',copy[2],()=>magnify(1.2)],['↺',copy[3],reset]]){
  const button=document.createElement('button');button.type='button';if(text==='‹'||text==='›')button.dataset.viewTurn='true';button.textContent=text;button.title=label;button.setAttribute('aria-label',label);Object.assign(button.style,{width:'32px',height:'30px',border:'1px solid #ba9a5c80',borderRadius:'10px',background:'#fff8e9eb',color:'#6c5732',font:'19px system-ui',cursor:'pointer',boxShadow:'0 2px 8px #5c482014'});button.onclick=()=>{if(enabled())action()};toolbar.append(button);
 }
 const style=document.createElement('style');style.textContent='@media(max-width:650px){.character-view-controls{max-width:46%!important;font-size:9px!important}.character-view-controls button[data-view-turn]{display:none}}';document.head.append(style);
 const host=canvas.parentElement;if(getComputedStyle(host).position==='static')host.style.position='relative';host.append(toolbar);toolbar.hidden=!enabled();toolbar.style.display=enabled()?'flex':'none';canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',e=>{if(!enabled()||e.button>0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});canvas.setPointerCapture(e.pointerId);if(pointers.size===2){const[a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);blockedUntil=performance.now()+400}});
 canvas.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p||!enabled())return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(Math.hypot(p.x-p.startX,p.y-p.startY)>6){blockedUntil=performance.now()+400;canvas.style.cursor='grabbing'}
  if(pointers.size===2){const[a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0&&distance>0)zoom=MathUtils.clamp(zoom*pinch/distance,.38,1.45);pinch=distance}
  else if(blockedUntil>performance.now()){yaw-=dx*.007;pitch=MathUtils.clamp(pitch-dy*.004,-.35,.35)}
  changed();
 });
 const end=e=>{pointers.delete(e.pointerId);pinch=0;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);for(const p of pointers.values()){p.startX=p.x;p.startY=p.y}canvas.style.cursor='grab'};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end);
 canvas.addEventListener('click',e=>{if(performance.now()<blockedUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
 canvas.addEventListener('wheel',e=>{if(!enabled())return;e.preventDefault();magnify(Math.exp(MathUtils.clamp(e.deltaY,-180,180)*.0018))},{passive:false});
 canvas.addEventListener('keydown',e=>{if(!enabled())return;let handled=true;if(e.key==='ArrowLeft')yaw-=.15;else if(e.key==='ArrowRight')yaw+=.15;else if(e.key==='+'||e.key==='=')zoom=MathUtils.clamp(zoom*.9,.38,1.45);else if(e.key==='-')zoom=MathUtils.clamp(zoom*1.1,.38,1.45);else if(e.key==='Home'){e.preventDefault();reset();return}else handled=false;if(handled){e.preventDefault();changed()}});
 function apply(target,detail=target){toolbar.hidden=!enabled();toolbar.style.display=enabled()?'flex':'none';if(!enabled())return;
  const orbit=new Spherical().setFromVector3(camera.position.clone().sub(target));orbit.theta+=yaw;orbit.phi=MathUtils.clamp(orbit.phi+pitch,.35,Math.PI-.35);orbit.radius*=zoom;
  const focus=target.clone().lerp(detail,MathUtils.clamp((1-zoom)*1.3,0,.8));camera.position.copy(focus).add(new Vector3().setFromSpherical(orbit));camera.lookAt(focus);camera.updateMatrixWorld(true);
 }
 changed();return {apply,reset};
}
