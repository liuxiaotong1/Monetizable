import type * as Three from "three";

export const YELAN_CAST_DURATION = 2.6;
// Hand-authored motion inspired by the official skill demo, not extracted game animation.
// https://www.youtube.com/watch?v=W6-BDI7y-lA&t=177s
export function createYelanCastClip(THREE: typeof Three, model: Three.Object3D) {
  const times = [0, 0.24, 0.52, 0.78, 0.94, 1.18, 1.64, 2.18, YELAN_CAST_DURATION];
  type Pose = [number, number, number];
  const poses: Record<string, Pose[]> = {
    "上半身": [[0,0,0],[5,-10,-3],[2,-17,-5],[-3,-10,-4],[-7,15,5],[-3,20,6],[1,10,3],[0,3,0],[0,0,0]],
    "上半身2": [[0,0,0],[2,-5,0],[0,-8,-3],[-2,-6,-3],[-3,10,4],[-2,9,3],[0,4,1],[0,0,0],[0,0,0]],
    "首": [[0,0,0],[0,6,2],[-3,9,3],[-4,5,2],[2,-9,-3],[1,-12,-3],[0,-5,-1],[0,0,0],[0,0,0]],
    "頭": [[0,0,0],[0,3,2],[-3,5,4],[-2,3,3],[2,-6,-4],[1,-6,-3],[-2,-3,3],[-1,0,2],[0,0,0]],
    "右腕": [[0,0,0],[-18,-5,5],[-54,-8,6],[-76,-5,4],[-52,9,-7],[-28,14,-8],[-10,6,-3],[-3,0,0],[0,0,0]],
    "右ひじ": [[0,0,0],[-35,0,0],[-88,-2,0],[-105,-3,0],[-32,0,0],[-12,0,0],[-18,0,0],[-6,0,0],[0,0,0]],
    "右手首": [[0,0,0],[0,5,-10],[6,12,-24],[10,18,-38],[-16,-8,45],[-8,-10,18],[0,0,-7],[0,0,0],[0,0,0]],
    "左腕": [[0,0,0],[6,0,-4],[16,0,-9],[22,0,-10],[26,0,-14],[20,0,-10],[10,0,-5],[3,0,-1],[0,0,0]],
    "左ひじ": [[0,0,0],[8,0,0],[20,0,0],[28,0,0],[20,0,0],[12,0,0],[5,0,0],[0,0,0],[0,0,0]],
  };
  const tracks: Three.KeyframeTrack[] = [];
  for (const [name, keys] of Object.entries(poses)) {
    const bone = model.getObjectByName(name);
    if (!bone) continue;
    const rest = bone.quaternion.clone();
    const frames: number[] = [], values: number[] = [];
    // Sample eased poses so the anticipation is soft and the release has a crisp accent.
    for (let frame = 0; frame <= 78; frame++) {
      const time = frame / 30;
      let segment = 0;
      while (segment < times.length - 2 && time > times[segment + 1]) segment++;
      const fraction = Math.min(1, (time - times[segment]) / (times[segment + 1] - times[segment]));
      const eased = fraction * fraction * (3 - 2 * fraction);
      const angle = keys[segment].map((v, axis) => THREE.MathUtils.degToRad(v + (keys[segment + 1][axis] - v) * eased));
      const pose = rest.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(angle[0], angle[1], angle[2], "XYZ")));
      frames.push(time); values.push(pose.x, pose.y, pose.z, pose.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.uuid}.quaternion`, frames, values));
  }
  model.traverse(object => {
    const mesh = object as Three.Mesh;
    if (!mesh.morphTargetDictionary) return;
    const wink = mesh.morphTargetDictionary["ウィンク"];
    if (wink !== undefined) tracks.push(new THREE.NumberKeyframeTrack(`${mesh.uuid}.morphTargetInfluences[${wink}]`,
      [0, 1.7, 1.83, 1.96, 2.1, YELAN_CAST_DURATION], [0, 0, 0.7, 0.7, 0, 0]));
  });
  return new THREE.AnimationClip("HydroDiceCast", YELAN_CAST_DURATION, tracks);
}
