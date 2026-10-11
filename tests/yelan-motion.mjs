import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import * as THREE from 'three';
const code=ts.transpileModule(await readFile(new URL('../src/lib/quest/yelan-cast-motion.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {createYelanCastClip,YELAN_CAST_DURATION}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const model=new THREE.Group(),names=['上半身','上半身2','首','頭','右腕','右ひじ','右手首','左腕','左ひじ'];
const rest=new Map();
for(const name of names){const bone=new THREE.Bone();bone.name=name;bone.quaternion.setFromEuler(new THREE.Euler(.2,-.1,.3));rest.set(name,bone.quaternion.clone());model.add(bone);}
const face=new THREE.Mesh();face.morphTargetDictionary={'ウィンク':0};face.morphTargetInfluences=[0];model.add(face);
const clip=createYelanCastClip(THREE,model);
assert.equal(clip.duration,YELAN_CAST_DURATION);assert.equal(clip.tracks.length,10);
for(const track of clip.tracks){assert.ok([...track.values].every(Number.isFinite));assert.equal(track.times[0],0);assert.ok(Math.abs(track.times.at(-1)-YELAN_CAST_DURATION)<1e-6);if(track.ValueTypeName==='quaternion'){for(let i=0;i<track.values.length;i+=4){assert.ok(Math.abs(new THREE.Quaternion().fromArray(track.values,i).length()-1)<1e-6)}}}
const mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(.78);
assert.ok(model.getObjectByName('右腕').quaternion.angleTo(rest.get('右腕'))>.9,'The arm must visibly move during windup');
assert.ok(model.getObjectByName('上半身').quaternion.angleTo(rest.get('上半身'))>.1,'The torso participates in the cast');
mixer.setTime(YELAN_CAST_DURATION);
for(const name of names)assert.ok(model.getObjectByName(name).quaternion.angleTo(rest.get(name))<0.001,'The cast must return each joint to rest');
assert.equal(face.morphTargetInfluences[0],0,'Wink must not remain stuck after the cast');
console.log('Passed cast duration, finite normalized rotations, arm/torso movement, joint recovery and wink recovery.');
