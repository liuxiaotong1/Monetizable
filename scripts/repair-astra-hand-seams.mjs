// Repair disconnected hand/sleeve islands split between the torso and hand.
// Preserve geometry, textures and the existing inverse bind matrices.
import fs from 'node:fs';
const path='public/heroes/female-playable.glb',bytes=fs.readFileSync(path),jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength)),base=28+jsonLength;
const attrs=doc.meshes[0].primitives[0].attributes;
function accessor(index){const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],components={SCALAR:1,VEC3:3,VEC4:4}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType],offset=base+(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||components*size;return {a,get:(i,k=0)=>{const at=offset+i*stride+k*size;return a.componentType===5126?bytes.readFloatLE(at):size===4?bytes.readUInt32LE(at):size===2?bytes.readUInt16LE(at):bytes.readUInt8(at)},set:(i,k,value)=>{const at=offset+i*stride+k*size;if(a.componentType===5126)bytes.writeFloatLE(value,at);else bytes.writeUInt16LE(value,at)}}}
const p=accessor(attrs.POSITION),j=accessor(attrs.JOINTS_0),w=accessor(attrs.WEIGHTS_0),indices=accessor(doc.meshes[0].primitives[0].indices),skin=doc.skins[0],names=skin.joints.map(i=>doc.nodes[i].name),neighbors=Array.from({length:p.a.count},()=>[]);
for(let i=0;i<indices.a.count;i+=3)for(let k=0;k<3;k++){const a=indices.get(i+k),b=indices.get(i+(k+1)%3);neighbors[a].push(b);neighbors[b].push(a)}
const visited=new Uint8Array(p.a.count);let changed=0,islands=0;
for(let i=0;i<p.a.count;i++){if(visited[i])continue;const part=[i];visited[i]=1;for(let k=0;k<part.length;k++)for(const n of neighbors[part[k]])if(!visited[n]){visited[n]=1;part.push(n)}const counts=new Map();for(const v of part)counts.set(j.get(v),(counts.get(j.get(v))||0)+1);const dominant=[...counts].sort((a,b)=>b[1]-a[1])[0];
if(counts.size>1&&part.length<2000&&/^(head|spine_0[123]|pelvis)$/.test(names[dominant[0]])&&dominant[1]/part.length>.55){for(const v of part)for(let k=0;k<4;k++){j.set(v,k,k===0?dominant[0]:0);w.set(v,k,k===0?1:0)}changed+=part.length;islands++;continue}
const maxAbsX=Math.max(...part.map(v=>Math.abs(p.get(v,0)))), minYBody=Math.min(...part.map(v=>p.get(v,1))),maxYBody=Math.max(...part.map(v=>p.get(v,1))),minZBody=Math.min(...part.map(v=>p.get(v,2)));
// Front waist ornaments are rigid garment islands, not fingers.
if(part.length<2000&&maxAbsX<.30&&minYBody>.90&&maxYBody<1.30&&minZBody>0){const torso=names.indexOf('spine_02');for(const v of part)for(let k=0;k<4;k++){j.set(v,k,k===0?torso:0);w.set(v,k,k===0?1:0)}changed+=part.length;islands++;continue}
const hands=[...counts].filter(([id])=>/^hand_[lr]$/.test(names[id]));if(!hands.length||counts.size===1)continue;hands.sort((a,b)=>b[1]-a[1]);const [hand,count]=hands[0],side=names[hand].at(-1),forearm=names.indexOf('lowerarm_'+side),maxY=Math.max(...part.map(v=>p.get(v,1))),minY=Math.min(...part.map(v=>p.get(v,1))),minX=Math.min(...part.map(v=>Math.abs(p.get(v,0))));
if(minY<.90||minX<.17)continue;
const wholeHand=maxY<1.13,sleeve=count/part.length>.4&&maxY<1.30;
if(!wholeHand&&!sleeve)continue;
for(const v of part){const handWeight=wholeHand?1:Math.max(0,Math.min(1,(1.23-p.get(v,1))/.13));for(let k=0;k<4;k++){j.set(v,k,k===0?hand:k===1?forearm:0);w.set(v,k,k===0?handWeight:k===1?1-handWeight:0)}changed++}islands++;
}
fs.writeFileSync(path,bytes);console.log(`Repaired ${changed} vertices across ${islands} hand/sleeve islands.`);
