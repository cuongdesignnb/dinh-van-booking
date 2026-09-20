"""Detect near-white card rectangles in a reference PNG and print their boxes.
Usage: python scripts/cards.py <png> [minw=60] [minh=30]"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
minw = int(sys.argv[2]) if len(sys.argv) > 2 else 60
minh = int(sys.argv[3]) if len(sys.argv) > 3 else 30
white = (a.min(axis=2) > 248)
lab, n = ndimage.label(ndimage.binary_closing(white, np.ones((3, 3))))
boxes = []
for sl in ndimage.find_objects(lab):
    y, x = sl
    w, h = x.stop - x.start, y.stop - y.start
    if w >= minw and h >= minh and white[sl].mean() > 0.55:
        boxes.append((x.start, y.start, w, h))
for b in sorted(boxes, key=lambda b: (b[1] // 8, b[0])):
    print(f'x={b[0]:4d} y={b[1]:4d} w={b[2]:4d} h={b[3]:4d}  (right={b[0]+b[2]}, bottom={b[1]+b[3]})')
