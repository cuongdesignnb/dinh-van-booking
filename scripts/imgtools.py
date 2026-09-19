"""Shared helpers for cutting clean image layers out of the flattened mockups."""
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REF_DIR = ROOT / "docs" / "reference"
OUT = ROOT / "public" / "images" / "dinh-van-booking"


def load(name):
    img = cv2.imread(str(REF_DIR / name))
    if img is None:
        raise FileNotFoundError(name)
    return img


def mask_for(img, origin, boxes):
    """boxes: (x0, y0, x1, y1, mode[, threshold]) in reference coordinates.

    mode: 'full' masks the whole box, 'light' masks bright low-saturation pixels
    (white text), 'dark' masks pixels darker than the threshold (dark text/pins).
    """
    ox, oy = origin
    h, w = img.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    for x0, y0, x1, y1, mode, *thr in boxes:
        sy = slice(max(y0 - oy, 0), max(min(y1 - oy, h), 0))
        sx = slice(max(x0 - ox, 0), max(min(x1 - ox, w), 0))
        if mode == "full":
            mask[sy, sx] = 255
            continue
        g = gray[sy, sx]
        if mode == "light":
            t = thr[0] if thr else 185
            m = (g > t) & (hsv[sy, sx][..., 1] < 70)
        else:
            t = thr[0] if thr else 150
            m = g < t
        mask[sy, sx][m] = 255
    return cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=2)


def clean(img, origin, boxes, radius=7):
    if not boxes:
        return img
    return cv2.inpaint(img, mask_for(img, origin, boxes), radius, cv2.INPAINT_TELEA)


def reflect_fill(img, origin, box, feather=10):
    """Replace a box with the mirrored rows directly above it (for UI bars that
    covered the bottom of a photo)."""
    ox, oy = origin
    x0, y0, x1, y1 = box[0] - ox, box[1] - oy, box[2] - ox, box[3] - oy
    h = y1 - y0
    src = img[max(y0 - h, 0):y0, x0:x1][::-1].astype(np.float32)
    if src.shape[0] < h:
        src = np.concatenate([src, np.repeat(src[-1:], h - src.shape[0], 0)])
    src = cv2.GaussianBlur(src, (0, 0), 1.2)
    alpha = np.ones((h, x1 - x0), np.float32)
    for i in range(feather):
        a = (i + 1) / (feather + 1)
        alpha[:, i] *= a
        alpha[:, -1 - i] *= a
        alpha[i, :] *= a
    alpha = alpha[..., None]
    dst = img[y0:y1, x0:x1].astype(np.float32)
    img[y0:y1, x0:x1] = (src * alpha + dst * (1 - alpha)).astype(np.uint8)
    return img


def save(img, rel, q=88):
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), img, [cv2.IMWRITE_WEBP_QUALITY, q])
    print("saved", rel, img.shape[1], "x", img.shape[0])


def cut(ref, name, box, boxes=(), radius=7, q=88, reflect=None, fills=()):
    x0, y0, x1, y1 = box
    img = ref[y0:y1, x0:x1].copy()
    img = clean(img, (x0, y0), list(boxes), radius)
    for f in fills:
        img = soft_fill(img, (x0, y0), f)
    if reflect:
        img = reflect_fill(img, (x0, y0), reflect)
    save(img, name, q)
    return img


def heart(x1, y0):
    """Baked-in favourite heart at the top-right of a card image."""
    return (x1 - 32, y0 + 3, x1 - 3, y0 + 30, "light", 170)


def soft_fill(img, origin, box, feather=12):
    """Fill a box with a per-column gradient between the rows just above and
    below it, feathered into the surroundings. Used where inpainting would drag
    in dark neighbouring pixels (e.g. a button next to a person)."""
    ox, oy = origin
    x0, y0, x1, y1 = box[0] - ox, box[1] - oy, box[2] - ox, box[3] - oy
    h, w = img.shape[:2]
    top = img[max(y0 - 1, 0), x0:x1].astype(np.float32)
    bot = img[min(y1, h - 1), x0:x1].astype(np.float32)
    t = np.linspace(0, 1, y1 - y0, dtype=np.float32)[:, None, None]
    fill = top[None] * (1 - t) + bot[None] * t
    fill = cv2.GaussianBlur(fill, (0, 0), 3)
    alpha = np.ones((y1 - y0, x1 - x0), np.float32)
    for i in range(feather):
        a = (i + 1) / (feather + 1)
        alpha[:, -1 - i] *= a
    alpha = alpha[..., None]
    region = img[y0:y1, x0:x1].astype(np.float32)
    img[y0:y1, x0:x1] = (fill * alpha + region * (1 - alpha)).astype(np.uint8)
    return img
