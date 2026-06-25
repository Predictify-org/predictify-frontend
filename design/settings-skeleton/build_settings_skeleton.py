from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
OVERVIEW_PNG = ROOT / "settings-overview.png"
MODAL_PNG = ROOT / "network-switch-modal.png"
PDF_PATH = ROOT / "settings-skeleton.pdf"
REPORT_PATH = ROOT / "quality-report.json"

W, H = 1600, 900
FONT_DIR = Path("C:/Windows/Fonts")

COLORS = {
    "page": "#F6F8FB",
    "paper": "#FFFFFF",
    "ink": "#101827",
    "muted": "#475569",
    "soft": "#E2E8F0",
    "line": "#CBD5E1",
    "app": "#0A0A0F",
    "panel": "#17171F",
    "panel2": "#111827",
    "border": "#27272A",
    "app_text": "#E4E4E7",
    "app_muted": "#A1A1AA",
    "green": "#22C55E",
    "green_ink": "#03150A",
    "amber_bg": "#2A210F",
    "amber_text": "#FDE68A",
    "danger": "#B91C1C",
    "blue": "#DBEAFE",
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
    "h1": font(52, "black"),
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


def brand(draw, right="UI/UX handoff only"):
    draw_round(draw, (64, 52, 98, 86), 10, COLORS["green"])
    center_text(draw, (64, 52, 98, 86), "S", font(19, "black"), COLORS["green_ink"])
    draw.text((110, 57), "StreamPay Settings Skeleton", font=font(21, "bold"), fill=COLORS["ink"])
    rw, _ = text_size(draw, right, font(18, "semibold"))
    draw.text((W - 64 - rw, 59), right, font=font(18, "semibold"), fill=COLORS["muted"])


def chip(draw, x, y, text, fill="#FFFFFF", outline=COLORS["line"], color="#334155"):
    tw, _ = text_size(draw, text, F["tiny"])
    draw_round(draw, (x, y, x + tw + 24, y + 32), 16, fill, outline)
    center_text(draw, (x, y, x + tw + 24, y + 32), text, F["tiny"], color)
    return x + tw + 34


def button(draw, x, y, text, primary=False, danger=False, width=None):
    ft = font(16, "bold")
    tw, _ = text_size(draw, text, ft)
    w = width or tw + 42
    fill = COLORS["panel"]
    outline = "#3F3F46"
    color = COLORS["app_text"]
    if primary:
        fill = COLORS["green"]
        outline = COLORS["green"]
        color = COLORS["green_ink"]
    if danger:
        fill = COLORS["danger"]
        outline = COLORS["danger"]
        color = "#FFFFFF"
    draw_round(draw, (x, y, x + w, y + 46), 23, fill, outline)
    center_text(draw, (x, y, x + w, y + 46), text, ft, color)
    return x + w + 12


def app_shell(draw, x=482, y=126, w=820, h=704):
    draw_round(draw, (x, y, x + w, y + h), 30, COLORS["app"], "#111827")
    draw_round(draw, (x, y, x + w, y + 78), 30, COLORS["panel"], COLORS["panel"])
    draw.rectangle((x, y + 50, x + w, y + 78), fill=COLORS["panel"])
    draw.line((x, y + 78, x + w, y + 78), fill=COLORS["border"], width=1)
    draw_round(draw, (x + 34, y + 22, x + 66, y + 54), 10, COLORS["green"])
    center_text(draw, (x + 34, y + 22, x + 66, y + 54), "S", font(19, "black"), COLORS["green_ink"])
    draw.text((x + 78, y + 25), "StreamPay", font=font(21, "bold"), fill="#FFFFFF")
    draw.text((x + 470, y + 29), "Streams", font=font(15, "bold"), fill=COLORS["app_muted"])
    draw.text((x + 550, y + 29), "Activity", font=font(15, "bold"), fill=COLORS["app_muted"])
    draw.text((x + 632, y + 29), "Settings", font=font(15, "bold"), fill="#FFFFFF")
    return x, y, w, h


def setting_row(draw, x, y, w, label, value, kind="button", caution=False, disabled=False):
    fill = COLORS["panel"] if not disabled else "#111115"
    draw_round(draw, (x, y, x + w, y + 64), 16, fill, COLORS["border"])
    color = COLORS["app_text"] if not disabled else "#71717A"
    value_color = COLORS["amber_text"] if caution else (COLORS["app_muted"] if not disabled else "#52525B")
    draw.text((x + 20, y + 14), label, font=font(17, "bold"), fill=color)
    draw.text((x + 20, y + 39), kind, font=font(12, "semibold"), fill="#71717A")
    vw, _ = text_size(draw, value, font(16, "bold"))
    draw.text((x + w - 54 - vw, y + 22), value, font=font(16, "bold"), fill=value_color)
    draw.text((x + w - 28, y + 20), ">", font=font(20, "bold"), fill="#71717A")


def section_label(draw, x, y, text):
    draw.text((x, y), text.upper(), font=font(13, "bold"), fill=COLORS["green"])


def draw_overview():
    img = Image.new("RGB", (W, H), COLORS["page"])
    draw = ImageDraw.Draw(img)
    brand(draw)
    wrapped_text(draw, (64, 132), "Settings IA skeleton", font(50, "black"), COLORS["ink"], 380, line_gap=6, max_lines=2)
    wrapped_text(draw, (64, 300), "Defaults, Stellar network selection, and email opt-ins in familiar list rows.", font(20), COLORS["muted"], 370, line_gap=8)
    cx = 64
    cy = 382
    for item in ["iOS-like rows", "network caution modal", "row role annotation", "email opt-ins", "Soroban TBD"]:
        cx = chip(draw, cx, cy, item)
        if cx > 360:
            cx, cy = 64, cy + 42

    rail_x = 64
    draw_round(draw, (rail_x, 462, rail_x + 360, 782), 22, COLORS["paper"], COLORS["line"])
    draw.text((rail_x + 24, 488), "Scope one-pager", font=F["h3"], fill=COLORS["ink"])
    scope = [
        ("v1", "Defaults, network selector skeleton, notification opt-ins."),
        ("Later", "Preference persistence, deeper sheets, contract-specific settings."),
        ("Not code", "No settings route or backend user prefs implementation."),
    ]
    sy = 542
    for title, body in scope:
        draw.text((rail_x + 24, sy), title, font=font(17, "bold"), fill=COLORS["ink"])
        sy = wrapped_text(draw, (rail_x + 112, sy), body, font(15), COLORS["muted"], 204, line_gap=4, max_lines=3) + 18

    x, y, w, h = app_shell(draw, y=110, h=728)
    draw.text((x + 34, y + 122), "SETTINGS", font=font(16, "bold"), fill=COLORS["green"])
    draw.text((x + 34, y + 156), "Preferences", font=font(42, "black"), fill="#FFFFFF")
    draw.text((x + 34, y + 212), "Defaults and communication choices for StreamPay.", font=font(18), fill=COLORS["app_muted"])
    rx, rw = x + 34, w - 68
    section_label(draw, rx, y + 276, "Defaults")
    setting_row(draw, rx, y + 270, rw, "Default stream asset", "XLM", "button")
    setting_row(draw, rx, y + 340, rw, "Default schedule timezone", "UTC", "button")
    section_label(draw, rx, y + 414, "Stellar network")
    setting_row(draw, rx, y + 440, rw, "Network", "Testnet", "button", caution=True)
    draw_round(draw, (rx, y + 510, rx + rw, y + 556), 14, COLORS["amber_bg"], "#F59E0B")
    draw.text((rx + 18, y + 524), "Testnet is for testing only. Do not send real funds.", font=font(15, "bold"), fill=COLORS["amber_text"])
    section_label(draw, rx, y + 576, "Notifications")
    setting_row(draw, rx, y + 602, rw, "Email stream updates", "Off", "button")
    draw_round(draw, (rx, y + 674, rx + rw, y + 724), 14, "#111115", COLORS["border"])
    draw.text((rx + 20, y + 688), "Soroban contract preferences", font=font(16, "bold"), fill="#71717A")
    draw.text((rx + rw - 76, y + 688), "TBD", font=font(16, "bold"), fill="#71717A")

    right_x = 1340
    draw_round(draw, (right_x, 356, 1536, 760), 22, COLORS["paper"], COLORS["line"])
    draw.text((right_x + 20, 382), "Figma annotations", font=F["h3"], fill=COLORS["ink"])
    notes = [
        "Every row is a button or link.",
        "Focus order follows visual order.",
        "Network row opens modal.",
        "Email switches need on/off state.",
        "Soroban switches stay TBD.",
    ]
    ny = 438
    for note in notes:
        draw.ellipse((right_x + 20, ny + 7, right_x + 30, ny + 17), fill=COLORS["green"])
        ny = wrapped_text(draw, (right_x + 44, ny), note, font(15), COLORS["muted"], 130, line_gap=4, max_lines=3) + 14

    draw.text((64, 858), "Not in scope: settings route implementation, backend user preferences, or committed Soroban/contract switches.", font=font(13, "semibold"), fill="#64748B")
    return img


def draw_modal():
    img = Image.new("RGB", (W, H), COLORS["page"])
    draw = ImageDraw.Draw(img)
    brand(draw, "Network switch confirmation")
    draw.text((64, 132), "Network switch requires reconfirmation", font=F["h1"], fill=COLORS["ink"])
    wrapped_text(draw, (64, 198), "Switching Stellar networks changes which streams, wallet activity, and test data are visible. Treat it as a caution action, not a casual toggle.", font(22), COLORS["muted"], 1060, line_gap=8)
    cx = 64
    for item in ["current + target network", "prominent testnet warning", "cancel path", "focus trap", "returns focus to row"]:
        cx = chip(draw, cx, 286, item)

    x, y, w, h = app_shell(draw, 330, 350, 940, 420)
    draw.rectangle((x, y + 78, x + w, y + h), fill="#050508")
    draw_round(draw, (x + 190, y + 116, x + 750, y + 374), 24, COLORS["panel"], COLORS["border"])
    draw.text((x + 218, y + 146), "Switch Stellar network?", font=F["h3"], fill="#FFFFFF")
    wrapped_text(draw, (x + 218, y + 184), "This changes which streams and wallet activity are visible in StreamPay.", font(17), COLORS["app_muted"], 500, line_gap=6)
    draw_round(draw, (x + 218, y + 242, x + 722, y + 302), 16, COLORS["amber_bg"], "#F59E0B")
    wrapped_text(draw, (x + 238, y + 254), "Testnet is for testing only. Do not send real funds.", font(16, "bold"), COLORS["amber_text"], 460, line_gap=4)
    draw.text((x + 218, y + 326), "Current", font=font(14, "bold"), fill=COLORS["app_muted"])
    draw.text((x + 330, y + 326), "Mainnet", font=font(15, "bold"), fill="#FFFFFF")
    draw.text((x + 470, y + 326), "Target", font=font(14, "bold"), fill=COLORS["app_muted"])
    draw.text((x + 575, y + 326), "Testnet", font=font(15, "bold"), fill=COLORS["amber_text"])
    button(draw, x + 370, y + 394, "Cancel", width=116)
    button(draw, x + 498, y + 394, "Switch to Testnet", danger=True, width=190)

    draw_round(draw, (64, 374, 270, 690), 22, COLORS["paper"], COLORS["line"])
    draw.text((86, 400), "A11y modal notes", font=F["h3"], fill=COLORS["ink"])
    notes = [
        "Esc closes modal.",
        "Focus trapped while open.",
        "Confirm copy names target.",
        "Warning is text, not only color.",
    ]
    ny = 456
    for note in notes:
        draw.ellipse((86, ny + 7, 96, ny + 17), fill=COLORS["green"])
        ny = wrapped_text(draw, (110, ny), note, font(15), COLORS["muted"], 130, line_gap=4, max_lines=3) + 16

    draw_round(draw, (1330, 374, 1536, 690), 22, COLORS["paper"], COLORS["line"])
    draw.text((1352, 400), "Product TBD", font=F["h3"], fill=COLORS["ink"])
    tbd = [
        "Persist per user, wallet, or device?",
        "Email opt-ins before backend prefs?",
        "Any Soroban switches in v1?",
    ]
    ty = 456
    for note in tbd:
        draw.ellipse((1352, ty + 7, 1362, ty + 17), fill=COLORS["green"])
        ty = wrapped_text(draw, (1376, ty), note, font(15), COLORS["muted"], 126, line_gap=4, max_lines=4) + 16

    draw.text((64, 858), "Design crit required: one product stakeholder + one engineering stakeholder. Full settings depth can follow in a later sprint.", font=font(13, "semibold"), fill="#64748B")
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
    overview = draw_overview()
    modal = draw_modal()
    overview.save(OVERVIEW_PNG, "PNG")
    modal.save(MODAL_PNG, "PNG")
    overview.save(PDF_PATH, "PDF", resolution=144, save_all=True, append_images=[modal])

    pairs = [
        ("body on page", COLORS["ink"], COLORS["page"], 4.5),
        ("muted on page", COLORS["muted"], COLORS["page"], 4.5),
        ("app text on dark", COLORS["app_text"], COLORS["app"], 4.5),
        ("app muted on dark", COLORS["app_muted"], COLORS["app"], 4.5),
        ("warning text", COLORS["amber_text"], COLORS["amber_bg"], 4.5),
        ("danger button", "#FFFFFF", COLORS["danger"], 4.5),
        ("green button text", COLORS["green_ink"], COLORS["green"], 4.5),
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

    inspections = [inspect(overview), inspect(modal)]
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "pdf": str(PDF_PATH),
        "previews": [str(OVERVIEW_PNG), str(MODAL_PNG)],
        "pdfBytes": PDF_PATH.stat().st_size,
        "pngBytes": [OVERVIEW_PNG.stat().st_size, MODAL_PNG.stat().st_size],
        "previewsInspection": inspections,
        "contrast": contrast_results,
        "checks": {
            "previewsNonBlank": all(item["nonBlank"] for item in inspections),
            "previewDimensionsExpected": all(item["width"] == W and item["height"] == H for item in inspections),
            "contrastPairsPass": all(item["pass"] for item in contrast_results),
        },
        "notes": [
            "Quick contrast check only; not a full WCAG audit.",
            "Interactive focus and keyboard behavior require Figma/prototype review.",
            "Design crit with product and engineering remains pending outside this local export.",
        ],
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"pdf": str(PDF_PATH), "previews": [str(OVERVIEW_PNG), str(MODAL_PNG)], "report": str(REPORT_PATH)}, indent=2))


if __name__ == "__main__":
    main()
