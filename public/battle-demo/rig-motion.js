import * as T from 'three';
// Restore the approved wind-up / step / release / recovery timing on the
// current companions. World-space IK handles their different bind axes.
export function createCompanionCast(model,actor){
 const bones={},rest=[];const aliases={pelvis:'Hips',spine_01:'Spine',spine_02:'Spine1',spine_03:'Spine2',neck_01:'Neck',head:'Head',upperarm_r:'RightArm',lowerarm_r:'RightForeArm',hand_r:'RightHand',upperarm_l:'LeftArm',lowerarm_l:'LeftForeArm',hand_l:'LeftHand',thigh_r:'RightUpLeg',calf_r:'RightLeg',foot_r:'RightFoot',thigh_l:'LeftUpLeg',calf_l:'LeftLeg',foot_l:'LeftFoot'};
 model.traverse(b=>{if(b.isBone){bones[aliases[b.name]||b.name.replace('mixamorig','').replace(':','')]=b;rest.push([b,b.quaternion.clone()])}});
 actor.updateMatrixWorld(true);
 const local=name=>actor.worldToLocal(bones[name].getWorldPosition(new T.Vector3()));
 const hands={Right:local('RightHand'),Left:local('LeftHand')};
 const poles={};for(const side of ['Right','Left']){poles[side+'Arm']=local(side+'ForeArm').sub(local(side+'Arm'));if(bones[side+'Leg'])poles[side+'Leg']=local(side+'Leg').sub(local(side+'UpLeg'))}
 const pole=name=>poles[name].clone().transformDirection(actor.matrixWorld);
 const feet={Right:bones.RightFoot?local('RightFoot'):null,Left:bones.LeftFoot?local('LeftFoot'):null};
 const times=new Float32Array([0,.3,.65,.95,1.15,1.32,1.55,1.85,2.3,2.9,3.5,4.4,7]);
 const hand=hands.Right;
 const female=!!bones.upperarm_r || !!model.getObjectByName("upperarm_r");
 const poses=[hand,[-.52,1.84,.34],[-.72,2.08,.21],[-.83,2.21,-.01],[-.64,2.22,.24],[-.19,2.12,.62],[-.06,2.04,.58],[-.12,1.88,.45],[-.30,1.79,.38],hand,hand,hand,hand].map(p=>p.isVector3?p.toArray():p);
 const interpolant=new T.CubicInterpolant(times,new Float32Array(poses.flat()),3);
 const smooth=(a,b,t)=>T.MathUtils.smootherstep(t,a,b);
 function rotate(name,axis,angle){const b=bones[name];if(!b)return;actor.updateMatrixWorld(true);const world=b.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromAxisAngle(axis,angle));b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world))}
 function aim(b,end,target){actor.updateMatrixWorld(true);const p=b.getWorldPosition(new T.Vector3()),dir=end.getWorldPosition(new T.Vector3()).sub(p).normalize(),dest=target.clone().sub(p).normalize(),q=b.getWorldQuaternion(new T.Quaternion());q.premultiply(new T.Quaternion().setFromUnitVectors(dir,dest));b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));actor.updateMatrixWorld(true)}
 function solve(a,b,c,target,pole){if(!a||!b||!c)return;actor.updateMatrixWorld(true);const p=a.getWorldPosition(new T.Vector3()),q=b.getWorldPosition(new T.Vector3()),h=c.getWorldPosition(new T.Vector3()),l1=p.distanceTo(q),l2=q.distanceTo(h),dir=target.clone().sub(p),d=T.MathUtils.clamp(dir.length(),.02,(l1+l2)*.96);dir.normalize();pole=pole.clone().addScaledVector(dir,-pole.dot(dir)).normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));aim(a,b,p.clone().addScaledVector(dir,along).addScaledVector(pole,height));aim(b,c,p.clone().addScaledVector(dir,d))}
 const x=new T.Vector3(1,0,0),y=new T.Vector3(0,1,0),z=new T.Vector3(0,0,1);
 return function(t){
  for(const[b,q]of rest)b.quaternion.copy(q);
  const wind=smooth(.05,.95,t)*(1-smooth(1.05,1.65,t)),release=smooth(1.12,1.65,t)*(1-smooth(2.1,3.5,t)),settle=smooth(2.7,4.0,t);
  rotate('Hips',y,-.10*wind+.12*release);rotate('Spine',y,-.18*wind+.20*release);rotate('Spine1',z,-.045*wind+.07*release);rotate('Spine2',x,.025*wind-.04*release);rotate('Neck',y,.10*wind-.12*release);rotate('Head',y,.14*wind-.18*release);rotate('Head',z,.025*settle);
  const target=new T.Vector3().fromArray(interpolant.evaluate(Math.min(t,7)));// Maintain the right-hand side of the bind pose through release.
  if(female){const active=1-smooth(2.3,3.5,t);target.x=Math.min(target.x,-.34*active+hand.x*(1-active));target.z+=.12*release;}
  actor.localToWorld(target);
  solve(bones.RightArm,bones.RightForeArm,bones.RightHand,target,pole('RightArm'));
  const support=hands.Left.clone().add(new T.Vector3(female?.14*wind:.10*wind,-.02*wind,female?.06*wind:.24*wind+.12*release));actor.localToWorld(support);solve(bones.LeftArm,bones.LeftForeArm,bones.LeftHand,support,pole('LeftArm'));
  const stride=smooth(.65,1.55,t)*(1-smooth(2.25,3.6,t)),lift=Math.sin(Math.PI*smooth(.65,1.55,t))*.12;
  for(const side of ['Right','Left'])if(feet[side]){const f=feet[side].clone();if(side==='Right'){f.x+=stride*.18;f.y+=lift;f.z+=stride*.1;}else f.x-=stride*.06;actor.localToWorld(f);solve(bones[side+'UpLeg'],bones[side+'Leg'],bones[side+'Foot'],f,pole(side+'Leg'));}
  actor.updateMatrixWorld(true);
  const gap=bones.RightHand.getWorldPosition(new T.Vector3()).distanceTo(bones.LeftHand.getWorldPosition(new T.Vector3()));
  actor.userData.handGap=gap;
 };
}
