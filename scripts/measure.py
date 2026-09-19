"""Print non-background runs along rows/columns of a reference PNG.
Usage: python scripts/measure.py <png> y=530 x=150 [thr=235]"""
import sys
import numpy as np
from PIL import Image

a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
thr = 235
for arg in sys.argv[2:]:
    if arg.startswith('thr='):
        thr = int(arg[4:])
for arg in sys.argv[2:]:
    k, v = arg.split('=')
    if k == 'thr':
        continue
    v = int(v)
    line = a[v, :, :] if k == 'y' else a[:, v, :]
    on = line.min(axis=1) < thr
    runs, s = [], None
    for i, b in enumerate(on):
        if b and s is None:
            s = i
        if not b and s is not None:
            if i - s > 6:
                runs.append((s, i - 1))
            s = None
    if s is not None:
        runs.append((s, len(on) - 1))
    print(f'{k}={v}', runs)
