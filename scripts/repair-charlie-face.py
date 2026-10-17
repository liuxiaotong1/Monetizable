"""Reproject the approved original portrait onto facial UV triangles only.
Retains geometry, rig, skin weights, all original non-face texels and PBR maps.
Source is the original generated Monetizable concept, not a third-party face.
Run with the bundled Python runtime (numpy, Pillow).
"""
import io,json,struct
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=root/'outputs/boss-fx-review/characters/supercharlie-playable.glb'
b=source.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);data=bytearray(b[28+n:])
def array(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];w={'VEC2':2,'VEC3':3,'VEC4':4,'SCALAR':1}[a['type']];dt={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']]
 return np.ndarray((a['count'],w),dt,data,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dt).itemsize*w),np.dtype(dt).itemsize)).copy()
p=g['meshes'][0]['primitives'][0];pos=array(p['attributes']['POSITION']);uv=array(p['attributes']['TEXCOORD_0']);indices=array(p['indices']).reshape(-1,3)
v=g['bufferViews'][g['images'][0]['bufferView']];tex=Image.open(io.BytesIO(data[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]));original=np.array(tex.convert('RGB'));out=original.copy();h,w=out.shape[:2]
portrait=np.array(Image.open(root/'outputs/boss-fx-review/characters/supercharlie-model-reference.png').convert('RGB'))
changed=0
for t in indices:
 points=pos[t]
 if points[:,1].min()<1.50 or points[:,1].max()>1.62 or points[:,2].min()<.19:continue
 xy=uv[t]*[w-1,h-1];lo=np.maximum(np.floor(xy.min(0)).astype(int),0);hi=np.minimum(np.ceil(xy.max(0)).astype(int),[w-1,h-1])
 if (hi<lo).any():continue
 xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));A=np.vstack([xy.T,np.ones(3)])
 if abs(np.linalg.det(A))<1e-9:continue
 weights=np.linalg.solve(A,np.stack([xx.ravel()+.5,yy.ravel()+.5,np.ones(xx.size)]));inside=weights.min(0)>=-.015;x=xx.ravel()[inside];y=yy.ravel()[inside];q=points.T@weights[:,inside]
 # Match original portrait's eyes/nose/mouth to the mesh's facial landmarks.
 sx=500+(q[0]+.032)*1000;sy=123+(1.566-q[1])*1027
 ix=np.clip(sx.astype(int),0,portrait.shape[1]-1);iy=np.clip(sy.astype(int),0,portrait.shape[0]-1);sample=portrait[iy,ix];old=original[y,x].astype(float)
 # Only skin-facing texels: never paint across the hair or costume islands.
 skin=(old[:,0]>110)&(old[:,0]>old[:,2]*1.06)&(old[:,1]>old[:,2]*1.015)
 edge=np.clip((.075-np.abs(q[0]+.032))/.015,0,1)*np.clip((q[1]-1.505)/.015,0,1)*np.clip((1.62-q[1])/.018,0,1)
 blend=(edge*skin*.94)[:,None];out[y,x]=(old*(1-blend)+sample*blend).astype('uint8');changed+=int((blend[:,0]>.1).sum())
assert changed>1000,changed
encoded=io.BytesIO();Image.fromarray(out).save(encoded,format='JPEG',quality=97,subsampling=0);raw=encoded.getvalue()
while len(data)%4:data.append(0)
v['byteOffset']=len(data);v['byteLength']=len(raw);data+=raw;g['images'][0]['mimeType']='image/jpeg';g['buffers'][0]['byteLength']=len(data)
g.setdefault('asset',{})['extras']={'faceRepair':'Original Monetizable portrait reprojected to face UVs; skeleton and animation preserved.'}
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);data+=b'\0'*(-len(data)%4)
result=struct.pack('<III',0x46546c67,2,28+len(js)+len(data))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(data),0x004e4942)+data
(root/'public/heroes/supercharlie-playable.glb').write_bytes(result)
print('Reprojected facial texels:',changed,'GLB bytes:',len(result))
