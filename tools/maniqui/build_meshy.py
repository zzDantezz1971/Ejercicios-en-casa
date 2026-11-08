"""Maniquí de la app (desde noviembre de 2026): cuerpo anatómico creado por el usuario con Meshy AI,
con el esqueleto puesto por este script.
Entrada: v.npy / f.npy = malla del GLB escalada a las unidades del maniquí (altura ~147, pies en y=-68.7,
centrada en x) y reducida a 30000 caras (pyfqmr). Salida: skin_meshy.json -> public/maniqui.json."""
import numpy as np, json, base64
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
v=np.load('v.npy').astype(np.float64); f=np.load('f.npy').astype(np.int64)
# quitar vértices sin usar
used=np.unique(f); remap=-np.ones(len(v),int); remap[used]=np.arange(len(used)); v=v[used]; f=remap[f]
n=len(v)
J={}
for s,sx in (('L',1),('R',-1)):
    J['sho'+s]=(17.5*sx,47.0,-4.0); J['el'+s]=(19.0*sx,20.0,-3.5); J['wr'+s]=(19.3*sx,-0.5,0.0); J['fing'+s]=(18.5*sx,-13.0,0.3)
    J['hip'+s]=(8.5*sx,3.0,0.5); J['kn'+s]=(6.2*sx,-30.0,-1.5); J['an'+s]=(4.6*sx,-59.0,-3.5); J['toe'+s]=(5.2*sx,-66.5,12.0)
rest={'hips':[(0,4.0,-1.5),(0,30.0,-1.5)],'chest':[(0,30.0,-1.5),(0,57.0,-2.0)],'head':[(0,57.0,-2.0),(0,74.0,-1.5)]}
for s in 'LR':
    rest['ua'+s]=[J['sho'+s],J['el'+s]]; rest['fa'+s]=[J['el'+s],J['wr'+s]]; rest['hand'+s]=[J['wr'+s],J['fing'+s]]
    rest['th'+s]=[J['hip'+s],J['kn'+s]]; rest['sh'+s]=[J['kn'+s],J['an'+s]]; rest['foot'+s]=[J['an'+s],J['toe'+s]]
bones=["hips","chest","head","uaL","faL","handL","thL","shL","footL","uaR","faR","handR","thR","shR","footR"]
# distancia de cada vértice a cada hueso
def segdist(p,a,b):
    a=np.array(a);b=np.array(b);ab=b-a;t=np.clip(((p-a)@ab)/(ab@ab),0,1);return np.linalg.norm(p-(a+t[:,None]*ab),axis=1),t
