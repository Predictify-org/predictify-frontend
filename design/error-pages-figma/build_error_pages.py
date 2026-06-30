from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageColor, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
PDF_PATH = ROOT / "error-pages-figma.pdf"
REPORT_PATH = ROOT / "quality-report.json"
PNG_404 = ROOT / "error-404-page.png"
PNG_5XX = ROOT / "error-5xx-page.png"
PNG_STELLAR = ROOT / "error-stellar-outage-page.png"
PNG_MOBILE = ROOT / "error-mobile-variant.png"

DESKTOP = (1600, 960)
MOBILE = (720, 1280)

COLORS = {
    "paper": "#F4F7FB",
    "paper_warm": "#FFF9EE",
    "paper_teal": "#EEFDFC",
    "panel": "#0B1220",
    "panel_soft": "#111C33",
    "panel_line": "#21314F",
    "white": "#FFFFFF",
    "ink": "#0F172A",
    "muted": "#5B6475",
    "line": "#CBD5E1",
    "green": "#22C55E",
    "green_ink": "#052E16",
    "blue": "#7C8BFF",
    "amber": "#F59E0B",
    "amber_soft": "#FFF3D6",
    "teal": "#2DD4BF",
    "teal_soft": "#D7FBF6",
    "focus": "#93C5FD",
    "danger": "#B91C1C",
}

