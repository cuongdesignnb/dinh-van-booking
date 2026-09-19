"""Tile a tall full-page mobile screenshot into side-by-side columns for review."""
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
col_h = int(sys.argv[3]) if len(sys.argv) > 3 else 1800
im = Image.open(src)
w, h = im.size
cols = (h + col_h - 1) // col_h
sheet = Image.new('RGB', (cols * (w + 10), col_h), 'white')
for i in range(cols):
    sheet.paste(im.crop((0, i * col_h, w, min(h, (i + 1) * col_h))), (i * (w + 10), 0))
sheet.save(out)
