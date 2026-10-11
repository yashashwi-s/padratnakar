"""Extract the eight original sakhi drawings from the committed scan.

Preserve ink and remove paper shading plus adjacent scan typography. Crop boxes
are physical source coordinates multiplied by three. No generated imagery.
Run with the corpus PyMuPDF dependency; outputs are deterministic PNGs/metadata.
"""
import fitz,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent;pdf=fitz.open(root/'source/booklet.pdf')
items=[('lalita','ललिता',16,[770,235,1120,730],3,10),('vishakha','विशाखा',16,[145,665,446,1165],11,18),('chitra','चित्रा',16,[825,1140,1070,1605],19,26),('indulekha','इन्दुलेखा',17,[710,200,1020,695],1,8),('champakalata','चम्पकलता',17,[35,658,343,1150],9,16),('rangadevi','रंगदेवी',17,[695,1150,951,1585],17,24),('tungavidya','तुङ्गविद्या',18,[123,152,446,677],1,8),('sudevi','सुदेवी',18,[745,625,1075,1170],9,16)]
result=[]
for slug,name,page,bbox,first,last in items:
 pix=pdf[page-1].get_pixmap(matrix=fitz.Matrix(3,3),clip=fitz.Rect(*[v/3 for v in bbox]),colorspace=fitz.csRGB)
 rgba=bytearray()
 samples=pix.samples
 for i in range(0,len(samples),3):
  gray=sum(samples[i:i+3])/3
  alpha=max(0,min(255,round((185-gray)*255/85)))
  rgba.extend((0,0,0,alpha))
 from collections import deque
 w,h=pix.width,pix.height
 seen=bytearray(w*h);components=[]
 for seed in range(w*h):
  if seen[seed] or rgba[seed*4+3]<64:continue
  q=deque([seed]);seen[seed]=1;size=0;x0=w;y0=h;x1=0;y1=0
  while q:
   at=q.popleft();x=at%w;y=at//w;size+=1;x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
   for yy in range(max(0,y-1),min(h,y+2)):
    for xx in range(max(0,x-1),min(w,x+2)):
     n=yy*w+xx
     if not seen[n] and rgba[n*4+3]>=64:seen[n]=1;q.append(n)
  components.append((size,x0,y0,x1,y1))
 largest=max(components);_,x0,y0,x1,y1=largest
 # Include nearby disconnected ink of the drawing, excluding scan typography.
 for size,a0,b0,a1,b1 in components:
  if size>600 and b1-b0>(largest[4]-largest[2])*.12 and a0<=x1+12 and a1>=x0-12 and b0<=y1+12 and b1>=y0-12:
   x0=min(x0,a0);x1=max(x1,a1);y0=min(y0,b0);y1=max(y1,b1)
 x0=max(0,x0-8);y0=max(0,y0-8);x1=min(w-1,x1+8);y1=min(h-1,y1+8)
 for y in range(h):
  for x in range(w):
   if x<x0 or x>x1 or y<y0 or y>y1:rgba[(y*w+x)*4+3]=0
  cropped=b''.join(rgba[(y*w+x0)*4:(y*w+x1+1)*4] for y in range(y0,y1+1))
 clean=fitz.Pixmap(fitz.csRGB,x1-x0+1,y1-y0+1,cropped,True)
 edge=[rgba[(y*w+x)*4+3] for x,y in ([(x,0)for x in range(w)]+[(x,h-1)for x in range(w)]+[(0,y)for y in range(h)]+[(w-1,y)for y in range(h)])]
 assert not any(a>128 for a in edge), f'{slug}: widen the source crop before exporting'
 clean.save(root/f'art/{slug}.png')
 result.append({'id':slug,'name':name,'sourcePage':page,'sourceCropBbox':bbox,'sourceBbox':[bbox[0]+x0,bbox[1]+y0,bbox[0]+x1+1,bbox[1]+y1+1],'coordinateScale':3,'sha256':hashlib.sha256((root/f'art/{slug}.png').read_bytes()).hexdigest(),'firstLineIndex':first,'lastLineIndex':last})
(root/'illustrations.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