FONT_CANDIDATES = {
    "regular": [
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
    "semibold": [
        "/usr/share/fonts/truetype/noto/NotoSans-SemiBold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    "bold": [
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    "black": [
        "/usr/share/fonts/truetype/noto/NotoSans-Black.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
}


def load_font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont:
    for candidate in FONT_CANDIDATES[weight]:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


FONTS = {
    "tiny": load_font(13, "semibold"),
    "label": load_font(15, "semibold"),
    "body": load_font(19, "regular"),
    "body_bold": load_font(19, "bold"),
    "h3": load_font(24, "bold"),
    "h2": load_font(36, "bold"),
    "h1": load_font(52, "black"),
    "hero_mobile": load_font(38, "black"),
}


def draw_round(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text_box(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont):
    return draw.textbbox((0, 0), text, font=font)


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont):
    box = text_box(draw, text, font)
    return box[2] - box[0], box[3] - box[1]


def center_text(draw: ImageDraw.ImageDraw, box, text: str, font, fill):
    x1, y1, x2, y2 = box
    tw, th = text_size(draw, text, font)
    draw.text((x1 + (x2 - x1 - tw) / 2, y1 + (y2 - y1 - th) / 2 - 2), text, font=font, fill=fill)


def wrapped_text(draw: ImageDraw.ImageDraw, xy, text: str, font, fill, max_width, line_gap=6, max_lines=None):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if text_size(draw, candidate, font)[0] <= max_width:
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
    ascent, descent = font.getmetrics()
    line_h = ascent + descent + line_gap
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        y += line_h
    return y


def vertical_gradient(size, top_hex: str, bottom_hex: str):
    w, h = size
    top = ImageColor.getrgb(top_hex)
    bottom = ImageColor.getrgb(bottom_hex)
    img = Image.new("RGB", size, top)
    pixels = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            pixels[x, y] = color
    return img


def soft_orb(img: Image.Image, center, radius: int, color: str, alpha: int):
    orb = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(orb)
    cx, cy = center
    r, g, b = ImageColor.getrgb(color)
    for step in range(radius, 0, -18):
        step_alpha = max(8, int(alpha * (step / radius) ** 2))
        draw.ellipse((cx - step, cy - step, cx + step, cy + step), fill=(r, g, b, step_alpha))
    img.alpha_composite(orb)


def base_canvas(size, top, bottom, orb_specs):
    img = vertical_gradient(size, top, bottom).convert("RGBA")
    for center, radius, color, alpha in orb_specs:
        soft_orb(img, center, radius, color, alpha)
    return img.convert("RGB")


def add_brand(draw: ImageDraw.ImageDraw, width: int, skip_text: str):
    draw_round(draw, (56, 36, 252, 72), 18, COLORS["white"], COLORS["line"])
    draw.text((74, 47), skip_text, font=FONTS["tiny"], fill=COLORS["ink"])
    draw_round(draw, (56, 98, 94, 136), 12, COLORS["green"])
    center_text(draw, (56, 98, 94, 136), "S", load_font(22, "black"), COLORS["green_ink"])
    draw.text((106, 104), "StreamPay", font=load_font(22, "bold"), fill=COLORS["white"])
    draw.text((width - 256, 108), "Design-only handoff", font=load_font(16, "semibold"), fill=(255, 255, 255, 200))


def pill(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, fill: str, ink: str, outline=None):
    tw, _ = text_size(draw, text, FONTS["tiny"])
    draw_round(draw, (x, y, x + tw + 28, y + 34), 17, fill, outline or fill)
    center_text(draw, (x, y, x + tw + 28, y + 34), text, FONTS["tiny"], ink)
    return x + tw + 40


def button(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, primary=True, width=168):
    fill = COLORS["green"] if primary else COLORS["panel_soft"]
    outline = COLORS["green"] if primary else COLORS["panel_line"]
    ink = COLORS["green_ink"] if primary else COLORS["white"]
    draw_round(draw, (x, y, x + width, y + 52), 26, fill, outline)
    center_text(draw, (x, y, x + width, y + 52), text, load_font(16, "bold"), ink)
    return x + width + 14


def lifecycle_strip(draw: ImageDraw.ImageDraw, x: int, y: int, active: str):
    stages = ["Draft", "Active", "Paused", "Ended"]
    draw.text((x, y), "Stream lifecycle context", font=FONTS["label"], fill=COLORS["white"])
    sx = x
    for idx, stage in enumerate(stages):
        fill = COLORS["teal_soft"] if stage == active else COLORS["panel_soft"]
        ink = COLORS["ink"] if stage == active else COLORS["white"]
        outline = COLORS["teal"] if stage == active else COLORS["panel_line"]
        sx = pill(draw, sx, y + 28, stage, fill, ink, outline)
        if idx < len(stages) - 1:
            draw.line((sx - 18, y + 45, sx - 4, y + 45), fill="#5F7198", width=2)


def panel_shell(draw: ImageDraw.ImageDraw, box, title, body, primary, secondary, accent, helper, footer_title, footer_body):
    x1, y1, x2, y2 = box
    draw_round(draw, box, 32, COLORS["panel"], COLORS["panel_line"], 2)
    draw_round(draw, (x1 + 32, y1 + 28, x1 + 126, y1 + 62), 17, accent, accent)
    center_text(draw, (x1 + 32, y1 + 28, x1 + 126, y1 + 62), "Recovery", FONTS["tiny"], COLORS["ink"])
    draw.text((x1 + 32, y1 + 98), title, font=FONTS["h1"], fill=COLORS["white"])
    end_y = wrapped_text(draw, (x1 + 32, y1 + 174), body, FONTS["body"], "#D8E1F3", x2 - x1 - 64, line_gap=8, max_lines=4)
    bx = button(draw, x1 + 32, end_y + 26, primary, primary=True, width=168)
    button(draw, bx, end_y + 26, secondary, primary=False, width=180)
    wrapped_text(draw, (x1 + 32, end_y + 94), helper, load_font(15, "semibold"), "#A9B7D0", x2 - x1 - 64, line_gap=6, max_lines=2)
    draw_round(draw, (x1 + 32, y2 - 128, x2 - 32, y2 - 32), 24, COLORS["panel_soft"], COLORS["panel_line"])
    draw.text((x1 + 56, y2 - 108), footer_title, font=FONTS["label"], fill=COLORS["white"])
    wrapped_text(draw, (x1 + 56, y2 - 80), footer_body, load_font(15, "regular"), "#B5C2DB", x2 - x1 - 112, line_gap=5, max_lines=3)


def draw_broken_path(draw: ImageDraw.ImageDraw, start, end, color):
    x1, y1 = start
    x2, y2 = end
    mid_x = (x1 + x2) // 2
    draw.line((x1, y1, mid_x - 28, y1 + 40), fill=color, width=6)
    draw.line((mid_x + 18, y1 + 64, x2, y2), fill=color, width=6)
    draw.line((mid_x - 22, y1 + 34, mid_x + 6, y1 + 62), fill=COLORS["paper"], width=10)
    draw.line((mid_x - 8, y1 + 28, mid_x + 20, y1 + 56), fill=color, width=6)


def draw_404_frame():
    img = base_canvas(DESKTOP, "#16203A", "#0A0F1A", [((220, 220), 240, "#7C8BFF", 90), ((1320, 210), 260, "#2DD4BF", 55)])
    draw = ImageDraw.Draw(img)
    add_brand(draw, DESKTOP[0], "Skip to StreamPay home")
    lifecycle_strip(draw, 56, 790, "Draft")
    panel_box = (116, 170, 792, 738)
    panel_shell(
        draw,
        panel_box,
        "This page could not be found",
        "The link may be old, incomplete, or no longer available. You can head back to StreamPay home and keep working from there.",
        "Go to home",
        "Contact support",
        COLORS["blue"],
        "If you followed a link from an email or shared document, ask for a fresh link.",
        "Why this looks different",
        "404 is framed as a pathing problem, not a system failure. The lighter accent and broken-link illustration keep the tone calm.",
    )
    draw.text((956, 196), "404", font=load_font(140, "black"), fill=(255, 255, 255, 50))
    draw.ellipse((1030, 286, 1420, 676), outline=COLORS["blue"], width=4)
    draw.ellipse((1110, 366, 1340, 596), outline=(255, 255, 255, 50), width=2)
    draw_broken_path(draw, (1048, 490), (1368, 494), "#D8DEFF")
    draw_round(draw, (1004, 248, 1092, 336), 24, COLORS["white"], COLORS["line"])
    center_text(draw, (1004, 248, 1092, 336), "/", load_font(42, "black"), COLORS["blue"])
    draw_round(draw, (1334, 642, 1462, 690), 24, COLORS["white"], COLORS["line"])
    center_text(draw, (1334, 642, 1462, 690), "Bad link", FONTS["tiny"], COLORS["ink"])
    draw_round(draw, (930, 720, 1498, 828), 28, COLORS["white"], COLORS["line"])
    draw.text((962, 748), "A11y note", font=FONTS["label"], fill=COLORS["ink"])
    wrapped_text(draw, (962, 776), "Heading is first content in main after the visible-on-focus skip link. Primary action receives the first actionable focus stop.", load_font(15), COLORS["muted"], 500, line_gap=5, max_lines=3)
    return img


def draw_5xx_frame():
    img = base_canvas(DESKTOP, "#2B1C0A", "#100C08", [((280, 210), 260, "#F59E0B", 95), ((1260, 250), 240, "#FFEDD5", 35)])
    draw = ImageDraw.Draw(img)
    add_brand(draw, DESKTOP[0], "Skip to StreamPay home")
    lifecycle_strip(draw, 56, 790, "Active")
    panel_box = (116, 170, 792, 738)
    panel_shell(
        draw,
        panel_box,
        "Something went wrong on our side",
        "StreamPay is having trouble loading this page right now. Our team is already looking into it.",
        "Try again",
        "Visit status page",
        COLORS["amber"],
        "If this keeps happening, support can help with the page you were trying to reach.",
        "Why this looks different",
        "5xx uses a warmer service-owned accent and explicit ownership language so users know StreamPay is working on the issue.",
    )
    cx, cy = 1180, 470
    for r in [54, 104, 154]:
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 231, 192, 90), width=3)
    draw_round(draw, (1122, 412, 1238, 528), 32, COLORS["white"], COLORS["line"])
    center_text(draw, (1122, 412, 1238, 528), "!", load_font(56, "black"), COLORS["amber"])
    draw_round(draw, (958, 646, 1404, 762), 28, "#24180B", "#6B4A17")
    draw.text((990, 676), "We're fixing it", font=FONTS["h3"], fill=COLORS["white"])
    wrapped_text(draw, (990, 714), "Use ownership language here. Do not redirect blame to the user.", load_font(15), "#FBD7A6", 380, line_gap=5, max_lines=2)
    draw_round(draw, (930, 782, 1498, 868), 28, COLORS["white"], COLORS["line"])
    draw.text((962, 810), "Do not show", font=FONTS["label"], fill=COLORS["ink"])
    wrapped_text(draw, (1084, 810), "Stack traces, internal hostnames, raw request IDs, vendor names, or database errors.", load_font(15), COLORS["muted"], 380, line_gap=5, max_lines=2)
    return img


def draw_stellar_frame():
    img = base_canvas(DESKTOP, "#062125", "#07101A", [((260, 210), 260, "#2DD4BF", 105), ((1280, 220), 240, "#7C8BFF", 50)])
    draw = ImageDraw.Draw(img)
    add_brand(draw, DESKTOP[0], "Skip to StreamPay home")
    lifecycle_strip(draw, 56, 790, "Paused")
    panel_box = (116, 170, 792, 738)
    panel_shell(
        draw,
        panel_box,
        "Stellar service is temporarily unavailable",
        "StreamPay cannot reach part of the Stellar service right now. Your funds are not gone. Recent activity may take longer to refresh until the service is back.",
        "Try again",
        "Contact support",
        COLORS["teal"],
        "You can also check the status page for live updates.",
        "Why this looks different",
        "The network motif signals an upstream dependency, while the copy reassures users without exposing Horizon or Soroban internals.",
    )
    center = (1194, 446)
    draw.ellipse((center[0] - 172, center[1] - 172, center[0] + 172, center[1] + 172), outline="#74F1E0", width=3)
    draw.ellipse((center[0] - 104, center[1] - 104, center[0] + 104, center[1] + 104), outline=(255, 255, 255, 90), width=2)
    draw_round(draw, (1164, 416, 1224, 476), 20, COLORS["white"], COLORS["line"])
    center_text(draw, (1164, 416, 1224, 476), "S", load_font(28, "black"), COLORS["teal"])
    for dx, dy in [(-148, -18), (-66, -144), (144, -12), (64, 136), (-124, 114)]:
        px, py = center[0] + dx, center[1] + dy
        draw.ellipse((px - 12, py - 12, px + 12, py + 12), fill="#D6FFFA", outline="#83F5E6")
        draw.line((center[0], center[1], px, py), fill=(205, 255, 247, 120), width=2)
    draw_round(draw, (940, 650, 1478, 764), 28, COLORS["white"], COLORS["line"])
    draw.text((974, 680), "Funds reassurance note", font=FONTS["label"], fill=COLORS["ink"])
    wrapped_text(
        draw,
        (974, 712),
        "Say funds are not gone. Do not say safe forever, guaranteed, or instantly recoverable.",
        load_font(15),
        COLORS["muted"],
        470,
        line_gap=5,
        max_lines=3,
    )
    draw_round(draw, (940, 786, 1478, 900), 28, "#0B2B2A", "#1D5E58")
    draw.text((974, 816), "A11y note", font=FONTS["label"], fill=COLORS["white"])
    wrapped_text(
        draw,
        (974, 848),
        "Status and recovery meaning come from heading + body + actions, not the teal network illustration alone.",
        load_font(15),
        "#D3F9F4",
        470,
        line_gap=5,
        max_lines=3,
    )
    return img


def draw_mobile_frame():
    img = base_canvas(MOBILE, "#052126", "#07101A", [((180, 180), 210, "#2DD4BF", 100), ((580, 230), 160, "#7C8BFF", 45)])
    draw = ImageDraw.Draw(img)
    add_brand(draw, MOBILE[0], "Skip to home")
    draw_round(draw, (28, 176, 692, 1028), 30, COLORS["panel"], COLORS["panel_line"], 2)
    draw_round(draw, (60, 212, 152, 246), 17, COLORS["teal"], COLORS["teal"])
    center_text(draw, (60, 212, 152, 246), "Recovery", FONTS["tiny"], COLORS["ink"])
    draw.text((60, 292), "Stellar service is", font=FONTS["hero_mobile"], fill=COLORS["white"])
    draw.text((60, 340), "temporarily unavailable", font=FONTS["hero_mobile"], fill=COLORS["white"])
    end_y = wrapped_text(
        draw,
        (60, 418),
        "We cannot refresh part of the Stellar service right now. Your funds are not gone, and recent activity may take longer to update.",
        load_font(22),
        "#D8E1F3",
        600,
        line_gap=8,
        max_lines=5,
    )
    button(draw, 60, end_y + 28, "Try again", primary=True, width=240)
    button(draw, 316, end_y + 28, "Status page", primary=False, width=200)
    draw_round(draw, (60, end_y + 116, 660, end_y + 252), 24, COLORS["panel_soft"], COLORS["panel_line"])
    draw.text((88, end_y + 144), "Support note", font=FONTS["label"], fill=COLORS["white"])
    wrapped_text(draw, (88, end_y + 174), "If activity still does not refresh after the service recovers, support can help review the page you were using.", load_font(17), "#B5C2DB", 544, line_gap=6, max_lines=3)
    draw_round(draw, (60, 870, 660, 978), 24, COLORS["white"], COLORS["line"])
    draw.text((88, 900), "Focus order", font=FONTS["label"], fill=COLORS["ink"])
    wrapped_text(draw, (200, 900), "Skip link, brand, heading, primary action, secondary action, helper link.", load_font(16), COLORS["muted"], 424, line_gap=5, max_lines=2)
    draw.text((56, 1080), "Optional mobile variant for review only", font=load_font(14, "semibold"), fill=(255, 255, 255, 200))
    return img


def luminance(hex_color: str):
    rgb = [channel / 255 for channel in ImageColor.getrgb(hex_color)]
    adjusted = []
    for c in rgb:
        if c <= 0.03928:
            adjusted.append(c / 12.92)
        else:
            adjusted.append(((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * adjusted[0] + 0.7152 * adjusted[1] + 0.0722 * adjusted[2]


def contrast_ratio(foreground: str, background: str):
    l1 = luminance(foreground)
    l2 = luminance(background)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def export():
    pages = {
        PNG_404: draw_404_frame(),
        PNG_5XX: draw_5xx_frame(),
        PNG_STELLAR: draw_stellar_frame(),
        PNG_MOBILE: draw_mobile_frame(),
    }
    for path, image in pages.items():
        image.save(path)
    desktop_pages = [pages[PNG_404].convert("RGB"), pages[PNG_5XX].convert("RGB"), pages[PNG_STELLAR].convert("RGB")]
    mobile_pdf_page = Image.new("RGB", DESKTOP, COLORS["paper"])
    mobile_resized = pages[PNG_MOBILE].resize((540, 960))
    mobile_pdf_page.paste(mobile_resized, (530, 0))
    draw = ImageDraw.Draw(mobile_pdf_page)
    draw.text((76, 130), "Optional mobile variant", font=FONTS["h1"], fill=COLORS["ink"])
    wrapped_text(draw, (76, 210), "Compact recovery layout for the Stellar service unavailable frame. Keep the same copy hierarchy and action order on small screens.", FONTS["body"], COLORS["muted"], 360, line_gap=8, max_lines=5)
    draw_round(draw, (76, 390, 430, 540), 28, COLORS["white"], COLORS["line"])
    draw.text((106, 424), "Mobile annotation", font=FONTS["h3"], fill=COLORS["ink"])
    wrapped_text(draw, (106, 464), "Status page is used as the secondary action here because it is more compact than support while preserving recovery context.", load_font(16), COLORS["muted"], 294, line_gap=5, max_lines=4)
    desktop_pages.append(mobile_pdf_page)
    desktop_pages[0].save(PDF_PATH, save_all=True, append_images=desktop_pages[1:])

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "outputs": [path.name for path in [PNG_404, PNG_5XX, PNG_STELLAR, PNG_MOBILE, PDF_PATH]],
        "contrast_checks": [
            {"pair": "white_on_panel", "ratio": round(contrast_ratio(COLORS["white"], COLORS["panel"]), 2), "passes_aa": contrast_ratio(COLORS["white"], COLORS["panel"]) >= 4.5},
            {"pair": "muted_on_white", "ratio": round(contrast_ratio(COLORS["muted"], COLORS["white"]), 2), "passes_aa": contrast_ratio(COLORS["muted"], COLORS["white"]) >= 4.5},
            {"pair": "green_ink_on_green", "ratio": round(contrast_ratio(COLORS["green_ink"], COLORS["green"]), 2), "passes_aa": contrast_ratio(COLORS["green_ink"], COLORS["green"]) >= 4.5},
            {"pair": "ink_on_teal_soft", "ratio": round(contrast_ratio(COLORS["ink"], COLORS["teal_soft"]), 2), "passes_aa": contrast_ratio(COLORS["ink"], COLORS["teal_soft"]) >= 4.5},
            {"pair": "white_on_panel_soft", "ratio": round(contrast_ratio(COLORS["white"], COLORS["panel_soft"]), 2), "passes_aa": contrast_ratio(COLORS["white"], COLORS["panel_soft"]) >= 4.5},
        ],
        "phase_2_gaps": [
            "Interactive keyboard walkthrough still needs prototype-level validation.",
            "Final support and status-page destinations are placeholders pending stakeholder confirmation.",
            "Funds reassurance wording still needs product/legal review before implementation.",
        ],
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    export()
