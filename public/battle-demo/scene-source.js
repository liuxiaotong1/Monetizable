const params=new URLSearchParams(location.search),female=params.get('hero')!=='supercharlie',embedded=params.get('embed')==='1',locale=params.get('locale')||'en',lost=params.get('outcome')==='loss';let completedNotified=false;
import * as T from 'three';
import {createCharacterView} from '../heroes/character-view.js';
import {createCompanionCast} from './rig-motion.js';
import {createDefeatMotion} from './defeat-motion.js';
import {createDiceMaterial,DICE_PIP_COLOR} from '../heroes/dice-material.js';
import {createHandSocket} from '../heroes/arm-gesture.js';
import {fitArenaCamera,boxCorners} from './camera-fit.js';
import {createWorlds} from './worlds.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const $=id=>document.getElementById(id),canvas=$('scene'),host=canvas.parentElement;
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,host.clientWidth<600?1.25:1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
const scene=new T.Scene();scene.background=new T.Color(1.5,1.38,1.15);scene.fog=new T.FogExp2('#f5efdf',.018);
const camera=new T.PerspectiveCamera(38,1,.1,70);camera.userData.compact=params.get('chrome')==='compact';const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new T.Vector2(1000,600),.14,.2,2.8);composer.addPass(bloom);composer.addPass(new OutputPass());
scene.add(new T.HemisphereLight(0xffffff,0xb2a181,1.4));const key=new T.DirectionalLight(0xffffff,1.1);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6});key.shadow.normalBias=.03;scene.add(key);const rim=new T.DirectionalLight(0xffffff,.7);rim.position.set(3,4,-4);scene.add(rim);
const glow=new T.PointLight(0x79dfff,0,8);glow.position.set(1.6,1.5,1);scene.add(glow);
function mesh(geo,mat,parent=scene,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
const boss=new T.Group();boss.position.set(1.65,0,0);scene.add(boss);
const worlds=createWorlds(scene,boss);host.classList.add('spotlight-scene');
let actorFrame=null,interactionTime=null,anchorSentAt=0;
const arenaFrames=worlds.map(w=>{const points=[];w.env.updateMatrixWorld(true);w.env.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();points.push(...boxCorners(o.geometry.boundingBox).map(p=>p.applyMatrix4(o.matrixWorld)))}});return points;});
worlds.forEach(w=>w.boss.clear());
let hoverPreview=false,hoverClock=0;
let dragonMixer,dragonAction,beetleMixer,beetleRig=[],castPose,defeatPose,handSocket,dragonReady=false;
const armorParts=[];boss.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;armorParts.push({mesh:o,position:o.position.clone(),rotation:o.rotation.clone(),scale:o.scale.clone()});}});
const hero=new T.Group();hero.position.x=-1.4;hero.scale.setScalar(1.12);scene.add(hero);
const dice=new T.Group();scene.add(dice);const diceMat=createDiceMaterial();mesh(new T.BoxGeometry(.32,.32,.32),diceMat,dice);const edges=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(.33,.33,.33)),new T.LineBasicMaterial({color:0xffe3a0}));dice.add(edges);for(const axis of [0,1,2])for(const sign of [-1,1])for(const [a,b] of [[-1,-1],[-1,1],[0,0],[1,-1],[1,1]]){const pip=mesh(new T.SphereGeometry(.025,8,8),new T.MeshBasicMaterial({color:DICE_PIP_COLOR}),dice);pip.position.setComponent(axis,sign*.167);pip.position.setComponent((axis+1)%3,a*.08);pip.position.setComponent((axis+2)%3,b*.08);}
const meteor=new T.Group();scene.add(meteor);mesh(new T.IcosahedronGeometry(.4,1),new T.MeshStandardMaterial({color:0xb86b29,emissive:0xd1812e,emissiveIntensity:.4,roughness:.6,flatShading:true}),meteor);for(let i=0;i<5;i++){const flame=mesh(new T.ConeGeometry(.08,.65,6),new T.MeshBasicMaterial({color:i%2?0xe1b94b:0xce772e,transparent:true,opacity:.65}),meteor,Math.sin(i*3)*.2,.55,Math.cos(i*3)*.2);}
const fx=new T.Group();scene.add(fx);const fxMat=new T.MeshBasicMaterial({color:0x78e5ff,transparent:true,opacity:.8,blending:T.NormalBlending,depthWrite:false});
const rings=Array.from({length:6},(_,i)=>{let m=mesh(new T.TorusGeometry(1,.018,8,128),fxMat.clone(),fx,1.65,1.3,0);m.rotation.set(Math.PI/2,i*.4,i*.4);return m;});
const beam=mesh(new T.CylinderGeometry(.035,.12,1,12),fxMat.clone(),fx);const core=mesh(new T.SphereGeometry(.3,24,24),fxMat.clone(),fx,1.65,1.4,0);
const shards=new T.InstancedMesh(new T.OctahedronGeometry(.06),new T.MeshStandardMaterial({color:0x87d4dd,emissive:0x327b99,emissiveIntensity:1,metalness:.7,roughness:.2}),420);fx.add(shards);shards.instanceMatrix.setUsage(T.DynamicDrawUsage);const dummy=new T.Object3D();const seeds=Array.from({length:420},(_,i)=>{const a=i*2.39996,z=1-2*(i+.5)/420,r=Math.sqrt(1-z*z);return {v:new T.Vector3(Math.cos(a)*r,z,Math.sin(a)*r),speed:1+(i%17)/8,size:.4+(i%7)/5};});
const specksGeo=new T.BufferGeometry(),specksPos=new Float32Array(240*3);for(let i=0;i<240;i++)specksPos.set([Math.sin(i*45)*7,.2+(i%43)/7,Math.cos(i*87)*5],i*3);specksGeo.setAttribute('position',new T.BufferAttribute(specksPos,3));const specks=new T.Points(specksGeo,new T.PointsMaterial({size:.018,color:0xd5c28e,transparent:true,opacity:.6}));scene.add(specks);
let rig=new Map(),mixer,action,mode=0,time=0,running=false,sound=false,audio,last=performance.now(),frames=0,frameTime=0;const durations=[6.4,6.8,7],impacts=[1.8,2.3,2.6];const descriptions=['侧身蓄力 → 向前跨步掷骰 → 水环追击 → Boss 向后翻倒。动作重点是肩、手肘与身体重心。','转肩蓄力 → 掷骰命中 → 甲虫躯干受击 → 倒地收束。沿用成品待机骨骼，追加原创受击动作。','双臂展开 → 夜兰悬浮施法 → 金色牢笼旋转收紧 → Boss 上升并消散。没有投掷或陨星，强调优雅的控制感。'];const refs=[['原神 · 夜兰官方角色演示','https://www.youtube.com/watch?v=MDpYYzMvnHI','参考水元素轮廓、骰子和出手节奏。'],['FINAL FANTASY XVI · 官方战斗介绍','https://na.finalfantasyxvi.com/en-gb/battle','参考大型战斗的蓄力、冲击尺度与镜头强调。'],['Elden Ring · 官方游戏展示','https://en.bandainamcoent.eu/elden-ring/news/elden-ring-enter-the-lands-between-101-trailer','参考金色粒子、战斗收束与庄重胜利感。']];
function select(i){hoverPreview=false;if(i===1&&!worlds[1].ready){$('loading').textContent='甲虫模型等待 Sketchfab 下载登录，尚未接入；不会用旧几何体代替。';$('loading').style.display='grid';return;} $('loading').style.display='none';mode=i;worlds.forEach((w,j)=>{w.boss.visible=i===j;w.env.visible=i===j;});$("bossname").textContent=worlds[i].name;document.querySelectorAll('[data-mode]').forEach((b,j)=>b.classList.toggle('active',i===j));$('title').textContent=['01 · 水骰破阵','02 · 破甲终结','03 · 金誓封印'][i];$('description').textContent=descriptions[i];$('reference').innerHTML=`<a target="_blank" rel="noopener" href="${refs[i][1]}">${refs[i][0]} ↗</a><br>${refs[i][2]}`;if(embedded)$('bossname').textContent=({zh:['浅水庭院 · 水龙','日照遗迹 · 甲虫王'],fr:['Cour aquatique · Dragon','Ruines ensoleillées · Roi Scarabée'],en:['Water court · Dragon','Sunlit ruins · Beetle King']}[locale]||['Dragon','Beetle King'])[i];$('seek').max=durations[i];time=0;actorFrame=null;completedNotified=false;running=false;boss.rotation.set(0,0,0);boss.position.set(1.65,0,0);$('pause').textContent='继续';if(lost){$('title').textContent=i===0?'水龙反击 · 重整站位':'甲虫反击 · 防守后撤';$('description').textContent='面向 Boss 投掷 → 未能破防 → 防守受击 → 后撤恢复。场景完整保留，Boss 不会倒地或消失。';document.querySelectorAll('[data-mode] span').forEach(el=>el.textContent='未能破防 → Boss 反击 → 后撤恢复');}render();}
function audioHit(){if(!sound)return;audio??=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(mode===1?100:180,audio.currentTime);o.frequency.exponentialRampToValueAtTime(35,audio.currentTime+.32);g.gain.setValueAtTime(.22,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.6);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.65);}
function lineBetween(m,a,b,width){m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());m.scale.set(width,a.distanceTo(b),width);}
const clamp=T.MathUtils.clamp,smooth=(a,b,x)=>T.MathUtils.smootherstep(x,a,b);
function poseHero(t){
 for(const {bone,rest} of rig.values())bone.quaternion.copy(rest);
 function bone(name,x=0,y=0,z=0){const r=rig.get(name);if(r)r.bone.quaternion.copy(r.rest).multiply(new T.Quaternion().setFromEuler(new T.Euler(x*Math.PI/180,y*Math.PI/180,z*Math.PI/180)));}
 const wind=smooth(.05,.8,t),release=smooth(.8,1.8,t),settle=1-smooth(2.7,3.7,t);
 hero.position.set(-1.4,0,0);hero.rotation.set(0,.12,0);
 if(mode===0){const throwPose=Math.sin(release*Math.PI),load=wind*(1-release);hero.rotation.y=-.4*load+.45*throwPose;hero.position.x+=.42*throwPose;hero.position.y=-.05*Math.sin(release*Math.PI);hero.rotation.z=-.035*throwPose;bone('上半身',0,-25*load+30*throwPose,0);bone('右腕',-85*load-30*throwPose,0,18*load);bone('右ひじ',-100*load-15*throwPose);bone('右手首',0,0,-35*load+45*throwPose);bone('左腕',12*wind*settle,0,-20*wind*settle);bone('右足D',-22*throwPose,0,-5*throwPose);bone('右ひざD',22*throwPose);bone('左足D',10*throwPose,0,4*throwPose);bone('左ひざD',12*throwPose);bone('下半身',0,-8*throwPose,3*throwPose);}
 if(mode===1){const crouch=Math.sin(smooth(.05,.7,t)*Math.PI)*(1-smooth(.7,.8,t));const jump=Math.sin(smooth(.65,2.3,t)*Math.PI);const raise=smooth(.5,1.25,t)*(1-smooth(1.75,2.35,t));const land=Math.sin(smooth(2.3,2.9,t)*Math.PI);hero.position.y=jump*.55-crouch*.12-land*.12;hero.rotation.y=-.2;bone('右腕',-155*raise,0,12*raise);bone('左腕',150*raise,0,-12*raise);bone('右ひじ',-35*raise);bone('左ひじ',30*raise);bone('上半身',15*(crouch+land)-12*jump);bone('右足D',-25*jump);bone('左足D',-18*jump);bone('右ひざD',45*jump+20*land);bone('左ひざD',35*jump+20*land);}
 if(mode===2){const lev=smooth(.2,1.2,t)*(1-smooth(3.5,4.5,t));hero.position.y=.2*lev+Math.sin(t*2)*.018*lev;hero.rotation.y=.12+Math.sin(t)*.08;bone('右腕',-35*lev,0,55*lev);bone('左腕',35*lev,0,-55*lev);bone('右ひじ',-55*lev);bone('左ひじ',55*lev);bone('右手首',0,0,25*lev);bone('左手首',0,0,-25*lev);bone('右足D',-8*lev,0,-4*lev);bone('左足D',12*lev,0,5*lev);bone('左ひざD',24*lev);}
}
function secondary(t){
 const sway=(name,x,y,z)=>{const r=rig.get(name);if(r)r.bone.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(x,y,z)));};
 sway('上半身2',Math.sin(t*2.1)*.022,Math.sin(t*1.8)*.035,Math.sin(t*2)*.018);
 sway('首',Math.sin(t*1.6)*.018,-Math.sin(t*1.8)*.025,0);
 for(const [name,{bone}] of rig){if(/髪|毛|裾|コート/.test(name))sway(name,Math.sin(t*3.2-name.length*.3)*.018,0,Math.sin(t*2.6-name.length*.4)*.02);}
}
let diceReleasePoint=null,diceWasFlying=false;
function renderCompanionDice(){
 if(!castPose||!handSocket)return;
 if(interactionTime!==null){castPose(interactionTime);hero.updateMatrixWorld(true);}
 const held=handSocket(.176),clock=interactionTime===null?time:interactionTime,releaseAt=interactionTime!==null?1.15:mode===1?1.61:1.32,impact=interactionTime!==null?1.75:impacts[mode],catchAt=interactionTime!==null?2.5:impact+1.45,nowFlying=clock>releaseAt&&clock<catchAt;
 dice.visible=true;dice.scale.setScalar(.55);dice.position.copy(held.position);dice.quaternion.copy(held.quaternion);
 if(nowFlying){if(!diceWasFlying||!diceReleasePoint)diceReleasePoint=held.position.clone();const target=interactionTime!==null?diceReleasePoint.clone().add(new T.Vector3(.12,.65,.15)):new T.Vector3(1.65,1.6,0);if(clock<impact){const u=smooth(releaseAt,impact,clock);dice.position.copy(diceReleasePoint).lerp(target,u);dice.position.y+=Math.sin(u*Math.PI)*.4;}else{const u=smooth(impact,catchAt,clock);dice.position.copy(target).lerp(held.position,u);dice.position.y+=Math.sin(u*Math.PI)*.45;}dice.rotation.set(clock*5,clock*7,clock*3);}
 diceWasFlying=nowFlying;if(!nowFlying)diceReleasePoint=null;canvas.dataset.diceVisible='true';canvas.dataset.dicePhase=nowFlying?'flight':'held';canvas.dataset.dicePalmGap=nowFlying?'flight':dice.position.distanceTo(held.position).toFixed(4);
}
const view=createCharacterView(canvas,camera,{locale,enabled:()=>!!castPose&&time>=durations[mode],onChange:()=>{if(castPose)render()}});
const heroRay=new T.Raycaster();function hitCompanion(event){const bounds=canvas.getBoundingClientRect();heroRay.setFromCamera(new T.Vector2((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2),camera);return heroRay.intersectObject(hero,true).length>0;}
canvas.addEventListener('pointermove',event=>{canvas.style.cursor=time>=durations[mode]&&hitCompanion(event)?'pointer':'default'});
canvas.addEventListener('click',event=>{if(time>=durations[mode]&&hitCompanion(event))parent.postMessage({type:'monetizable-hero-tap'},location.origin)});
canvas.tabIndex=0;canvas.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&time>=durations[mode]){event.preventDefault();parent.postMessage({type:'monetizable-hero-tap'},location.origin)}});
function frameArena(){
 renderCompanionDice();
 // Frame the actors, not the outside rim of the floor. The arena remains
 // a continuous background filling the entire battle block.
 if(!castPose){return;}if(!actorFrame){actorFrame=new T.Box3();hero.updateMatrixWorld(true);boss.updateMatrixWorld(true);if(castPose)actorFrame.union(new T.Box3().setFromObject(hero));if(boss.visible)actorFrame.union(new T.Box3().setFromObject(worlds[mode].boss));if(actorFrame.isEmpty())actorFrame.set(new T.Vector3(-3,0,-1),new T.Vector3(4,3.5,1));actorFrame.expandByScalar(.25);}
 const points=boxCorners(actorFrame);
 // Track the flying dice and animated hands instead of reserving empty sky.
 if(dice.visible){dice.updateMatrixWorld(true);points.push(...boxCorners(new T.Box3().setFromObject(dice).expandByScalar(.2)));}
 for(const name of ['右手首','右ひじ','左腕','頭']){const part=rig.get(name);if(part){const p=part.bone.getWorldPosition(new T.Vector3());points.push(...boxCorners(new T.Box3(p.clone().addScalar(-.22),p.clone().addScalar(.22))));}}
 if(castPose){hero.updateMatrixWorld(true);points.push(...boxCorners(new T.Box3().setFromObject(hero).expandByScalar(.25)));}
 if(boss.visible){boss.updateMatrixWorld(true);const bound=new T.Box3().setFromObject(worlds[mode].boss);if(!bound.isEmpty())points.push(...boxCorners(bound.expandByScalar(.25)));}
 const distance=fitArenaCamera(camera,points);
 const close=smooth(durations[mode]-1.65,durations[mode]-.1,time);
 if(close>0){
  const actionPosition=camera.position.clone(),actionRotation=camera.quaternion.clone();
  const portrait=new T.Box3().setFromObject(hero),center=portrait.getCenter(new T.Vector3()),size=portrait.getSize(new T.Vector3());
  // Vertical actor occupancy ~78%, with independent top/bottom text bands.
  const d=Math.max(size.y/(2*Math.tan(camera.fov*Math.PI/360)*.78),size.x/(2*Math.tan(camera.fov*Math.PI/360)*camera.aspect*.83));
  camera.position.copy(center).add(new T.Vector3(.04,.06,1).normalize().multiplyScalar(d+.12));camera.lookAt(center);
  const portraitRotation=camera.quaternion.clone();camera.position.lerpVectors(actionPosition,camera.position.clone(),close);camera.quaternion.slerpQuaternions(actionRotation,portraitRotation,close);camera.updateMatrixWorld(true);
 }
 const head=rig.get('頭')?.bone;const center=new T.Box3().setFromObject(hero).getCenter(new T.Vector3());view.apply(center,head?.getWorldPosition(new T.Vector3())||center);if(head&&performance.now()-anchorSentAt>180){anchorSentAt=performance.now();const mouth=head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.12,.06)).project(camera);parent.postMessage({type:'monetizable-hero-anchor',x:(mouth.x+1)*50,y:(1-mouth.y)*50},location.origin)}
 canvas.dataset.handGap=(hero.userData.handGap||0).toFixed(3);canvas.dataset.closeup=close.toFixed(3);
 scene.fog.density=Math.min(.018,.22/distance);canvas.dataset.framing='actor-spotlight';const measured=new T.Box3().setFromPoints(points);canvas.dataset.frameBounds=JSON.stringify([measured.min.toArray(),measured.max.toArray()]);
 let extent=0;for(const point of points){const p=point.clone().project(camera);extent=Math.max(extent,Math.abs(p.x),Math.abs(p.y));}canvas.dataset.frameExtent=extent.toFixed(3);
}
function renderDefeat(){
 host.classList.add('loss-scene');
 const impact=impacts[mode],hit=impact+.55,q=time-hit,reset=smooth(hit+1.7,durations[mode]-.2,time),attack=smooth(impact+.05,hit,time)*(1-smooth(hit+.25,hit+1.4,time));
 // Keep the approved arenas and a side-on camera: hero looks toward the boss.
 hero.position.set(-1.65,0,.7);hero.rotation.set(0,T.MathUtils.lerp(Math.PI/2-.1,.12,reset),0);castPose(Math.min(time,4));
 const recoil=defeatPose(time,impact,reset);hero.position.x-=.38*recoil+.16*smooth(hit,hit+1.8,time);hero.position.y=-.09*recoil;
 hero.updateMatrixWorld(true);
 if(mode===0&&dragonMixer)dragonMixer.setTime(.6+attack*.6+.06*Math.sin(time*2));
 if(mode===1&&beetleMixer)beetleMixer.setTime(time);
 boss.visible=true;boss.scale.setScalar(.85);boss.position.set(1.65-.55*attack,0,-.3);boss.rotation.set(0,mode===1?-Math.PI/2:0,0);
 boss.traverse(o=>{if(o.isMesh)for(const mat of(Array.isArray(o.material)?o.material:[o.material])){mat.opacity=mat.userData.defeatOpacity??1;}});

 meteor.visible=false;beam.visible=false;shards.visible=false;glow.intensity=Math.max(0,1.2-Math.abs(q)*7);
 rings.forEach((r,i)=>{r.visible=i<2&&time>impact-.1&&time<hit+.5;r.position.set(i===0?1.05:hero.position.x,1.65,.2);r.rotation.set(0,Math.PI/2,time*.2);r.scale.setScalar(i===0?.7:.55+Math.max(0,q)*1.8);r.material.color.setHex(i===0?0xd0a95f:0xb87556);r.material.opacity=i===0?.65:Math.max(0,.7-q);});
 core.visible=q>0&&q<.35;core.position.set(hero.position.x,1.7,.7);core.scale.setScalar(.35+Math.max(0,q)*2);core.material.color.setHex(0xd8b16a);core.material.opacity=Math.max(0,.55-q*1.5);
 const shake=q>0&&q<.25?Math.sin(q*70)*.035*(1-q/.25):0;
 const distance=Math.max(7.8,6.8/Math.max(.45,camera.aspect));camera.position.set(-.8+shake,3.0+shake,distance);camera.lookAt(0,1.65,0);
 $('hp').style.width='100%';$('victory').style.transition=running?'opacity .4s,transform .4s':'none';$('victory').classList.toggle('show',time>hit+2.2);
 canvas.dataset.time=time.toFixed(2);canvas.dataset.boss=mode===0?'dragon':'beetle';canvas.dataset.outcome='loss';canvas.dataset.heroFacing=reset>.99?'viewer':reset>0?'returning':'boss';$('time').textContent=time.toFixed(2)+' s';$('seek').value=time;frameArena();composer.render();
}

