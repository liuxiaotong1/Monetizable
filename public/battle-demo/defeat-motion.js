import * as T from 'three';
import {createArmGesture} from '../heroes/arm-gesture.js';
// Guard, recoil, then regain a fighting stance. Return to a neutral pose as the actor turns back toward the viewer.
export function createDefeatMotion(model){
 const aliases={spine_01:'Spine',spine_02:'Spine1',spine_03:'Spine2',head:'Head',upperarm_r:'RightArm',lowerarm_r:'RightForeArm',upperarm_l:'LeftArm',lowerarm_l:'LeftForeArm',thigh_r:'RightUpLeg',calf_r:'RightLeg',thigh_l:'LeftUpLeg',calf_l:'LeftLeg'},bones={};
 model.traverse(o=>{if(o.isBone)bones[aliases[o.name]||o.name.replace('mixamorig','').replace(':','')]=o});
 const arms=createArmGesture(model);
 const smooth=(a,b,t)=>T.MathUtils.smootherstep(t,a,b);
 return (t,impact,reset=0)=>{
  const hit=impact+.55,guard=smooth(impact-.15,hit,t)*(1-.45*smooth(hit+1.4,hit+2.8,t))*(1-reset);
  const recoil=smooth(hit-.12,hit+.15,t)*(1-smooth(hit+.3,hit+1.7,t))*(1-reset);
  const turn=(name,x,y,z)=>{const b=bones[name];if(b)b.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(x,y,z)))};
  turn('Spine',-.045*recoil,0,.02*recoil);turn('Spine1',-.06*recoil,0,0);turn('Head',.05*recoil,-.025*guard,0);
  arms({guard});
  turn('RightUpLeg',.10*recoil,0,0);turn('RightLeg',.16*recoil,0,0);turn('LeftLeg',.10*recoil,0,0);
  return recoil;
 };
}
