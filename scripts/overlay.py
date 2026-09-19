"""Blend the reference with a screenshot (50/50) and emit a diff heat map."""
import sys
from PIL import Image, ImageChops

ref = Image.open(sys.argv[1]).convert('RGB')
act = Image.open(sys.argv[2]).convert('RGB').crop((0, 0, *ref.size))
out = sys.argv[3]
Image.blend(ref, act, 0.5).save(out + '-overlay.png')
ImageChops.difference(ref, act).convert('L').point(lambda v: min(255, v * 3)).save(out + '-diff.png')
if len(sys.argv) > 4:
    x0, y0, x1, y1 = map(int, sys.argv[4].split(','))
    w, h = x1 - x0, y1 - y0
    c = Image.new('RGB', (w, h * 2 + 6), 'red')
    c.paste(ref.crop((x0, y0, x1, y1)), (0, 0))
    c.paste(act.crop((x0, y0, x1, y1)), (0, h + 6))
    c.save(out + '-compare.png')
