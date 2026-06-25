from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
PNG_PATH = ROOT / "chart-sparkline-kit-overview.png"
PNG_STATES_PATH = ROOT / "chart-sparkline-kit-states-a11y.png"
PDF_PATH = ROOT / "chart-sparkline-kit.pdf"
REPORT_PATH = ROOT / "quality-report.json"

W, H = 1600, 900
FONT_DIR = Path("C:/Windows/Fonts")

COLORS = {
    "page": "#F6F8FB",
    "paper": "#FFFFFF",
    "ink": "#101827",
    "muted": "#475569",
    "line": "#CBD5E1",
    "soft": "#E2E8F0",
    "app": "#0A0A0F",
    "panel": "#17171F",
    "panel2": "#111827",
    "border": "#27272A",
    "app_text": "#E4E4E7",
    "app_muted": "#A1A1AA",
    "green": "#22C55E",
    "green_pale": "#86EFAC",
    "sky_pale": "#7DD3FC",
    "amber_pale": "#FDE68A",
    "warning": "#92400E",
}


def font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont:
    names = {
        "regular": "segoeui.ttf",
        "semibold": "seguisb.ttf",
        "bold": "segoeuib.ttf",
        "black": "seguibl.ttf",
        "mono": "consola.ttf",
    }
    return ImageFont.truetype(str(FONT_DIR / names[weight]), size)


F = {
    "tiny": font(13, "semibold"),
    "small": font(15, "semibold"),
    "body": font(19),
    "body_bold": font(19, "bold"),
    "h3": font(24, "bold"),
    "h2": font(38, "bold"),
    "h1": font(54, "black"),
    "mono": font(15, "mono"),
}


def draw_round(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text_size(draw, text: str, ft):
    box = draw.textbbox((0, 0), text, font=ft)
    return box[2] - box[0], box[3] - box[1]


def center_text(draw, box, text, ft, fill):
    x1, y1, x2, y2 = box
    tw, th = text_size(draw, text, ft)
    draw.text((x1 + (x2 - x1 - tw) / 2, y1 + (y2 - y1 - th) / 2 - 2), text, font=ft, fill=fill)


def wrapped_text(draw, xy, text, ft, fill, max_width, line_gap=6, max_lines=None):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if text_size(draw, candidate, ft)[0] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(".") + "..."
    x, y = xy
    ascent, descent = ft.getmetrics()
    line_h = ascent + descent + line_gap
    for line in lines:
        draw.text((x, y), line, font=ft, fill=fill)
        y += line_h
    return y


def brand(draw):
    draw_round(draw, (64, 52, 98, 86), 10, COLORS["green"])
    center_text(draw, (64, 52, 98, 86), "S", font(19, "black"), "#03150A")
    draw.text((110, 57), "StreamPay Chart / Sparkline Kit", font=font(21, "bold"), fill=COLORS["ink"])
    draw.text((1282, 59), "UI/UX handoff only", font=font(18, "semibold"), fill=COLORS["muted"])


def chip(draw, x, y, text, fill="#FFFFFF", outline=COLORS["line"], color="#334155"):
    tw, _ = text_size(draw, text, F["tiny"])
    draw_round(draw, (x, y, x + tw + 24, y + 32), 16, fill, outline)
    center_text(draw, (x, y, x + tw + 24, y + 32), text, F["tiny"], color)
    return x + tw + 34


def dashed_line(draw, xy, fill, width=3, dash=12, gap=8):
    x1, y1, x2, y2 = xy
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy)
    if length == 0:
        return
    ux, uy = dx / length, dy / length
    pos = 0
    while pos < length:
        end = min(pos + dash, length)
        draw.line((x1 + ux * pos, y1 + uy * pos, x1 + ux * end, y1 + uy * end), fill=fill, width=width)
        pos += dash + gap


def dotted_line(draw, xy, fill, width=3, gap=9):
    x1, y1, x2, y2 = xy
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy)
    if length == 0:
        return
    ux, uy = dx / length, dy / length
    pos = 0
    while pos <= length:
        x = x1 + ux * pos
        y = y1 + uy * pos
        draw.ellipse((x - width, y - width, x + width, y + width), fill=fill)
        pos += gap


