// UV/material splits must deform together. Stitch weights, never geometry or UVs.
import fs from 'node:fs';
const path='public/heroes/female-playable.glb',bytes=fs.readFileSync(path),jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength)),base=28+jsonLength;
const attrs=doc.meshes[0].primitives[0].attributes;
function attr(index){const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],components={SCALAR:1,VEC3:3,VEC4:4}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType],offset=base+(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||components*size;return {count:a.count,get:(i,k=0)=>{const at=offset+i*stride+k*size;return a.componentType===5126?bytes.readFloatLE(at):size===4?bytes.readUInt32LE(at):size===2?bytes.readUInt16LE(at):bytes.readUInt8(at)},set:(i,k,value)=>{const at=offset+i*stride+k*size;if(a.componentType===5126)bytes.writeFloatLE(value,at);else bytes.writeUInt16LE(value,at)}}}
const p=attr(attrs.POSITION),j=attr(attrs.JOINTS_0),w=attr(attrs.WEIGHTS_0),indices=attr(doc.meshes[0].primitives[0].indices),groups=new Map(),neighbors=Array.from({length:p.count},()=>new Set());
for(let i=0;i<indices.count;i+=3)for(let k=0;k<3;k++){const a=indices.get(i+k),b=indices.get(i+(k+1)%3);neighbors[a].add(b);neighbors[b].add(a)}
for(let i=0;i<p.count;i++){if(p.get(i,1)<.85||p.get(i,1)>1.60||Math.abs(p.get(i,0))<.13)continue;const key=[0,1,2].map(k=>Math.round(p.get(i,k)*1000)).join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i)}
const vectors=Array.from({length:p.count},(_,i)=>{const m=new Map();for(let k=0;k<4;k++)if(w.get(i,k)>0)m.set(j.get(i,k),w.get(i,k));return m});
function average(list){const m=new Map();for(const v of list)for(const[id,weight]of vectors[v])m.set(id,(m.get(id)||0)+weight/list.length);return m}
const seams=[...groups.values()].filter(v=>v.length>1),active=new Set();
for(const part of seams){const merged=average(part);if(merged.size>1)for(const i of part){active.add(i);for(const n of neighbors[i])active.add(n)}for(const i of part)vectors[i]=new Map(merged)}
// Include the entire upper/lower-arm shell, not just coincident UV edges.
// The auto-rig also contains hard weight transitions inside triangles.
for(let i=0;i<p.count;i++)if(p.get(i,1)>1.06&&p.get(i,1)<1.58&&Math.abs(p.get(i,0))>.16)active.add(i);
// Expand the feathering band across topology; a one-ring blend creates a new
// discontinuity immediately behind the stitched seam.
for(let ring=0;ring<8;ring++){const grow=[];for(const i of active)for(const n of neighbors[i])if(!active.has(n))grow.push(n);for(const i of grow)active.add(i)}
// Feather the weight change along local topology instead of making rigid patches.
for(let pass=0;pass<32;pass++){const changes=[];for(const i of active){const near=average([i,...neighbors[i]]),mixed=new Map();for(const[id,v]of vectors[i])mixed.set(id,v*.55);for(const[id,v]of near)mixed.set(id,(mixed.get(id)||0)+v*.45);changes.push([i,mixed])}for(const[i,m]of changes)vectors[i]=m;for(const part of seams){const merged=average(part);for(const i of part)vectors[i]=new Map(merged)}}
for(let i=0;i<p.count;i++){const top=[...vectors[i]].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((n,[,v])=>n+v,0);for(let k=0;k<4;k++){j.set(i,k,top[k]?.[0]||0);w.set(i,k,(top[k]?.[1]||0)/sum)}}
fs.writeFileSync(path,bytes);console.log(`Stitched ${seams.length} split-position groups; feathered ${active.size} vertices.`);
