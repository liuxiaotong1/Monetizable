/** Landing-only loss-bounded packing. Existing playable/fast files remain untouched.
 * Run: MESHOPT_PACKAGE=/absolute/path/to/meshoptimizer node scripts/build-landing-models.mjs
 * meshoptimizer 1.3.0; Only positions, normals and UV coordinates are snapped to 1/65536, then
 * packed with the standard meshopt EXPONENTIAL filter (18-bit shared exponent).
 * Skin weights/joints, inverse binds, nodes, animations, materials and images stay exact.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const toolkit=process.env.MESHOPT_PACKAGE;
if(!toolkit) throw new Error('Set MESHOPT_PACKAGE to an extracted meshoptimizer 1.3.0 package.');
const {MeshoptEncoder}=await import(pathToFileURL(path.join(toolkit,'meshopt_encoder.js')));
const {MeshoptDecoder}=await import(pathToFileURL(path.join(toolkit,'meshopt_decoder.mjs')));
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const align=n=>(n+3)&~3;
function read(file){const bytes=zlib.gunzipSync(fs.readFileSync(file)),size=bytes.readUInt32LE(12);return {j:JSON.parse(bytes.subarray(20,20+size)),bin:bytes.subarray(28+size)};}
function decode(g,v){const ext=v.extensions?.EXT_meshopt_compression;if(!ext)return Buffer.from(g.bin.subarray(v.byteOffset,v.byteOffset+v.byteLength));const out=Buffer.alloc(v.byteLength);MeshoptDecoder.decodeGltfBuffer(out,ext.count,ext.byteStride,g.bin.subarray(ext.byteOffset,ext.byteOffset+ext.byteLength),ext.mode,ext.filter);return out;}
function serialize(j,bin){let json=Buffer.from(JSON.stringify(j)),padded=Buffer.alloc(align(json.length),32);json.copy(padded);let out=Buffer.alloc(28+padded.length+align(bin.length));out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);out.writeUInt32LE(align(bin.length),20+padded.length);out.writeUInt32LE(0x004e4942,24+padded.length);bin.copy(out,28+padded.length);return out;}
const report=[];
for(const hero of ['female','supercharlie']){
 const source=`public/heroes/${hero}-fast-20261019.glb.gz`,output=`public/heroes/${hero}-landing-20261023.glb.gz`;
 const g=read(source),j=structuredClone(g.j),used=new Set(),quantize=new Map();
 for(const mesh of j.meshes)for(const primitive of mesh.primitives){if(primitive.indices!==undefined)used.add(primitive.indices);for(const [semantic,id]of Object.entries(primitive.attributes)){used.add(id);if(['POSITION','NORMAL','TEXCOORD_0'].includes(semantic))quantize.set(id,semantic);}for(const target of primitive.targets||[])Object.values(target).forEach(id=>used.add(id));}
 for(const skin of j.skins||[])if(skin.inverseBindMatrices!==undefined)used.add(skin.inverseBindMatrices);
 for(const animation of j.animations||[])for(const sampler of animation.samplers){used.add(sampler.input);used.add(sampler.output);}
 const aid=new Map([...used].sort((a,b)=>a-b).map((v,i)=>[v,i]));
 const liveViews=new Set([...used].map(id=>j.accessors[id].bufferView));j.images.forEach(im=>liveViews.add(im.bufferView));
 const vids=[...liveViews].sort((a,b)=>a-b),vid=new Map(vids.map((v,i)=>[v,i]));
 const pieces=[],views=[];let length=0,fallback=0;const error={POSITION:0,NORMAL:0,TEXCOORD_0:0},baseline=[];
 function append(b){const at=length;pieces.push(b,Buffer.alloc(align(b.length)-b.length));length+=align(b.length);return at;}
 for(const oldId of vids){const v=structuredClone(j.bufferViews[oldId]),original=decode(g,v),raw=Buffer.from(original);baseline[oldId]=original;
  for(const [id,semantic]of quantize){const a=j.accessors[id];if(a.bufferView!==oldId)continue;assert.equal(a.componentType,5126);const components=a.type==='VEC3'?3:2,stride=v.byteStride||components*4;
   for(let n=0;n<a.count;n++)for(let c=0;c<components;c++){const offset=(a.byteOffset||0)+n*stride+c*4,value=raw.readFloatLE(offset),packed=Math.round(value*65536)/65536;raw.writeFloatLE(packed,offset);error[semantic]=Math.max(error[semantic],Math.abs(value-packed));}
   if(a.min){a.min=a.min.map(value=>Math.round(value*65536)/65536);a.max=a.max.map(value=>Math.round(value*65536)/65536);}
  }
  const ext=v.extensions?.EXT_meshopt_compression;
  if(ext){const geometric=[...quantize].some(([id])=>g.j.accessors[id].bufferView===oldId);const packed=geometric?MeshoptEncoder.encodeFilterExp(new Float32Array(raw.buffer,raw.byteOffset,raw.length/4),ext.count,ext.byteStride,18,'SharedComponent'):raw;const encoded=Buffer.from(MeshoptEncoder.encodeGltfBuffer(packed,ext.count,ext.byteStride,ext.mode,0));ext.buffer=0;ext.byteOffset=append(encoded);ext.byteLength=encoded.length;if(geometric)ext.filter='EXPONENTIAL';else delete ext.filter;v.buffer=1;v.byteOffset=fallback;fallback+=align(v.byteLength);}else{v.buffer=0;v.byteOffset=append(raw);v.byteLength=raw.length;}
  views.push(v);
 }
 j.accessors=[...aid.keys()].map(id=>({...j.accessors[id],bufferView:vid.get(j.accessors[id].bufferView)}));
 j.bufferViews=views;j.buffers=[{byteLength:length},{byteLength:fallback,extensions:{EXT_meshopt_compression:{fallback:true}}}];
 for(const mesh of j.meshes)for(const p of mesh.primitives){if(p.indices!==undefined)p.indices=aid.get(p.indices);for(const k of Object.keys(p.attributes))p.attributes[k]=aid.get(p.attributes[k]);for(const t of p.targets||[])for(const k of Object.keys(t))t[k]=aid.get(t[k]);}
 for(const skin of j.skins||[])if(skin.inverseBindMatrices!==undefined)skin.inverseBindMatrices=aid.get(skin.inverseBindMatrices);
 for(const a of j.animations||[])for(const s of a.samplers){s.input=aid.get(s.input);s.output=aid.get(s.output);}
 for(const image of j.images)image.bufferView=vid.get(image.bufferView);
 fs.writeFileSync(output,zlib.gzipSync(serialize(j,Buffer.concat(pieces)),{level:9,mtime:0}));
 // Re-open final gzip and decode every surviving view. The only permitted deviations
 // are the three named geometric attributes; all other decoded bytes are identical.
 const check=read(output);assert.deepEqual(check.j.nodes,g.j.nodes);assert.deepEqual(check.j.materials,g.j.materials);assert.deepEqual(check.j.scenes,g.j.scenes);assert.equal(check.j.skins.length,g.j.skins.length);
 for(const oldId of vids){const after=decode(check,check.j.bufferViews[vid.get(oldId)]),before=baseline[oldId];const attrs=[...quantize].filter(([id])=>g.j.accessors[id].bufferView===oldId);if(!attrs.length)assert.deepEqual(after,before,`lossless buffer ${oldId}`);for(const [id,semantic]of attrs){const a=g.j.accessors[id],stride=g.j.bufferViews[oldId].byteStride||(a.type==='VEC3'?12:8),components=a.type==='VEC3'?3:2;for(let n=0;n<a.count;n++)for(let c=0;c<components;c++){const offset=(a.byteOffset||0)+n*stride+c*4;error[semantic]=Math.max(error[semantic],Math.abs(after.readFloatLE(offset)-before.readFloatLE(offset)));}}}
 for(const skin of g.j.skins)assert.deepEqual(check.j.skins[g.j.skins.indexOf(skin)].joints,skin.joints);
 const height=Math.max(...[...quantize].filter(([,s])=>s==='POSITION').map(([id])=>g.j.accessors[id].max[1]-g.j.accessors[id].min[1]));
 assert.ok(error.POSITION/height<.00005);assert.equal(check.j.meshes.reduce((sum,m)=>sum+m.primitives.length,0),g.j.meshes.reduce((sum,m)=>sum+m.primitives.length,0));
 report.push({hero,source,output,before:fs.statSync(source).size,after:fs.statSync(output).size,savedPercent:Math.round((1-fs.statSync(output).size/fs.statSync(source).size)*1000)/10,maximumComponentError:error,positionErrorOverHeight:error.POSITION/height,vertices:g.j.meshes.flatMap(m=>m.primitives.map(p=>g.j.accessors[p.attributes.POSITION].count)),triangles:g.j.meshes.flatMap(m=>m.primitives.map(p=>g.j.accessors[p.indices].count/3)),bones:g.j.skins.map(s=>s.joints.length),animations:(g.j.animations||[]).length,unreferencedViewsRemoved:g.j.bufferViews.length-check.j.bufferViews.length,unchanged:'indices, skin weights, joints, skeleton transforms, inverse binds, animations, materials, textures'});
}
fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/landing-model-verification-20261023.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
