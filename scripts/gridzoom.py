"""Zoom a region of a reference with a coordinate ruler (for measuring)."""
import sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
box = tuple(int(v) for v in sys.argv[3].split(','))
sc = int(sys.argv[4]) if len(sys.argv) > 4 else 2
im = Image.open(src).convert('RGB')
c = im.crop(box).resize(((box[2] - box[0]) * sc, (box[3] - box[1]) * sc))
d = ImageDraw.Draw(c)
for x in range(box[0] - box[0] % 20, box[2], 20):
    X = (x - box[0]) * sc
    d.line([(X, 0), (X, 8 if x % 100 else 16)], fill='red')
    if x % 100 == 0:
        d.text((X + 2, 16), str(x), fill='red')
for y in range(box[1] - box[1] % 20, box[3], 20):
    Y = (y - box[1]) * sc
    d.line([(0, Y), (8 if y % 100 else 16, Y)], fill='blue')
    d.text((18, Y - 5), str(y), fill='blue')
c.save(out)