def draw_chart(draw, x, y, w, h):
    draw_round(draw, (x, y, x + w, y + h), 22, COLORS["panel"], COLORS["border"])
    draw.text((x + 24, y + 22), "Remaining funds over time", font=F["h3"], fill="#FFFFFF")
    draw.text((x + 24, y + 58), "Estimate updates after wallet and chain-observed activity refresh.", font=font(16), fill=COLORS["app_muted"])
    draw.text((x + w - 190, y + 26), "1,200 XLM", font=font(30, "black"), fill="#FFFFFF")
    draw.text((x + w - 190, y + 64), "available now", font=font(14, "semibold"), fill=COLORS["app_muted"])

    cx, cy, cw, ch = x + 54, y + 118, w - 100, 190
    for i in range(4):
        yy = cy + i * (ch // 3)
        draw.line((cx, yy, cx + cw, yy), fill="#334155", width=1)
    draw.line((cx, cy + ch, cx + cw, cy + ch), fill="#64748B", width=2)

    remaining = [(cx, cy + 18), (cx + 120, cy + 50), (cx + 250, cy + 92), (cx + 400, cy + 132), (cx + 520, cy + 174), (cx + cw, cy + 206)]
    accrual = [(cx, cy + 204), (cx + 130, cy + 168), (cx + 270, cy + 126), (cx + 420, cy + 82), (cx + 540, cy + 44), (cx + cw, cy + 22)]
    draw.line(accrual, fill=COLORS["sky_pale"], width=3, joint="curve")
    for a, b in zip(remaining, remaining[1:]):
        dashed_line(draw, (*a, *b), COLORS["green_pale"], width=3, dash=12, gap=8)
    dotted_line(draw, (cx, cy + 170, cx + cw, cy + 170), COLORS["amber_pale"], width=3, gap=12)
    draw.ellipse((remaining[-1][0] - 6, remaining[-1][1] - 6, remaining[-1][0] + 6, remaining[-1][1] + 6), fill=COLORS["green_pale"])

    labels = [("May 01", cx), ("Today", cx + 330), ("Jun 18?", cx + cw - 48)]
    for label, lx in labels:
        draw.text((lx, cy + ch + 18), label, font=font(13, "semibold"), fill=COLORS["app_muted"])

    ly = y + h - 54
    draw.line((x + 26, ly, x + 58, ly), fill=COLORS["sky_pale"], width=3)
    draw.text((x + 68, ly - 9), "Accrued", font=font(14, "semibold"), fill=COLORS["app_text"])
    dashed_line(draw, (x + 170, ly, x + 202, ly), COLORS["green_pale"], width=3)
    draw.text((x + 212, ly - 9), "Remaining", font=font(14, "semibold"), fill=COLORS["app_text"])
    dotted_line(draw, (x + 338, ly, x + 370, ly), COLORS["amber_pale"], width=3)
    draw.text((x + 380, ly - 9), "Review threshold", font=font(14, "semibold"), fill=COLORS["app_text"])

    draw_round(draw, (x + w - 275, y + h - 76, x + w - 24, y + h - 28), 14, "#2A210F", "#F59E0B")
    draw.text((x + w - 255, y + h - 62), "Pending chain inclusion", font=font(14, "bold"), fill=COLORS["amber_pale"])


def draw_mobile(draw, x, y, w, h):
    draw_round(draw, (x, y, x + w, y + h), 22, COLORS["paper"], COLORS["line"])
    draw.text((x + 20, y + 18), "Mobile sparkline", font=F["h3"], fill=COLORS["ink"])
    draw.text((x + 20, y + 54), "Latest value + one helper line; no trading view.", font=font(16), fill=COLORS["muted"])
    draw.text((x + 20, y + 104), "640 XLM", font=font(36, "black"), fill=COLORS["ink"])
    draw.text((x + 20, y + 148), "may need review around Jun 18", font=font(16), fill=COLORS["muted"])
    sx, sy = x + 20, y + 205
    points = [(sx, sy + 24), (sx + 64, sy + 34), (sx + 128, sy + 48), (sx + 202, sy + 70), (sx + 280, sy + 86)]
    for a, b in zip(points, points[1:]):
        dashed_line(draw, (*a, *b), COLORS["green"], width=2, dash=8, gap=7)
    draw.ellipse((points[-1][0] - 5, points[-1][1] - 5, points[-1][0] + 5, points[-1][1] + 5), fill=COLORS["green"])
    chip(draw, x + 20, y + h - 52, "Table fallback", fill="#ECFDF5", outline="#86EFAC", color="#14532D")


def draw_table(draw, x, y, w, h):
    draw_round(draw, (x, y, x + w, y + h), 22, COLORS["paper"], COLORS["line"])
    draw.text((x + 20, y + 18), "A11y table fallback", font=F["h3"], fill=COLORS["ink"])
    headers = ["Date", "Remaining", "Accrued", "Status"]
    col = [120, 140, 110, 150]
    tx, ty = x + 20, y + 70
    draw.rectangle((tx, ty, tx + sum(col), ty + 38), fill="#111827")
    cx = tx
    for i, header in enumerate(headers):
        draw.text((cx + 10, ty + 11), header, font=font(13, "bold"), fill="#FFFFFF")
        cx += col[i]
    rows = [
        ("May 01", "1,200 XLM", "0 XLM", "Active"),
        ("May 15", "640 XLM", "560 XLM", "Active"),
        ("Jun 01", "120 XLM", "1,080 XLM", "Review soon"),
    ]
    ry = ty + 38
    for row in rows:
        cx = tx
        for i, cell in enumerate(row):
            draw.rectangle((cx, ry, cx + col[i], ry + 42), fill="#FFFFFF", outline=COLORS["soft"])
            draw.text((cx + 10, ry + 12), cell, font=font(13), fill=COLORS["ink"])
            cx += col[i]
        ry += 42
    wrapped_text(draw, (x + 20, y + h - 80), "Annotate in Figma: chart data must be available through a semantic table or aria-described summary in implementation.", font(15), COLORS["muted"], w - 44, line_gap=4, max_lines=3)


def draw_edge_states(draw, x, y, w, h):
    draw_round(draw, (x, y, x + w, y + h), 22, COLORS["paper"], COLORS["line"])
    draw.text((x + 20, y + 18), "Edge states", font=F["h3"], fill=COLORS["ink"])
    states = [
        ("Empty", "Not enough stream activity to chart yet."),
        ("1-point", "Show one labelled point; no trend line."),
        ("Loading", "Skeleton follows final chart bounds."),
        ("Error", "Retry with human-readable copy."),
    ]
    yy = y + 70
    for title, body in states:
        draw_round(draw, (x + 20, yy, x + w - 20, yy + 58), 14, "#F8FAFC", COLORS["soft"])
        draw.text((x + 38, yy + 12), title, font=font(16, "bold"), fill=COLORS["ink"])
        wrapped_text(draw, (x + 150, yy + 12), body, font(15), COLORS["muted"], max(80, w - 190), line_gap=3, max_lines=2)
        yy += 70


def draw_deferred(draw, x, y, w, h):
    draw_round(draw, (x, y, x + w, y + h), 22, "#FFF7ED", "#FDBA74", 2)
    draw.text((x + 22, y + 20), "Deferred for MVP", font=F["h3"], fill="#7C2D12")
    wrapped_text(draw, (x + 22, y + 62), "Use this Figma frame if remaining-funds or time-to-empty is not committed for v1.", font(17), "#7C2D12", w - 44, line_gap=5)
    wrapped_text(draw, (x + 22, y + h - 68), "Rationale: needs product-approved data source and lifecycle semantics.", font(14, "bold"), "#7C2D12", w - 44, line_gap=3, max_lines=3)


def build_overview():
    img = Image.new("RGB", (W, H), COLORS["page"])
    draw = ImageDraw.Draw(img)
    brand(draw)
    draw.text((64, 132), "Lightweight balance burn-down and sparkline style", font=font(48, "black"), fill=COLORS["ink"])
    wrapped_text(draw, (64, 196), "A Figma-ready kit for Stream detail when product supports remaining funds or time-to-depletion. Low-clutter fintech clarity, cautious chain-state language, and no trading-view behavior.", font(22), COLORS["muted"], 1240, line_gap=8)
    cx = 64
    for item in ["max 3 pale colors", "color + dash patterns", "no 3D", "mobile sparkline", "pending inclusion annotation"]:
        cx = chip(draw, cx, 282, item)

    draw_chart(draw, 64, 350, 920, 432)
    draw_mobile(draw, 1028, 350, 420, 432)
    draw_round(draw, (64, 804, 1448, 836), 16, "#ECFDF5", "#86EFAC")
    draw.text((84, 812), "Figma note: pair every chart with table fallback annotation; do not expose Stellar price conversion in v1.", font=font(15, "bold"), fill="#14532D")

    draw.text((64, 858), "Not in scope: D3/chart code, Stellar price conversion, trading-chart interactions, or guarantees about chain finality.", font=font(13, "semibold"), fill="#64748B")
    return img


def build_states():
    img = Image.new("RGB", (W, H), COLORS["page"])
    draw = ImageDraw.Draw(img)
    brand(draw)
    draw.text((64, 132), "States, accessibility fallback, and deferred frame", font=font(48, "black"), fill=COLORS["ink"])
    wrapped_text(draw, (64, 196), "Use this page as the Figma handoff companion for edge cases, mobile behavior, and product TBD decisions.", font(22), COLORS["muted"], 1120, line_gap=8)
    draw_table(draw, 64, 292, 600, 420)
    draw_edge_states(draw, 704, 292, 420, 420)
    draw_deferred(draw, 1164, 292, 372, 188)
    draw_round(draw, (1164, 506, 1536, 790), 22, COLORS["paper"], COLORS["line"])
    draw.text((1188, 532), "Mobile behavior", font=F["h3"], fill=COLORS["ink"])
    mobile_notes = [
        "Prefer compact sparkline and latest value.",
        "Allow horizontal scroll if full chart is required.",
        "Keep expand/table/retry targets at least 44 x 44 px.",
        "No animated draw-on line by default.",
    ]
    yy = 578
    for note in mobile_notes:
        draw.ellipse((1188, yy + 7, 1198, yy + 17), fill=COLORS["green"])
        yy = wrapped_text(draw, (1212, yy), note, font(16), COLORS["muted"], 290, line_gap=4, max_lines=2) + 10
    draw.text((64, 858), "Design crit required: one product stakeholder + one engineering stakeholder. Implementation remains separate frontend backlog work.", font=font(13, "semibold"), fill="#64748B")
    return img


def rel_luminance(hex_color: str) -> float:
    value = hex_color.lstrip("#")
    channels = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    corrected = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * corrected[0] + 0.7152 * corrected[1] + 0.0722 * corrected[2]


def contrast(fg: str, bg: str) -> float:
    a, b = rel_luminance(fg), rel_luminance(bg)
    light, dark = max(a, b), min(a, b)
    return (light + 0.05) / (dark + 0.05)


def inspect(img: Image.Image) -> dict:
    small = img.resize((80, 45))
    colors = small.getcolors(maxcolors=80 * 45)
    return {
        "width": img.width,
        "height": img.height,
        "sampledUniqueColors": len(colors or []),
        "nonBlank": len(colors or []) > 12,
    }


def main():
    overview = build_overview()
    states = build_states()
    overview.save(PNG_PATH, "PNG")
    states.save(PNG_STATES_PATH, "PNG")
    overview.save(PDF_PATH, "PDF", resolution=144, save_all=True, append_images=[states])

    pairs = [
        ("body on page", COLORS["ink"], COLORS["page"], 4.5),
        ("muted on page", COLORS["muted"], COLORS["page"], 4.5),
        ("app text on app", COLORS["app_text"], COLORS["panel"], 4.5),
        ("app muted on app", COLORS["app_muted"], COLORS["panel"], 4.5),
        ("deferred text", "#7C2D12", "#FFF7ED", 4.5),
        ("warning annotation", COLORS["amber_pale"], "#2A210F", 4.5),
    ]
    contrast_results = []
    for name, fg, bg, threshold in pairs:
        ratio = contrast(fg, bg)
        contrast_results.append({
            "name": name,
            "foreground": fg,
            "background": bg,
            "ratio": round(ratio, 2),
            "threshold": threshold,
            "pass": ratio >= threshold,
        })

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "pdf": str(PDF_PATH),
        "previews": [str(PNG_PATH), str(PNG_STATES_PATH)],
        "pdfBytes": PDF_PATH.stat().st_size,
        "pngBytes": [PNG_PATH.stat().st_size, PNG_STATES_PATH.stat().st_size],
        "previewsInspection": [inspect(overview), inspect(states)],
        "contrast": contrast_results,
        "checks": {
            "previewsNonBlank": inspect(overview)["nonBlank"] and inspect(states)["nonBlank"],
            "previewDimensionsExpected": all(item["width"] == W and item["height"] == H for item in [inspect(overview), inspect(states)]),
            "contrastPairsPass": all(item["pass"] for item in contrast_results),
        },
        "notes": [
            "Quick contrast check only; not a full WCAG audit.",
            "Interactive focus and keyboard behavior require Figma/prototype review.",
            "Design crit with product and engineering remains pending outside this local export.",
        ],
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"pdf": str(PDF_PATH), "previews": [str(PNG_PATH), str(PNG_STATES_PATH)], "report": str(REPORT_PATH)}, indent=2))


if __name__ == "__main__":
    main()
