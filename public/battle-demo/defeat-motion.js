import * as T from 'three';
// Guard, recoil, then regain a fighting stance. The actor keeps facing +X.
export function createDefeatMotion(model){
 const aliases={spine_01:'Spine',spine_02:'Spine1',spine_03:'Spine2',head:'Head',upperarm_r:'RightArm',lowerarm_r:'RightForeArm',upperarm_l:'LeftArm',lowerarm_l:'LeftForeArm',thigh_r:'RightUpLeg',calf_r:'RightLeg',thigh_l:'LeftUpLeg',calf_l:'LeftLeg'},bones={};
 model.traverse(o=>{if(o.isBone)bones[aliases[o.name]||o.name.replace('mixamorig','').replace(':','')]=o});
 const smooth=(a,b,t)=>T.MathUtils.smootherstep(t,a,b);
 return (t,impact)=>{
  const hit=impact+.55,guard=smooth(impact-.15,hit,t)*(1-.45*smooth(hit+1.4,hit+2.8,t));
  const recoil=smooth(hit-.12,hit+.15,t)*(1-smooth(hit+.3,hit+1.7,t));
  const turn=(name,x,y,z)=>{const b=bones[name];if(b)b.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(x,y,z)))};
  turn('Spine',-.1*recoil,0,.04*recoil);turn('Spine1',-.14*recoil,0,0);turn('Head',.12*recoil,-.04*guard,0);
  turn('RightArm',-.5*guard,0,-.15*guard);turn('RightForeArm',-.8*guard,0,0);turn('LeftArm',-.4*guard,0,.12*guard);turn('LeftForeArm',-.7*guard,0,0);
  turn('RightUpLeg',.10*recoil,0,0);turn('RightLeg',.16*recoil,0,0);turn('LeftLeg',.10*recoil,0,0);
  return recoil;
 };
}