D=np.stack([segdist(v,*rest[b])[0] for b in bones],1)
# semillas: vértices más cercanos a cada hueso (parte central) que no están más cerca de otro hueso
seeds=[];lab=[]
for k,b in enumerate(bones):
    d,t=segdist(v,*rest[b])
    ok=(D.argmin(1)==k)&(t>0.15)&(t<0.85)
    cand=np.where(ok)[0]
    if len(cand)==0: cand=np.where(D.argmin(1)==k)[0]
    pick=cand[np.argsort(d[cand])[:max(20,len(cand)//4)]]
    seeds+=list(pick);lab+=[k]*len(pick)
seeds=np.array(seeds);lab=np.array(lab)
# grafo de aristas
e=np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]);w=np.linalg.norm(v[e[:,0]]-v[e[:,1]],axis=1)
G=coo_matrix((np.concatenate([w,w]),(np.concatenate([e[:,0],e[:,1]]),np.concatenate([e[:,1],e[:,0]]))),shape=(n,n)).tocsr()
dist,pred,src=dijkstra(G,indices=seeds,min_only=True,return_predecessors=True)
lbl=np.full(n,-1);ok=src>=0
idx_of={s:i for i,s in enumerate(seeds)}
lbl[ok]=lab[np.searchsorted(seeds[np.argsort(seeds)],src[ok]) if False else [idx_of[s] for s in src[ok]]]
lbl[~ok]=D[~ok].argmin(1)
# reglas: lado por el signo de x y separación brazo / tronco (el brazo está pegado al costado)
ax=np.abs(v[:,0]); y=v[:,1]
armTest=np.where(y<46, ax>14.6, (ax-14.6)>0.6*(y-46))
torso=[bones.index(b) for b in ('hips','chest','head')]
armB={bones.index(b) for b in ('uaL','faL','handL','uaR','faR','handR')}
for i in range(n):
    b=lbl[i]
    if b in armB and not armTest[i]:
        lbl[i]=torso[int(np.argmin(D[i,torso]))]
    elif b in torso and armTest[i] and y[i]>-14 and y[i]<52:
        s_=('L' if v[i,0]>0 else 'R'); cand=[bones.index(x+s_) for x in ('ua','fa','hand')]
        lbl[i]=cand[int(np.argmin(D[i,cand]))]
    nm=bones[lbl[i]]
    if nm[-1] in 'LR':
        want='L' if v[i,0]>0 else 'R'
        if nm[-1]!=want: lbl[i]=bones.index(nm[:-1]+want)
# muslo / pierna: por la altura respecto a la rodilla (la corva no se queda en el muslo)
for s_ in 'LR':
    th=bones.index('th'+s_);sh=bones.index('sh'+s_)
    m=np.isin(lbl,[th,sh])
    kn=np.array(J['kn'+s_]);hp=np.array(J['hip'+s_]);d=(kn-hp)/np.linalg.norm(kn-hp)
    below=((v-kn)@d)>0
    lbl[m&below]=sh;lbl[m&~below]=th
# pesos: one-hot suavizado sobre la malla (mezcla en las articulaciones)
W=np.zeros((n,len(bones)));W[np.arange(n),lbl]=1
deg=np.asarray(G.astype(bool).sum(1)).ravel()
A=G.astype(bool).astype(float)
W0=W.copy()
for it in range(12): W=0.5*W+0.5*(A@W)/deg[:,None]
# solo se mezclan pesos cerca de las articulaciones; el resto, hueso único
joints=[(J['shoL'],8),(J['shoR'],8),(J['elL'],7),(J['elR'],7),(J['wrL'],4),(J['wrR'],4),(J['hipL'],9),(J['hipR'],9),
        (J['knL'],9),(J['knR'],9),(J['anL'],5),(J['anR'],5),((0,30.0,-1.5),10),((0,57.0,-2.0),6),((0,4.0,-1.5),8)]
near=np.zeros(n,bool)
for c,r in joints: near|=np.linalg.norm(v-np.array(c),axis=1)<r
# no mezclar brazo con tronco por el costado (solo en el hombro)
W[~near]=W0[~near]
side=(~armTest)&(y<44)
for k in armB: W[side,k]=0
# piernas: sin mezcla entre la izquierda y la derecha (los pies están pegados)
legL=[bones.index(b) for b in ('thL','shL','footL')];legR=[bones.index(b) for b in ('thR','shR','footR')]
isL=np.isin(lbl,legL);isR=np.isin(lbl,legR)
for k in legR: W[isL,k]=0
for k in legL: W[isR,k]=0
W/=W.sum(1,keepdims=True)
# cortar la malla entre las dos piernas: las caras que mezclan pierna izq. y der. se quedan en un lado
mirror=[bones.index(b[:-1]+('R' if b[-1]=='L' else 'L')) if b[-1] in 'LR' else k for k,b in enumerate(bones)]
grp=np.where(isL,1,np.where(isR,2,0))
newv=[];newW=[];newl=[];dup={}
for fi in range(len(f)):
    g=grp[f[fi]]
    if (g==1).any() and (g==2).any() and v[f[fi],1].max()<-20:
        maj=1 if (g==1).sum()>=(g==2).sum() else 2
        for c in range(3):
            vi=f[fi,c]
            if grp[vi]==3-maj:
                if vi not in dup:
                    dup[vi]=n+len(newv);newv.append(v[vi]);newW.append(W[vi][mirror]);newl.append(mirror[lbl[vi]])
                f[fi,c]=dup[vi]
print('dup',len(dup))
if newv:
    v=np.vstack([v,np.array(newv)]);W=np.vstack([W,np.array(newW)]);lbl=np.concatenate([lbl,np.array(newl)]);n=len(v)
top=np.argsort(-W,1)[:,:4];tw=np.take_along_axis(W,top,1);tw/=tw.sum(1,keepdims=True)
sw=np.round(tw*255).astype(int);sw[:,0]+=255-sw.sum(1)
part=np.zeros(n,np.uint8)
pm={'uaL':1,'faL':1,'uaR':2,'faR':2,'thL':3,'shL':3,'thR':4,'shR':4,'footL':5,'footR':5,'handL':6,'handR':6}
for k,b in enumerate(bones):
    if b in pm: part[lbl==k]=pm[b]
part[(v[:,1]<-60.5)&((part==3)|(part==4))]=5
print('parts',np.bincount(part), 'n',n)
b64=lambda a: base64.b64encode(a.tobytes()).decode()
out={'license':'Modelo propio (Meshy AI)','bones':bones,'rest':{k:[list(map(float,p)) for p in rv] for k,rv in rest.items()},
 'eyes':{'L':[2.5,68,4.0],'R':[-2.5,68,4.0]},'eyeRadius':0.0001,'noBulk':True,
 'count':int(n),'pos':b64(v.astype(np.float32)),'idx':b64(f.astype(np.uint16)),'si':b64(top.astype(np.uint8)),'sw':b64(sw.astype(np.uint8)),
 'reg':b64(np.zeros(n,np.uint8)),'part':b64(part),
 'clothes':{'collarY':55.0,'waistY':8.0,'sleeve':0.42,'shorts':0.24,'sock':0.9,'shoeTop':-10000.0,'shortsT':0.26}}
json.dump(out,open('skin_meshy.json','w'))
import os;print('size',os.path.getsize('skin_meshy.json'))
