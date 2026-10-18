"""Refine original Charlie's face visibility; preserve rig, UVs and costume.
Source: the approved Monetizable concept and the existing playable model.
"""
import io,json,struct
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
root=Path(__file__).resolve().parents[1]
b=(root/'outputs/charlie-face-fix/charlie-before.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);data=bytearray(b[28+n:])
def arr(i,copy=True):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];w={'VEC2':2,'VEC3':3,'VEC4':4,'SCALAR':1}[a['type']];dt={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']];x=np.ndarray((a['count'],w),dt,data,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dt).itemsize*w),np.dtype(dt).itemsize));return x.copy() if copy else x
p=g['meshes'][0]['primitives'][0];pos=arr(p['attributes']['POSITION']);uv=arr(p['attributes']['TEXCOORD_0']);tri=arr(p['indices']).reshape(-1,3)
# Rebuild only the forward facial shell and clear fringe across the eyes.
centers=pos[tri].mean(1)
face=((centers[:,0]+.032)/.073)**2+((centers[:,1]-1.56)/.065)**2<1
trim=face&(centers[:,1]>1.505)&(centers[:,1]<1.599)&(centers[:,2]>.196)
def append(raw,target=None):
 while len(data)%4:data.append(0)
 view={'buffer':0,'byteOffset':len(data),'byteLength':len(raw)}
 if target:view['target']=target
 g['bufferViews'].append(view);data.extend(raw);return len(g['bufferViews'])-1
def accessor(values,kind,component):
 values=np.ascontiguousarray(values);view=append(values.tobytes(),34963 if kind=='SCALAR' else 34962);record={'bufferView':view,'componentType':component,'count':len(values),'type':kind}
 if kind=='VEC3':record.update(min=values.min(0).astype(float).tolist(),max=values.max(0).astype(float).tolist())
 g['accessors'].append(record);return len(g['accessors'])-1
kept=tri[~trim].astype('<u4').ravel();index=g['accessors'][p['indices']];view=g['bufferViews'][index['bufferView']];offset=view.get('byteOffset',0)+index.get('byteOffset',0);raw=kept.tobytes();data[offset:offset+len(raw)]=raw;index['count']=len(kept);index['min']=[int(kept.min())];index['max']=[int(kept.max())]
# Curved face surface follows the existing head dimensions; it is skinned to
# the real head bone, not a billboard, and retains nose/cheek depth.
vertices=[];coords=[];N=40;M=48
for row in range(M+1):
 y=1.503+row/M*.113
 for col in range(N+1):
  u=col/N;v=row/M;x=-.032+(u-.5)*.146
  z=.20+.027*np.sqrt(max(0,1-((y-1.565)/.073)**2))-.026*((x+.032)/.073)**2
  z+=.014*np.exp(-((x+.032)/.014)**2-((y-1.551)/.012)**2)
  vertices.append([x,y,z]);coords.append([(500+(x+.032)*1000-416)/168,(123+(1.566-y)*1027-72)/132])
vertices=np.array(vertices,dtype='<f4');coords=np.array(coords,dtype='<f4');faces=[]
for row in range(M):
 for col in range(N):
  a=row*(N+1)+col;b=a+1;c=a+N+1;d=c+1;faces.extend([[a,b,d],[a,d,c]])
faces=np.array(faces,dtype='<u4');normals=np.zeros_like(vertices)
for t in faces:
 normal=np.cross(vertices[t[1]]-vertices[t[0]],vertices[t[2]]-vertices[t[0]])
 for i in t:normals[i]+=normal
normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-9)
# Original approved portrait with a feathered skin-only oval in face UV space.
ref=Image.open(root/'outputs/boss-fx-review/characters/supercharlie-model-reference.png').convert('RGB').crop((416,72,584,204)).resize((672,528),Image.Resampling.LANCZOS)
rgba=np.array(ref.convert('RGBA'));yy,xx=np.mgrid[:528,:672];sx=416+xx/4;sy=72+yy/4
px=(sx-500)/1000;py=1.566-(sy-123)/1027
ellipse=(px/.071)**2+((py-1.56)/.063)**2
outline=[(443,112),(452,95),(480,82),(526,82),(550,105),(561,129),(550,157),(529,180),(502,192),(475,180),(451,157),(440,133)]
mask=Image.new('L',(672,528));ImageDraw.Draw(mask).polygon([((x-416)*4,(y-72)*4) for x,y in outline],fill=255);mask=mask.filter(ImageFilter.GaussianBlur(2))
rgba[:,:,3]=(np.clip((1-ellipse)/.07,0,1)*np.array(mask)).astype('uint8')
image=io.BytesIO();Image.fromarray(rgba).save(image,format='PNG');imageView=append(image.getvalue());g['images'].append({'bufferView':imageView,'mimeType':'image/png','name':'Charlie facial details'});g['textures'].append({'source':len(g['images'])-1});texture=len(g['textures'])-1
mat={'name':'CharlieFace','pbrMetallicRoughness':{'baseColorTexture':{'index':texture},'metallicFactor':0,'roughnessFactor':.85},'emissiveTexture':{'index':texture},'emissiveFactor':[.12,.12,.12],'alphaMode':'BLEND','doubleSided':True}
g['materials'].append(mat)
joint=next(i for i,node in enumerate(g['skins'][0]['joints']) if g['nodes'][node].get('name','').replace('mixamorig','').replace(':','')=='Head')
joints=np.zeros((len(vertices),4),dtype='<u2');joints[:,0]=joint;weights=np.zeros((len(vertices),4),dtype='<f4');weights[:,0]=1
primitive={'attributes':{'POSITION':accessor(vertices,'VEC3',5126),'NORMAL':accessor(normals,'VEC3',5126),'TEXCOORD_0':accessor(coords,'VEC2',5126),'JOINTS_0':accessor(joints,'VEC4',5123),'WEIGHTS_0':accessor(weights,'VEC4',5126)},'indices':accessor(faces.ravel(),'SCALAR',5125),'material':len(g['materials'])-1}
g['meshes'][0]['primitives'].append(primitive);g['buffers'][0]['byteLength']=len(data)
print('Face shell vertices:',len(vertices),'occluding facial triangles replaced:',int(trim.sum()))
js=json.dumps(g,separators=(',',':')).encode();js+=b' '*(-len(js)%4);data+=b'\0'*(-len(data)%4)
out=struct.pack('<III',0x46546c67,2,28+len(js)+len(data))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(data),0x004e4942)+data
(root/'public/heroes/supercharlie-playable.glb').write_bytes(out)
