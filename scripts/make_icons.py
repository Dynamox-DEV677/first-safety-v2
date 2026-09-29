"""Generate PWA icons for First Safety.
Design: white square, black ring (a clock face), one red hand at the 15-minute mark.
Colours: white #FFFFFF, black #111111, red #D3202F. No gradients, no shadows.
"""
from PIL import Image, ImageDraw

WHITE = (255, 255, 255, 255)
BLACK = (17, 17, 17, 255)
RED = (211, 32, 47, 255)

def draw_icon(size: int, pad_ratio: float) -> Image.Image:
    ss = 4  # supersample for crisp anti-aliased edges
    S = size * ss
    img = Image.new("RGBA", (S, S), WHITE)
    d = ImageDraw.Draw(img)
    pad = S * pad_ratio
    cx = cy = S / 2
    r = (S / 2) - pad
    stroke = max(int(S * 0.055), 1)
    # clock ring
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=BLACK, width=stroke)
    # red minute hand to the 15-minute mark (3 o'clock)
    hand_len = r * 0.72
    hand_w = max(int(S * 0.06), 1)
    d.line([(cx, cy), (cx + hand_len, cy)], fill=RED, width=hand_w)
    # rounded cap on the hand end + centre pivot
    d.ellipse([cx + hand_len - hand_w / 2, cy - hand_w / 2, cx + hand_len + hand_w / 2, cy + hand_w / 2], fill=RED)
    piv = hand_w * 0.9
    d.ellipse([cx - piv, cy - piv, cx + piv, cy + piv], fill=RED)
    return img.resize((size, size), Image.LANCZOS)

draw_icon(192, 0.14).save("public/icon-192.png", optimize=True)
draw_icon(512, 0.14).save("public/icon-512.png", optimize=True)
draw_icon(512, 0.22).save("public/icon-maskable-512.png", optimize=True)  # extra safe zone for maskable
draw_icon(180, 0.14).save("public/apple-touch-icon.png", optimize=True)
print("icons written")
