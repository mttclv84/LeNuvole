"""Genera le icone PWA dal monogramma di Brand Manual Le Nuvole
(triangolo rosso + "N" bianca su fondo nero di brand, vedi manuale p.14/22).
Font reale del logo (Metropolis) non disponibile: qui si usa il grassetto di
sistema solo per la "N", accettabile per un'icona così piccola.

Uso: python scripts/generate-placeholder-icons.py
Richiede Pillow (pip install pillow).
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Devono restare in sync con le variabili --brand-* in globals.css
BRAND_BLACK = (29, 29, 27)
BRAND_RED = (250, 87, 87)
WHITE = (255, 255, 255)

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def draw_icon(size: int, safe_zone_ratio: float, rounded: bool) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if rounded:
        draw.rounded_rectangle([0, 0, size, size], radius=int(size * 0.22), fill=BRAND_BLACK)
    else:
        # Icone maskable: sfondo a piena tela, il sistema applica la propria maschera.
        draw.rectangle([0, 0, size, size], fill=BRAND_BLACK)

    content = size * safe_zone_ratio
    cx = size / 2

    # Triangolo rivolto verso il basso.
    tri_w = content * 0.34
    tri_h = tri_w * 0.8
    tri_top = size / 2 - content * 0.32
    draw.polygon(
        [
            (cx - tri_w / 2, tri_top),
            (cx + tri_w / 2, tri_top),
            (cx, tri_top + tri_h),
        ],
        fill=BRAND_RED,
    )

    label = "N"
    font_size = int(content * 0.52)
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except OSError:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    text_top = tri_top + tri_h + content * 0.06
    draw.text((cx - tw / 2 - bbox[0], text_top - bbox[1]), label, font=font, fill=WHITE)

    return img


targets = [
    ("icon-192.png", 192, 0.62, True),
    ("icon-512.png", 512, 0.62, True),
    ("apple-touch-icon.png", 180, 0.62, True),
    ("maskable-512.png", 512, 0.5, False),  # più margine: safe-zone per icone maskable
]

for filename, size, safe_zone, rounded in targets:
    icon = draw_icon(size, safe_zone, rounded)
    icon.save(OUT_DIR / filename)
    print(f"scritto {OUT_DIR / filename}")