function render(){if(lost&&castPose){renderDefeat();return}const impact=impacts[mode],q=time-impact,release=smooth(.65,impact,time),fade=1-smooth(impact+.7,impact+1.7,time),col=mode===0?0x058aa9:mode===1?0xd87922:0x9b7527;fxMat.color.setHex(col);rings.forEach(m=>m.material.color.setHex(col));beam.material.color.setHex(col);core.material.color.setHex(col);glow.color.setHex(col);shards.material.color.setHex(col);shards.material.emissive.setHex(col).multiplyScalar(.22);
 if(castPose){for(const {bone,rest} of rig.values())bone.quaternion.copy(rest);const drive=smooth(1.05,1.6,time),recover=smooth(2.2,3.5,time);hero.position.set(-1.6+.45*drive-.15*recover,-.08*Math.sin(Math.min(time/1.7,1)*Math.PI),.12*Math.sin(time));hero.rotation.set(0,-.25*(smooth(.1,.9,time))+.55*drive-.3*recover,0);castPose(time*(mode===1?.82:1));}else poseHero(time);
 const finish=smooth(impact+1.25,impact+2.5,time);
 if(finish>0){hero.position.x=T.MathUtils.lerp(hero.position.x,-.35,finish);hero.position.y*=1-finish;hero.rotation.y=T.MathUtils.lerp(hero.rotation.y,.04,finish);for(const name of ['右腕','左腕','右ひじ','左ひじ','右足D','左足D','右ひざD','左ひざD']){const r=rig.get(name);if(r)r.bone.quaternion.slerp(r.rest,finish*.95);}const flourish=(name,x,y,z)=>{const r=rig.get(name);if(r)r.bone.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(x*finish,y*finish,z*finish)));};const head=rig.get('頭');if(head)head.bone.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(0,-.08*finish,.04*finish)));}


 if(mode===0&&dragonMixer){dragonMixer.setTime(Math.min(time,impact));}if(mode===1&&beetleMixer){beetleMixer.setTime(Math.min(time,impact));for(const {bone,rest,sample} of beetleRig){bone.quaternion.copy(rest);if(sample)bone.quaternion.fromArray(sample.evaluate(Math.min(time,impact)));if(q>0)bone.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.45*smooth(0,.65,q),0,.12*Math.sin(q*7))));}} boss.traverse(o=>{if(o.isMesh){for(const mat of (Array.isArray(o.material)?o.material:[o.material])){if(mat.userData.defeatOpacity===undefined)mat.userData.defeatOpacity=mat.opacity;mat.transparent=true;mat.opacity=mat.userData.defeatOpacity*(1-smooth(.75,1.6,q));}}}); boss.rotation.y=0;boss.visible=q<1.6;boss.scale.setScalar(.85*(1+Math.sin(time*2)*.012));armorParts.forEach((p,i)=>{p.mesh.position.copy(p.position);p.mesh.rotation.copy(p.rotation);p.mesh.scale.copy(p.scale);if(q>0){const f=Math.max(0,q-.08);p.mesh.position.x+=Math.sin(i*2.4)*f*1.2;p.mesh.position.y+=Math.cos(i*1.7)*f*.8-f*f*.5;p.mesh.position.z+=Math.sin(i*3.1)*f;p.mesh.rotation.z+=f*Math.sin(i)*.6;p.mesh.scale.multiplyScalar(Math.max(.001,1-f/1.3));}});boss.position.y=mode===2?smooth(.5,impact,time)*.28:0;boss.rotation.z=q>0?Math.sin(q*38)*.09*Math.exp(-q*4):Math.sin(time*1.5)*.015;boss.position.x=1.65+(q>0&&mode===0?q*.8:0);
 if(mode===0&&q>0)boss.rotation.z=-Math.min(q,1)*.75;
 if(mode===1&&q>0){boss.rotation.z=-smooth(0,1.4,q)*1.2;boss.position.y=-smooth(.2,1.4,q)*.45;boss.position.x=1.65+smooth(0,1.4,q)*.6;}
 if(mode===2){boss.position.y=smooth(.6,2.4,time)*.7;boss.rotation.y=time*.6;}
 meteor.visible=false;


 for(let i=0;i<6;i++){
 const r=rings[i];r.visible=false;r.material.opacity=.8;
 if(mode===0){r.visible=i<3&&time>.85&&q<.8;r.position.set(-.5+release*2.15,1.5+i*.13,.1);r.rotation.set(0,Math.PI/2,time*3+i);r.scale.setScalar(.3+i*.17+Math.max(0,q)*2);r.material.opacity=q<0?.7:Math.max(0,.7-q);}
 if(mode===1){r.visible=i<2&&q>0&&q<1.4;r.position.set(1.65,.06+i*.02,0);r.rotation.set(Math.PI/2,0,0);r.scale.setScalar(.2+q*(3+i));r.material.opacity=Math.max(0,.8-q*.55);}
 if(mode===2){r.visible=time>.5&&q<1.5;r.position.set(1.65,1.4,0);r.rotation.set(i%2?Math.PI/2:0,time*.7+i*Math.PI/3,i*.3);r.scale.setScalar(1.3-smooth(.5,impact,time)*.25+Math.max(0,q)*.7);r.material.opacity=Math.min(.7,smooth(.5,1,time))*(1-smooth(impact+.3,impact+1.5,time));}}
 beam.visible=mode===1&&time>1.9&&q<.2;lineBetween(beam,new T.Vector3(1.65,4.4,0),new T.Vector3(1.65,1.2,0),1.7);beam.material.opacity=.55;

 core.visible=q>0&&q<.5;core.scale.setScalar(1+Math.max(0,q)*5);core.material.opacity=Math.max(0,.8-q*1.6);glow.intensity=q>0?Math.max(0,2-q*8):0;
 shards.visible=q>0&&q<2;for(let i=0;i<420;i++){const s=seeds[i],p=Math.max(0,q);dummy.position.set(1.65+s.v.x*s.speed*p,1.4+s.v.y*s.speed*p-(mode===2?-.45:.7)*p*p,s.v.z*s.speed*p);dummy.rotation.set(p*3+i,p*2+i,0);dummy.scale.setScalar(Math.max(0,(1-p/2))*s.size*(mode===2?.5:1));dummy.updateMatrix();shards.setMatrixAt(i,dummy.matrix);}shards.instanceMatrix.needsUpdate=true;
 const shake=mode===1&&q>0&&q<.35?Math.sin(q*100)*.065*(1-q/.35):0;const push=mode===2?smooth(.4,2.8,time)*.4:Math.sin(Math.min(time/ durations[mode],1)*Math.PI)*.18;camera.position.set(shake,3.05+shake,host.clientWidth<600?9.8:6.25-push);camera.position.lerp(new T.Vector3(-.4,2.25,host.clientWidth<600?6.3:4.8),finish);camera.lookAt(T.MathUtils.lerp(0,-.35,finish),T.MathUtils.lerp(mode===1?2.05:1.75,1.85,finish),0);$('hp').style.width=`${100*(1-smooth(impact,impact+.2,time))}%`;$('victory').style.transition=running?'opacity .4s,transform .4s':'none';$('victory').classList.toggle('show',time>impact+2.2);canvas.dataset.time=time.toFixed(2);canvas.dataset.boss=mode===0?'dragon':'beetle';$('time').textContent=time.toFixed(2)+' s';$('seek').value=time;frameArena();composer.render();}
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}new ResizeObserver(resize).observe(host);
$('play').onclick=()=>{hoverPreview=false;time=0;view.reset();running=true;$('pause').textContent='暂停';};$('pause').onclick=()=>{running=!running;$('pause').textContent=running?'暂停':'继续';};$('seek').oninput=e=>{running=false;time=+e.target.value;$('pause').textContent='继续';render();};$('sound').onclick=()=>{sound=!sound;$('sound').textContent='声音：'+(sound?'开':'关');};document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{select(+b.dataset.mode);running=true});
function tick(now){requestAnimationFrame(tick);const rawDt=(now-last)/1000,dt=Math.min(rawDt,.05);last=now;if(document.hidden||(!running&&!hoverPreview&&interactionTime===null))return;if(interactionTime!==null){interactionTime+=dt;if(interactionTime>4.4)interactionTime=null;}if(hoverPreview){hoverClock+=dt;time=.12+(1-Math.cos(hoverClock*2))*.56;running=false;}if(running){const before=time;time=Math.min(durations[mode],time+dt*+$('speed').value);if(before<impacts[mode]&&time>=impacts[mode])audioHit();if(time===durations[mode])running=false;}render();if(embedded&&!running&&time>=durations[mode]&&!completedNotified){completedNotified=true;parent.postMessage({type:'monetizable-restored-complete',outcome:lost?'loss':'win'},location.origin)}frames++;frameTime+=rawDt;if(frameTime>1){$('stats').textContent=`${Math.round(frames/frameTime)} FPS · ${Math.round(host.clientWidth*renderer.getPixelRatio())} px`;frames=0;frameTime=0;}}
try{
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(female?'../heroes/female-fast-20261019.glb.gz':'../heroes/supercharlie-fast-20261019.glb.gz'),model=gltf.scene;
 model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.pose()});model.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(model,true),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=2.8/size.y;
 model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);hero.add(model);
 const aliases={pelvis:'Hips',spine_01:'Spine',spine_02:'Spine1',spine_03:'Spine2',head:'Head',upperarm_r:'RightArm',lowerarm_r:'RightForeArm',hand_r:'RightHand',upperarm_l:'LeftArm',lowerarm_l:'LeftForeArm'};
 const names={RightArm:'右腕',RightForeArm:'右ひじ',RightHand:'右手首',LeftArm:'左腕',LeftForeArm:'左ひじ',Head:'頭'};
 model.traverse(o=>{if(o.isBone){const n=aliases[o.name]||o.name.replace('mixamorig','').replace(':','');if(names[n])rig.set(names[n],{bone:o,rest:o.quaternion.clone()})}if(o.isMesh){o.castShadow=true;o.frustumCulled=false;for(const mat of(Array.isArray(o.material)?o.material:[o.material])){mat.roughness=mat.name==='CharlieNativeHead'?.85:.65;mat.metalness=mat.name==='CharlieNativeHead'?0:.08}}});
 castPose=createCompanionCast(model,hero);defeatPose=createDefeatMotion(model);handSocket=createHandSocket(model);
 if(lost){const copy=({zh:['预判未命中 · 重新整备','Boss 仍在。回看证据，为下一次判断积累经验。'],fr:['Prévision manquée · Reprenez vos repères','Le Boss résiste. Revenez aux faits pour préparer votre prochaine prévision.'],en:['Missed call · Regroup','The Boss holds. Review the evidence and prepare your next call.']}[locale]||['Missed call · Regroup','Review the evidence.']);$('victory').querySelector('h2').textContent=copy[0];$('victory').querySelector('p').textContent=copy[1];if(!embedded){$('title').textContent='防御 · 受击 · 后撤 · 重新站稳';document.querySelector('main>header h1').textContent='预测失败 · 完整场景演示';document.querySelector('.notes article:last-child>p').textContent='角色始终面向 Boss：投掷未破防，Boss 反击后防守后撤，再恢复站位。庭院与遗迹背景全程保留。支持重播、半速与拖动时间轴。';}}
 await Promise.all([loadDragon(),loadBeetle()]);$('loading').hidden=true;$('loading').style.display='none';$('play').disabled=false;select(params.get('boss')==='beetle'?1:0);running=true;canvas.dataset.ready='true';if(embedded)parent.postMessage({type:'monetizable-restored-ready',outcome:lost?'loss':'win'},location.origin);if(embedded&&matchMedia('(prefers-reduced-motion: reduce)').matches){time=durations[mode];running=false;completedNotified=true;parent.postMessage({type:'monetizable-restored-complete',outcome:lost?'loss':'win'},location.origin)}resize();requestAnimationFrame(tick);
}catch(e){$('loading').textContent='模型加载失败，请点击刷新重试。';console.error(e);if(embedded)parent.postMessage({type:'monetizable-restored-error'},location.origin)}

