"""Extract image layers for the six inner pages from docs/reference/0X-*.png.

Usage: python scripts/extract-pages.py [01 02 ...]
Each reference is a flattened mockup, so text/UI baked into photos is removed
with inpainting. See docs/asset-audit.md for what could not be cleaned.
"""
import sys

from imgtools import cut, heart, load

SCREENS = {}


def screen(key):
    def deco(fn):
        SCREENS[key] = fn
        return fn

    return deco


@screen("01")
def phong_nghi():
    r = load("01-phong-nghi.png")
    cut(
        r,
        "pages/stays-hero.webp",
        (0, 50, 1448, 262),
        [
            (80, 58, 245, 92, "full"),
            (86, 90, 545, 137, "light", 150),
            (90, 136, 600, 168, "light", 150),
            (88, 170, 645, 212, "light", 140),
            (700, 96, 852, 190, "light", 160),
            (1244, 76, 1408, 200, "dark", 110),
        ],
        q=90,
        reflect=(40, 210, 1405, 262),
    )
    cols = [(262, 469), (483, 688), (701, 903), (916, 1120)]
    slugs = [
        ["cuc-phuong-forest-homestay", "an-nhien-retreat", "cuc-phuong-eco-lodge", "moc-son-homestay"],
        ["nha-san-cuc-phuong", "cuc-phuong-bungalow", "green-valley-homestay", "trang-an-nature-lodge"],
    ]
    for row, (y0, y1) in enumerate([(327, 426), (592, 692)]):
        for (x0, x1), slug in zip(cols, slugs[row]):
            boxes = [heart(x1, y0)]
            if slug == "cuc-phuong-forest-homestay":
                boxes.append((264, 330, 333, 356, "full"))
            cut(r, f"stays/{slug}.webp", (x0 + 1, y0, x1, y1), boxes, radius=5)
    cut(
        r,
        "pages/map-stays.webp",
        (1142, 327, 1408, 519),
        [
            (1142, 327, 1408, 519, "dark", 105),
            (1234, 350, 1384, 400, "full"),
            (1280, 474, 1404, 514, "full"),
            (1235, 440, 1320, 470, "dark", 150),
        ],
    )
    cut(
        r,
        "pages/advisor-stays.webp",
        (1137, 540, 1413, 736),
        [
            (1140, 546, 1280, 604, "dark", 140),
        ],
        fills=[(1137, 604, 1290, 735)],
    )
    for i, x in enumerate([549, 744, 953]):
        cut(r, f"people/review-stays-{i + 1}.webp", (x, 876, x + 46, 922))


@screen("02")
def chi_tiet_phong():
    r = load("02-chi-tiet-phong.png")
    cut(
        r,
        "detail/forest-main.webp",
        (46, 88, 575, 406),
        [(50, 318, 258, 400, "light", 175), (436, 364, 572, 402, "full")],
        radius=6,
        q=90,
    )
    cut(r, "detail/forest-1.webp", (582, 88, 773, 195))
    cut(r, "detail/forest-2.webp", (582, 200, 773, 294))
    cut(r, "detail/forest-3.webp", (582, 299, 773, 406), [(652, 326, 708, 356, "light", 190)], radius=5)
    cut(r, "rooms/standard-garden.webp", (46, 621, 280, 702))
    cut(r, "rooms/deluxe-mountain-view.webp", (291, 621, 526, 702), [(294, 624, 360, 646, "full")], radius=5)
    cut(r, "rooms/bungalow-family.webp", (537, 621, 771, 702))
    for slug, x0, x1 in [
        ("vuon-quoc-gia-cuc-phuong", 805, 947),
        ("ho-yen-quang", 952, 1095),
        ("dong-nguoi-xua", 1101, 1258),
        ("trung-tam-cuu-ho-linh-truong", 1263, 1407),
    ]:
        cut(r, f"nearby/{slug}.webp", (x0, 799, x1, 851))
    cut(r, "people/host-anh-nam.webp", (804, 272, 876, 344))
    cut(r, "people/advisor-support.webp", (1077, 895, 1152, 1013))
    for i, x in enumerate([50, 292, 542]):
        cut(r, f"people/review-detail-{i + 1}.webp", (x, 880, x + 35, 915))
    photos = [
        [(52, 100), (104, 156), (159, 216)],
        [(293, 345), (348, 400), (404, 457)],
        [(543, 596), (599, 658), (661, 717)],
    ]
    for i, row in enumerate(photos):
        for j, (x0, x1) in enumerate(row):
            cut(r, f"reviews/r{i + 1}-{j + 1}.webp", (x0, 967, x1, 1000))


@screen("03")
def combo():
    r = load("03-combo-du-lich.png")
    cut(
        r,
        "pages/combo-hero.webp",
        (0, 50, 1448, 222),
        [
            (60, 84, 695, 127, "light", 150),
            (62, 126, 645, 172, "light", 150),
            (62, 170, 632, 212, "light", 140),
            (918, 118, 1128, 208, "light", 165),
        ],
        q=90,
    )
    cols = [(37, 257), (270, 489), (501, 720), (730, 949), (962, 1177), (1190, 1410)]
    slugs = [
        "kham-pha-rung-cuc-phuong",
        "trang-an-bai-dinh",
        "cuc-phuong-eco-retreat",
        "ninh-binh-tron-ven",
        "ky-nghi-gia-dinh-xanh",
        "team-building-ninh-binh",
    ]
    for (x0, x1), slug in zip(cols, slugs):
        boxes = [
            (x0 + 10, 358, x0 + 125, 390, "full"),
            (x1 - 34, 355, x1 - 4, 385, "light", 170),
        ]
        cut(r, f"combos/{slug}.webp", (x0 + 1, 350, x1, 476), boxes, radius=6)
    for i, x in enumerate([47, 352, 655]):
        cut(r, f"people/review-combo-{i + 1}.webp", (x, 897, x + 55, 952))


