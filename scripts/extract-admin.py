"""Extract the image layers used by the admin screens from docs/reference/admin-*.png.

Usage: python scripts/extract-admin.py
Like the public extractor, the sources are flattened mockups: text baked into a
photo is removed with inpainting, so the results are reconstructions, not clean
source assets. See docs/admin/asset-audit.md.
"""
from imgtools import cut, load

A = load("admin-A-tong-quan.png")
C = load("admin-C-phong-nghi.png")
D = load("admin-D-combo-du-lich.png")
F = load("admin-F-khach-hang.png")

# The sidebar photo of the mockup carries a hand-written note and a quote baked
# into it, so the admin reuses the clean forest photo of the public site
# (public/images/dinh-van-booking/hero-cuc-phuong.webp) instead.

# Topbar avatar of the (illustrated) administrator.
cut(A, "people/admin-avatar.webp", (1236, 24, 1284, 72))

# Customer portraits are NOT extracted: the faces in the mockups are illustrations
# and the UI shows initials instead. Property thumbnails come from the public
# image set, so nothing else needs cutting here.

print("done")
