import * as T from 'three';
import {createArmGesture} from '../heroes/arm-gesture.js';
export function createCompanionCast(model,actor){
 const bones={},rest=[],aliases={pelvis:'Hips',spine_01:'Spine',spine_02:'Spine1',spine_03:'Spine2',neck_01:'Neck',head:'Head',upperarm_r:'RightArm',lowerarm_r:'RightForeArm',hand_r:'RightHand',upperarm_l:'LeftArm',lowerarm_l:'LeftForeArm',hand_l:'LeftHand',thigh_r:'RightUpLeg',calf_r:'RightLeg',thigh_l:'LeftUpLeg',calf_l:'LeftLeg'};
 model.traverse(b=>{if(b.isBone){bones[aliases[b.name]||b.name.replace('mixamorig','').replace(':','')]=b;rest.push([b,b.quaternion.clone()])}});
 const arms=createArmGesture(model),smooth=(a,b,t)=>T.MathUtils.smootherstep(t,a,b);
 function turn(name,x,y,z){const b=bones[name];if(b)b.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(x,y,z)))}
 return t=>{for(const[b,q]of rest)b.quaternion.copy(q);const wind=smooth(.05,.95,t)*(1-smooth(1.05,1.65,t)),release=smooth(1.12,1.65,t)*(1-smooth(2.1,3.5,t)),catching=smooth(2.1,2.6,t)*(1-smooth(2.8,3.6,t));turn('Hips',0,-.06*wind+.08*release,0);turn('Spine',0,-.10*wind+.12*release,0);turn('Spine1',0,0,-.025*wind+.035*release);turn('Head',0,.07*wind-.08*release,.015*Math.sin(t*1.3));arms({wind,release,catching});turn('RightUpLeg',.055*release,0,0);turn('RightLeg',.07*release,0,0);actor.updateMatrixWorld(true);actor.userData.handGap=bones.RightHand.getWorldPosition(new T.Vector3()).distanceTo(bones.LeftHand.getWorldPosition(new T.Vector3()));};
}
