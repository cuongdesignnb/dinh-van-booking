"""Extract image-only layers from the design reference.

The reference PNG is a flattened mockup: text and UI are baked into the photos.
This script crops each photo region and inpaints the baked text/UI so the DOM
can render real text on top. Output goes to public/images/dinh-van-booking/.
See docs/asset-audit.md for the limits of this approach.
"""
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "docs" / "reference" / "dinh-van-booking-reference.png"
OUT = ROOT / "public" / "images" / "dinh-van-booking"
OUT.mkdir(parents=True, exist_ok=True)

ref = cv2.imread(str(REF))


def crop(box):
    x0, y0, x1, y1 = box
    return ref[y0:y1, x0:x1].copy()


def text_mask(img, boxes, origin):
    """boxes: (x0,y0,x1,y1, mode) in reference coords; mode light|dark|full."""
    ox, oy = origin
    mask = np.zeros(img.shape[:2], np.uint8)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    for x0, y0, x1, y1, mode, *thr in boxes:
        sl = (slice(max(y0 - oy, 0), y1 - oy), slice(max(x0 - ox, 0), x1 - ox))
        if mode == "full":
            mask[sl] = 255
            continue
        g = gray[sl]
        s = hsv[sl][..., 1]
        if mode == "light":
            t = thr[0] if thr else 185
            m = (g > t) & (s < 70)
        else:
            t = thr[0] if thr else 150
            m = g < t
        mask[sl][m] = 255
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=2)
    return mask


def inpaint(img, mask, radius=6):
    return cv2.inpaint(img, mask, radius, cv2.INPAINT_TELEA)


def save(img, name, q=88):
    cv2.imwrite(str(OUT / name), img, [cv2.IMWRITE_WEBP_QUALITY, q])
    print("saved", name, img.shape[1], "x", img.shape[0])


# ---------- Hero ----------
HERO = (0, 50, 1448, 366)
hero = crop(HERO)
o = HERO[:2]
m = text_mask(
    hero,
    [
        (84, 66, 310, 120, "light", 170),
        (84, 116, 512, 206, "light", 165),
        (84, 196, 380, 242, "light", 165),
        (84, 238, 542, 276, "light", 160),
        (898, 148, 1046, 224, "light", 175),
    ],
    o,
)
hero = inpaint(hero, m, 7)
# Search bar region: rebuild by reflecting the rows above it, feathered.
sx0, sy0, sx1, sy1 = 68, 272 - 50, 854, 366 - 50
h = sy1 - sy0
src = hero[sy0 - h : sy0, sx0:sx1][::-1].astype(np.float32)
src = cv2.GaussianBlur(src, (0, 0), 1.2)
alpha = np.ones((h, sx1 - sx0), np.float32)
fe = 10
for i in range(fe):
    a = (i + 1) / (fe + 1)
    alpha[:, i] *= a
    alpha[:, -1 - i] *= a
    alpha[i, :] *= a
alpha = alpha[..., None]
dst = hero[sy0:sy1, sx0:sx1].astype(np.float32)
hero[sy0:sy1, sx0:sx1] = (src * alpha + dst * (1 - alpha)).astype(np.uint8)
save(hero, "hero-cuc-phuong.webp", 90)

# ---------- Stay cards (image band only) ----------
stays = {
    "stay-forest.webp": (37, 477, 301, 581),
    "stay-retreat.webp": (318, 477, 582, 581),
    "stay-eco-lodge.webp": (599, 477, 851, 581),
    "stay-moc-son.webp": (869, 477, 1120, 581),
}
for name, box in stays.items():
    img = crop(box)
    x1 = box[2]
    boxes = [(x1 - 32, 482, x1 - 4, 506, "light", 170)]  # baked heart
    if name == "stay-forest.webp":
        boxes.append((42, 484, 116, 508, "full"))  # baked "Bán chạy" badge
    img = inpaint(img, text_mask(img, boxes, box[:2]), 5)
    save(img, name)

# ---------- Experience promo panel ----------
PROMO = (1140, 428, 1415, 699)
promo = crop(PROMO)
m = text_mask(
    promo,
    [
        (1150, 440, 1350, 512, "dark", 150),
        (1152, 512, 1322, 566, "dark", 175),
        (1156, 568, 1292, 603, "full"),
        (1148, 640, 1322, 696, "dark", 150),
    ],
    PROMO[:2],
)
save(inpaint(promo, m, 7), "experience-promo.webp")

# ---------- Personal contact panel ----------
CONTACT = (909, 824, 1415, 987)
contact = crop(CONTACT)
m = text_mask(
    contact,
    [
        (924, 834, 1170, 880, "dark", 140),
        (924, 876, 1172, 908, "dark", 160),
        (934, 906, 1216, 958, "full"),
        (934, 952, 1200, 984, "full"),
        (1312, 832, 1412, 878, "dark", 140),
    ],
    CONTACT[:2],
)
save(inpaint(contact, m, 7), "advisor-panel.webp")

# ---------- Destinations ----------
dest = {
    "destination-cuc-phuong.webp": (37, 863, 200, 943),
    "destination-yen-quang.webp": (207, 863, 367, 943),
    "destination-dong-nguoi-xua.webp": (375, 863, 536, 943),
    "destination-trang-an.webp": (543, 863, 707, 943),
    "destination-am-thuc.webp": (714, 863, 890, 943),
}
for name, box in dest.items():
    save(crop(box), name)

# ---------- Testimonial avatar ----------
av = crop((953, 739, 1015, 801))
save(av, "testimonial-avatar.webp", 92)
