"""Generate public/og-card.png, the 1200x630 social share card (og:image / twitter:image).

    python og_card.py

Rerun after a branding change or a new budget.json. The year, entity, stage and the
receipt's bar lengths come from public/budget.json; nothing is typed in. Fonts download
from the Google Fonts repo at run time; the seal and wordmark are this repo's own copies.
Needs Pillow (installed with pdfplumber).
"""
import io
import json
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
BUDGET = ROOT / "public" / "budget.json"
BADGE = ROOT / "public" / "wpr-typewriter-badge.png"
WORDMARK = ROOT / "public" / "wpr-wordmark.png"
OUT = ROOT / "public" / "og-card.png"

FRAUNCES = "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf"
PUBLIC_SANS = "https://raw.githubusercontent.com/google/fonts/main/ofl/publicsans/PublicSans%5Bwght%5D.ttf"

W, H = 1200, 630
TEAL_DARK = (43, 101, 93)
TEAL = (58, 134, 124)
CREAM = (246, 242, 233)
RULE = (207, 198, 179)
INK = (26, 26, 26)
KICKER = (242, 215, 160)
DEK = (232, 241, 238)
OCHRE_TINT = (248, 235, 211)
OCHRE_TEXT = (122, 79, 14)

# Same wording as src/labels.js; a stage without a line stops the run.
STATUS = {"proposed": "Mayor’s proposed budget · not yet adopted"}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as r:
        return r.read()


def font(data, size, **axes):
    """A variable font at the given axis values (e.g. wght=600, opsz=144); other axes stay at default."""
    f = ImageFont.truetype(io.BytesIO(data), size)
    names = [a["name"].decode() if isinstance(a["name"], bytes) else a["name"] for a in f.get_variation_axes()]
    values = []
    for name, axis in zip(names, f.get_variation_axes()):
        key = {"Weight": "wght", "Optical size": "opsz"}.get(name, name)
        values.append(axes.get(key, axis["default"]))
    f.set_variation_by_axes(values)
    return f


def tracked(d, xy, text, f, fill, tracking):
    """Letter-spaced text (Pillow has no tracking); returns the end x."""
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tracking
    return x - tracking


def levy_shares(b):
    """Each fund's and tax increment's share of the full budget-year levy, largest first."""
    lf = b["levy_by_fund"]
    i = lf["years"].index(b["meta"]["years"]["budget"])
    amounts = [f["values"][i] for f in lf["funds"]] + [lf["tax_increment"][i]]
    return sorted((a / lf["total"][i] for a in amounts if a > 0), reverse=True)


def receipt(shares, year, sans, serif):
    """A cream receipt with one teal bar per levy slice, drawn to scale. Returned as RGBA."""
    rw, rh, pad = 340, 466, 30
    r = Image.new("RGBA", (rw, rh + 14), (0, 0, 0, 0))
    d = ImageDraw.Draw(r)
    # Body with a torn (zigzag) bottom edge.
    tooth = 14
    edge = [(rw, rh)] + [(x, rh + (tooth if (x // tooth) % 2 else 0)) for x in range(rw, -1, -tooth)] + [(0, rh)]
    d.polygon([(0, 0), (rw, 0)] + edge, fill=CREAM + (255,))

    tracked(d, (pad, 30), "YOUR CITY TAX BILL", font(sans, 17, wght=700), INK, 2.4)
    d.text((pad, 56), str(year), font=serif["year"], fill=INK)
    d.rectangle([pad, 128, rw - pad, 131], fill=INK)

    bar_max = rw - pad * 2
    stubs = [150, 112, 176, 96, 84, 190, 128]  # stand-ins for printed labels
    y = 152
    for s, stub in zip(shares, stubs):
        d.rounded_rectangle([pad, y, pad + stub, y + 6], radius=3, fill=RULE)
        d.rectangle([pad, y + 15, pad + bar_max, y + 25], fill=(237, 230, 214))
        d.rounded_rectangle([pad, y + 15, pad + max(6, round(bar_max * s / shares[0])), y + 25], radius=4, fill=TEAL)
        y += 38
    d.rectangle([pad, y + 4, rw - pad, y + 6], fill=INK)
    d.rounded_rectangle([pad, y + 20, pad + 80, y + 28], radius=3, fill=INK)
    d.rounded_rectangle([rw - pad - 96, y + 18, rw - pad, y + 30], radius=3, fill=INK)
    return r


def main():
    b = json.loads(BUDGET.read_text(encoding="utf-8"))
    meta = b["meta"]
    if meta["stage"] not in STATUS:
        raise ValueError(f"no status line for budget stage {meta['stage']!r}")
    year = meta["years"]["budget"]

    serif_data, sans_data = fetch(FRAUNCES), fetch(PUBLIC_SANS)
    serif = {"year": font(serif_data, 54, wght=600, opsz=144)}

    img = Image.new("RGB", (W, H), TEAL_DARK)
    d = ImageDraw.Draw(img)
    # Newspaper thick-over-thin rule across the top.
    d.rectangle([0, 0, W, 9], fill=CREAM)
    d.rectangle([0, 15, W, 16], fill=CREAM)

    # Receipt, tilted, with a soft shadow, on the right.
    rc = receipt(levy_shares(b), year, sans_data, serif).rotate(4, expand=True, resample=Image.BICUBIC)
    shadow = Image.new("RGBA", rc.size, (0, 0, 0, 0))
    shadow.putalpha(rc.getchannel("A").point(lambda a: 90 if a else 0))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    rx, ry = 768, 64
    img.paste((10, 40, 36), (rx + 10, ry + 16), shadow)
    img.paste(rc, (rx, ry), rc)

    # Left column: kicker, title, status, dek.
    x = 72
    tracked(d, (x, 74), f"FOLLOW THE MONEY · {meta['entity'].upper()}", font(sans_data, 22, wght=700), KICKER, 3.2)
    head = font(serif_data, 100, wght=600, opsz=144)
    d.text((x - 4, 112), "Wausau’s", font=head, fill="white")
    d.text((x - 4, 220), f"{year} budget", font=head, fill="white")

    pill_font = font(sans_data, 22, wght=700)
    label = STATUS[meta["stage"]]
    pw = d.textlength(label, font=pill_font)
    d.rounded_rectangle([x, 358, x + pw + 44, 398], radius=5, fill=OCHRE_TINT)
    d.ellipse([x + 14, 373, x + 24, 383], fill=(201, 146, 46))
    d.text((x + 32, 364), label, font=pill_font, fill=OCHRE_TEXT)

    dek = font(sans_data, 27, wght=400)
    d.text((x, 420), "What the city’s share of your tax bill pays for,", font=dek, fill=DEK)
    d.text((x, 456), "and what each department asked for and got.", font=dek, fill=DEK)

    # WPR seal + wordmark on a white chip, bottom left.
    seal = Image.open(BADGE).convert("RGBA").resize((58, 58), Image.LANCZOS)
    mask = Image.new("L", seal.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, 57, 57], fill=255)
    mark = Image.open(WORDMARK).convert("RGBA")
    mh = 30
    mark = mark.resize((round(mark.width * mh / mark.height), mh), Image.LANCZOS)
    cw, ch = 16 + 58 + 14 + mark.width + 20, 76
    cy = H - ch - 40
    d.rounded_rectangle([x, cy, x + cw, cy + ch], radius=10, fill="white")
    img.paste(seal, (x + 16, cy + 9), mask)
    img.paste(mark, (x + 16 + 58 + 14, cy + (ch - mh) // 2), mark)

    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