async function loadDragon(){
 const g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('../heroes/market-dragon.glb');const m=g.scene;
 const box=new T.Box3().setFromObject(m),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 const wrap=new T.Group();wrap.scale.setScalar(5.8/Math.max(size.x,size.z));m.position.set(-center.x,-box.min.y,-center.z);wrap.add(m);wrap.rotation.y=-Math.PI/2+.25;worlds[0].boss.add(wrap);
 m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(x=>{x.color.multiply(new T.Color(.7,1,1));x.roughness=Math.max(.4,x.roughness);if(x.map)x.map.anisotropy=8;});}});
 dragonMixer=new T.AnimationMixer(m);dragonAction=dragonMixer.clipAction(g.animations.find(a=>a.name==='roar')||g.animations[0]);dragonAction.setLoop(T.LoopOnce,1);dragonAction.clampWhenFinished=true;dragonAction.play();dragonReady=true;worlds[0].name='浅水庭院 · Ashwing 水龙';
}

async function loadBeetle(){
 const g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('../heroes/market-beetle.glb'),m=g.scene;
 beetleMixer=new T.AnimationMixer(m);const action=beetleMixer.clipAction(g.animations.find(a=>/idle/.test(a.name))||g.animations[0]);action.play();beetleMixer.setTime(.01);m.updateMatrixWorld(true);
 m.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
 // The separately exported eye mesh has invalid skin offsets; exclude it rather than distort the whole rig.
 const brokenEyes=m.getObjectByName('Object_15');if(brokenEyes)brokenEyes.removeFromParent();
 const box=new T.Box3().setFromObject(m,true),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 const wrap=new T.Group(),offset=new T.Group();wrap.scale.setScalar(3.15/size.y);offset.position.set(-center.x,-box.min.y,-center.z);offset.add(m);wrap.add(offset);wrap.rotation.y=-.45;worlds[1].boss.add(wrap);
 m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(x=>{x.emissiveMap=x.map;x.emissive.setHex(0xffffff);x.emissiveIntensity=.2;x.roughness=Math.max(.45,x.roughness);if(x.map)x.map.anisotropy=8;});}if(o.isBone&&/spine|head/.test(o.name))beetleRig.push({bone:o,rest:o.quaternion.clone(),sample:(g.animations.find(a=>/idle/.test(a.name))||g.animations[0]).tracks.find(t=>t.name===o.name+'.quaternion')?.createInterpolant()});});
 worlds[1].ready=true;worlds[1].name='日照遗迹 · Beetle King';
}

for(const button of document.querySelectorAll('[data-hero]')){button.classList.toggle('active',button.dataset.hero===(female?'female':'supercharlie'));button.onclick=()=>{const query=new URLSearchParams(location.search);query.set('hero',button.dataset.hero);query.set('boss',mode===1?'beetle':'dragon');location.search=query.toString()}}

addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;if(event.data?.type==='monetizable-roll-dice'&&time>=durations[mode]){interactionTime=0;return;}if(event.data?.type==='monetizable-cast'){time=0;completedNotified=false;running=true;}});
