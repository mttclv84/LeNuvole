"""Genera le icone PWA placeholder (monogramma "LN" su sfondo accent).
Da sostituire con gli asset reali non appena Bea fornisce il logo definitivo.

Uso: python scripts/generate-placeholder-icons.py
Richiede Pillow (pip install pillow).
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ACCENT = (91, 127, 166)  # deve restare in sync con --accent in globals.css
TEXT = (255, 255, 255)

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def draw_icon(size: int, padding_ratio: float) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = int(size * padding_ratio)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=int(size * 0.22),
        fill=ACCENT,
    )

    label = "LN"
    font_size = int((size - 2 * pad) * 0.42)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except OSError:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1]),
        label,
        font=font,
        fill=TEXT,
    )
    return img


targets = [
    ("icon-192.png", 192, 0.06),
    ("icon-512.png", 512, 0.06),
    ("apple-touch-icon.png", 180, 0.06),
    ("maskable-512.png", 512, 0.16),  # più padding: safe-zone per icone maskable
]

for filename, size, pad in targets:
    icon = draw_icon(size, pad)
    icon.save(OUT_DIR / filename)
    print(f"scritto {OUT_DIR / filename}")
