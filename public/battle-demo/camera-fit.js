import {Vector3,Box3} from 'three';
export function boxCorners(box){const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new Vector3(x,y,z));return points;}
// Fit actual scene parts separately: a single enclosing box includes empty
// upper/front corners and needlessly makes the characters look miniature.
export function fitArenaCamera(camera,points){
 if(points.isBox3)points=boxCorners(points);
 const box=new Box3().setFromPoints(points),center=box.getCenter(new Vector3()),direction=new Vector3(.04,.18,1).normalize(),right=new Vector3().crossVectors(new Vector3(0,1,0),direction).normalize(),up=new Vector3().crossVectors(direction,right).normalize();
 center.y=box.min.y+(box.max.y-box.min.y)*.28;
 const tan=Math.tan(camera.fov*Math.PI/360),horizontal=tan*Math.max(.1,camera.aspect)*.91,vertical=tan*.86;
 let distance=0;
 for(const point of points){const v=point.clone().sub(center),depth=v.dot(direction);distance=Math.max(distance,depth+Math.abs(v.dot(right))/horizontal,depth+Math.abs(v.dot(up))/vertical);}
 camera.position.copy(center).addScaledVector(direction,distance+.2);camera.lookAt(center);camera.far=Math.max(70,distance+box.getSize(new Vector3()).length()*2);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return distance;
}
