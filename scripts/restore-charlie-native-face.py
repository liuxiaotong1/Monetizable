"""Use native Meshy head UVs on the original sculpt; retain costume and rig.
No portrait projection, new facial surface, billboard or mesh deformation.
Inputs are immutable original Meshy exports retained in outputs/.
"""
import copy,io,json,struct
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree
root=Path(__file__).resolve().parents[1]
def read(path):
 raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];return json.loads(raw[20:20+n]),bytearray(raw[28+n:])
g,b=read(root/'outputs/boss-fx-review/characters/supercharlie-playable.glb')
t,tb=read(root/'outputs/charlie-original-audit/charlie-native-retextured.glb')
def array(g,b,i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];w={'VEC2':2,'VEC3':3,'VEC4':4,'SCALAR':1}[a['type']];dt={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1'}[a['componentType']]
 return np.ndarray((a['count'],w),dt,b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dt).itemsize*w),np.dtype(dt).itemsize)).copy()
def accessor(a,kind,component=5126):
 while len(b)%4:b.append(0)
 raw=a.tobytes();v=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':len(b),'byteLength':len(raw)});b.extend(raw);rec={'bufferView':v,'componentType':component,'count':len(a),'type':kind}
 if kind=='VEC3':rec.update(min=a.min(0).tolist(),max=a.max(0).tolist())
 g['accessors'].append(rec);return len(g['accessors'])-1
p=g['meshes'][0]['primitives'][0];q=t['meshes'][0]['primitives'][0]
old=array(g,b,p['attributes']['POSITION']);pos=array(t,tb,q['attributes']['POSITION']);lo=pos.min(0);hi=pos.max(0);pos=(pos-(hi+lo)/2)*(1.7/(hi[1]-lo[1]));pos[:,1]+=.85
d,ix=cKDTree(old).query(pos);assert max(d)<.00001,max(d)
# Exact original vertex positions and skin influences; native exporter only split UV seams.
tri=array(g,b,p['indices']).reshape(-1,3);nt=array(t,tb,q['indices']).reshape(-1,3);head=(old[ix][nt].mean(1)[:,1]>1.495);body=(old[tri].mean(1)[:,1]<=1.495)
assert head.sum()+body.sum()==len(tri)
p['indices']=accessor(tri[body].astype('<u4').ravel(),'SCALAR',5125)
used=np.unique(nt[head]);remap=np.full(len(pos),-1,dtype=np.int64);remap[used]=np.arange(len(used));attrs={}
for k in ['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0']:
 a=old[ix][used] if k=='POSITION' else array(g,b,p['attributes'][k])[ix[used]] if k in ['JOINTS_0','WEIGHTS_0'] else array(t,tb,q['attributes'][k])[used]
 attrs[k]=accessor(a.astype('<u2' if k=='JOINTS_0' else '<f4'),'VEC2' if k=='TEXCOORD_0' else 'VEC4' if k in ['JOINTS_0','WEIGHTS_0'] else 'VEC3',5123 if k=='JOINTS_0' else 5126)
base=t['materials'][q.get('material',0)]['pbrMetallicRoughness']['baseColorTexture']['index'];im=t['images'][t['textures'][base]['source']];v=t['bufferViews'][im['bufferView']];raw=tb[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
# Preserve 4K native UV detail; encode web albedo without provider-sized JPEG overhead.
# Local color correction in the native UV atlas using original 3D coordinates.
# No photographic/reference image, projected portrait, or geometry modification.
tex=np.array(Image.open(io.BytesIO(raw)).convert('RGB'));height,width=tex.shape[:2];paint=tex.copy();positions=old[ix];coords=array(t,tb,q['attributes']['TEXCOORD_0'])
for triangle in nt[head]:
 points=positions[triangle];center=points.mean(0)
 if not (1.512<center[1]<1.576 and center[2]>.17):continue
 xy=coords[triangle]*[width-1,height-1];lo=np.maximum(np.floor(xy.min(0)).astype(int),0);hi=np.minimum(np.ceil(xy.max(0)).astype(int),[width-1,height-1]);A=np.vstack([xy.T,np.ones(3)])
 if (hi<lo).any() or abs(np.linalg.det(A))<1e-9:continue
 xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));weights=np.linalg.solve(A,np.stack([xx.ravel()+.5,yy.ravel()+.5,np.ones(xx.size)]));inside=weights.min(0)>=-.01;xs=xx.ravel()[inside];ys=yy.ravel()[inside];world=points.T@weights[:,inside];sample=tex[ys,xs].astype(float);color=sample.copy();x,y,z=world
 # Muted warm rose on the existing lip surfaces; retain native mouth shading.
 lip=np.exp(-((x+.038)/.016)**4-((y-1.5208)/.0023)**4)*.65
 lip*=np.clip((z-.18)/.02,0,1)
 color=color*(1-lip[:,None])+np.array([158,85,80])*lip[:,None]
 # Soften heavy eye makeup and the bright cyan iris without touching the brow/hair.
 eye=np.maximum(np.exp(-((x+.068)/.025)**6-((y-1.564)/.009)**6),np.exp(-((x-.001)/.022)**6-((y-1.561)/.009)**6))
 iris=(sample[:,1]>sample[:,0]*1.07)&(sample[:,2]>sample[:,0]*1.01)&(sample[:,0]<180)
 amount=eye*iris*.75;gray=sample@np.array([.299,.587,.114]);muted=gray[:,None]*.6+sample*.4
 color=color*(1-amount[:,None])+muted*amount[:,None]
 liner=(sample.max(1)<112)&(z>.19);soft=eye*liner*.65
 color=color*(1-soft[:,None])+np.array([112,85,69])*soft[:,None]
 paint[ys,xs]=np.clip(color,0,255).astype('uint8')
encoded=io.BytesIO();Image.fromarray(paint).save(encoded,format='JPEG',quality=93,subsampling=0);raw=encoded.getvalue()
while len(b)%4:b.append(0)
view=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':len(b),'byteLength':len(raw)});b+=raw
g['images'].append({'bufferView':view,'mimeType':im['mimeType'],'name':'Meshy native head albedo'});g['textures'].append({'source':len(g['images'])-1,'sampler':0})
g['materials'].append({'name':'CharlieNativeHead','pbrMetallicRoughness':{'baseColorTexture':{'index':len(g['textures'])-1},'metallicFactor':0,'roughnessFactor':.85},'doubleSided':True})
g['meshes'][0]['primitives'].append({'attributes':attrs,'indices':accessor(remap[nt[head]].astype('<u4').ravel(),'SCALAR',5125),'material':len(g['materials'])-1})
g.setdefault('asset',{})['extras']={'headRepair':'Native Meshy 7 retexture on the original 3D head topology. Original costume, skin weights and skeleton retained. No portrait overlay.'}
g['buffers']=[{'byteLength':len(b)}];js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);b+=b'\0'*(-len(b)%4)
raw=struct.pack('<III',0x46546c67,2,28+len(js)+len(b))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(b),0x004e4942)+b
(root/'public/heroes/supercharlie-playable.glb').write_bytes(raw)
print('Original body triangles:',int(body.sum()),'native head triangles:',int(head.sum()),'total unchanged:',len(tri),'max position difference:',max(d),'bytes:',len(raw))