@screen("04")
def diem_den():
    r = load("04-diem-den.png")
    cut(
        r,
        "pages/destinations-hero.webp",
        (0, 50, 1448, 278),
        [
            (70, 56, 190, 80, "light", 150),
            (68, 92, 372, 132, "light", 150),
            (72, 132, 545, 180, "light", 150),
            (72, 180, 548, 220, "light", 140),
            (72, 226, 520, 266, "light", 135),
            (74, 228, 112, 264, "full"),
            (1228, 92, 1418, 202, "light", 165),
        ],
        q=90,
    )
    cols = [(36, 259), (272, 494), (508, 716), (730, 938), (952, 1172), (1186, 1410)]
    ids = [
        "vuon-quoc-gia-cuc-phuong",
        "ho-yen-quang",
        "dong-nguoi-xua",
        "trang-an",
        "hang-mua",
        "am-thuc-ninh-binh",
    ]
    for (x0, x1), slug in zip(cols, ids):
        boxes = [(x0 + 4, 486, x0 + 92, 510, "full"), (x1 - 34, 395, x1 - 4, 424, "light", 170)]
        cut(r, f"destinations/{slug}.webp", (x0 + 1, 393, x1, 509), boxes, radius=6)
    cut(r, "pages/itinerary-photo.webp", (368, 780, 498, 893))
    for name, box in {
        "xuan": (536, 728, 703, 799),
        "he": (711, 728, 873, 799),
        "thu": (536, 854, 703, 925),
        "dong": (711, 854, 873, 925),
    }.items():
        cut(r, f"seasons/{name}.webp", box)
    cut(
        r,
        "pages/map-destinations.webp",
        (905, 724, 1400, 866),
        [
            (905, 724, 1400, 866, "dark", 110),
            (1150, 760, 1400, 866, "dark", 150),
            (1255, 736, 1300, 770, "dark", 140),
            (1150, 830, 1200, 850, "full"),
        ],
    )
    cut(r, "people/advisor-note.webp", (1312, 880, 1414, 990))


@screen("05")
def lien_he():
    r = load("05-lien-he.png")
    cut(
        r,
        "pages/contact-hero.webp",
        (0, 50, 1448, 300),
        [
            (86, 66, 240, 114, "light", 150),
            (90, 110, 510, 192, "light", 150),
            (92, 194, 555, 236, "light", 140),
            (95, 240, 790, 292, "light", 150),
            (96, 244, 142, 288, "full"),
            (296, 244, 342, 288, "full"),
            (512, 244, 558, 288, "full"),
            (742, 120, 948, 245, "light", 165),
        ],
        q=90,
    )
    cut(r, "people/advisor-profile.webp", (583, 492, 700, 627))
    cut(
        r,
        "pages/map-contact.webp",
        (948, 559, 1404, 812),
        [
            (948, 559, 1404, 812, "dark", 105),
            (1168, 628, 1312, 698, "full"),
            (1142, 630, 1182, 680, "full"),
            (1310, 648, 1362, 676, "full"),
            (1076, 684, 1142, 704, "dark", 150),
            (1284, 576, 1356, 600, "dark", 150),
            (1346, 686, 1408, 740, "dark", 150),
            (986, 588, 1076, 624, "dark", 150),
            (966, 736, 1172, 812, "dark", 160),
        ],
    )
    cut(
        r,
        "pages/contact-scenic.webp",
        (947, 830, 1412, 990),
        [(990, 870, 1225, 945, "light", 170), (1150, 935, 1410, 985, "full"), (1150, 940, 1180, 975, "light", 170)],
    )


@screen("06")
def dat_phong():
    r = load("06-dat-phong.png")
    cut(
        r,
        "pages/checkout-hero.webp",
        (0, 50, 1448, 188),
        [
            (80, 80, 648, 125, "light", 150),
            (84, 124, 560, 150, "light", 140),
            (84, 150, 520, 186, "light", 150),
            (930, 96, 1110, 172, "light", 165),
            (1302, 80, 1410, 168, "dark", 100),
        ],
        q=90,
    )
    cut(r, "pages/checkout-stay.webp", (941, 273, 1347, 392), [(946, 280, 1115, 308, "full")], radius=7)
    for slug, x0, x1 in [
        ("breakfast", 102, 297),
        ("airport-transfer", 309, 494),
        ("forest-tour", 505, 699),
        ("bike-rental", 709, 896),
    ]:
        cut(r, f"addons/{slug}.webp", (x0, 527, x1, 607), [(x0 + 1, 530, x0 + 28, 556, "full")], radius=6)


if __name__ == "__main__":
    keys = sys.argv[1:] or sorted(SCREENS)
    for k in keys:
        SCREENS[k]()
