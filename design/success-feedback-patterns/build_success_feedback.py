from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
TOAST_PNG = ROOT / "success-toast-patterns.png"
FULL_PAGE_PNG = ROOT / "success-full-page-patterns.png"
EDGE_PNG = ROOT / "success-edge-and-a11y.png"
PDF_PATH = ROOT / "success-feedback-patterns.pdf"
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
    "success": "#22C55E",
    "success_bg": "#0F2D1E",
    "success_text": "#D3F9DF",
    "green_ink": "#03150A",
    "amber_bg": "#2A210F",
    "amber_text": "#FDE68A",
    "danger": "#B91C1C",
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
    draw_round(draw, (64, 52, 98, 86), 10, COLORS["success"])
    center_text(draw, (64, 52, 98, 86), "S", font(19, "black"), COLORS["green_ink"])
    draw.text((110, 57), "StreamPay Success Feedback Patterns", font=font(21, "bold"), fill=COLORS["ink"])
    rw, _ = text_size(draw, right, font(18, "semibold"))
    draw.text((W - 64 - rw, 59), right, font=font(18, "semibold"), fill=COLORS["muted"])


def chip(draw, x, y, text, fill="#FFFFFF", outline=COLORS["line"], color="#334155"):
    tw, _ = text_size(draw, text, F["tiny"])
    draw_round(draw, (x, y, x + tw + 24, y + 32), 16, fill, outline)
    center_text(draw, (x, y, x + tw + 24, y + 32), text, F["tiny"], color)
    return x + tw + 34


def checkmark(draw, cx, cy, r=16):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=COLORS["success"])
    draw.line((cx - 7, cy, cx - 2, cy + 6, cx + 9, cy - 7), fill=COLORS["green_ink"], width=4)


def button(draw, x, y, text, primary=False, width=None):
    ft = font(16, "bold")
    tw, _ = text_size(draw, text, ft)
    w = width or tw + 42
    fill = COLORS["panel"]
    outline = "#3F3F46"
    color = COLORS["app_text"]
    if primary:
        fill = COLORS["success"]
        outline = COLORS["success"]
        color = COLORS["green_ink"]
    draw_round(draw, (x, y, x + w, y + 46), 23, fill, outline)
    center_text(draw, (x, y, x + w, y + 46), text, ft, color)
    return x + w + 12


def app_frame(draw, x=458, y=292, w=958, h=500):
    draw_round(draw, (x, y, x + w, y + h), 30, COLORS["app"], "#111827")
    draw_round(draw, (x, y, x + w, y + 78), 30, COLORS["panel"], COLORS["panel"])
    draw.rectangle((x, y + 50, x + w, y + 78), fill=COLORS["panel"])
    draw.line((x, y + 78, x + w, y + 78), fill=COLORS["border"], width=1)
    draw_round(draw, (x + 34, y + 22, x + 66, y + 54), 10, COLORS["success"])
    center_text(draw, (x + 34, y + 22, x + 66, y + 54), "S", font(19, "black"), COLORS["green_ink"])
    draw.text((x + 78, y + 25), "StreamPay", font=font(21, "bold"), fill="#FFFFFF")
    draw.text((x + 652, y + 29), "Streams", font=font(15, "bold"), fill="#FFFFFF")
    draw.text((x + 734, y + 29), "Activity", font=font(15, "bold"), fill=COLORS["app_muted"])
    return x, y, w, h


def draw_toast(draw, x, y, title, body, action, variant="success"):
    draw_round(draw, (x, y, x + 500, y + 104), 18, COLORS["paper"], COLORS["line"])
    checkmark(draw, x + 34, y + 32, 15)
    draw.text((x + 64, y + 18), title, font=font(18, "bold"), fill=COLORS["ink"])
    draw.text((x + 64, y + 48), body, font=font(15), fill=COLORS["muted"])
    draw.text((x + 64, y + 76), action, font=font(15, "bold"), fill="#166534")
    draw.text((x + 462, y + 20), "x", font=font(16, "bold"), fill=COLORS["muted"])


def draw_receipt_card(draw, x, y, card_w, title, amount, subtitle, primary_action):
    draw_round(draw, (x, y, x + card_w, y + 380), 28, COLORS["panel"], COLORS["border"])
    checkmark(draw, x + card_w // 2, y + 58, 28)
    wrapped_text(draw, (x + 38, y + 110), title, font(28, "black"), "#FFFFFF", card_w - 76, line_gap=5, max_lines=2)
    wrapped_text(draw, (x + 38, y + 178), subtitle, font(17), COLORS["app_muted"], card_w - 76, line_gap=7, max_lines=3)
    rows = [("Amount", amount), ("Recipient", "Ada Creative Studio")]
    ry = y + 258
    for label, value in rows:
        draw.text((x + 38, ry), label, font=font(14, "bold"), fill=COLORS["app_muted"])
        draw.text((x + 160, ry), value, font=font(15, "bold"), fill="#FFFFFF")
        ry += 38
    button(draw, x + 38, y + 328, primary_action, primary=True, width=170)
    button(draw, x + 220, y + 328, "Activity", width=110)


def page_toasts():
    img = Image.new("RGB", (W, H), COLORS["page"])
    draw = ImageDraw.Draw(img)
    brand(draw)
    draw.text((64, 132), "Inline success toasts", font=F["h1"], fill=COLORS["ink"])
    wrapped_text(draw, (64, 198), "Use inline patterns when the user can keep working. Toasts announce the outcome and offer a next action without stealing focus.", font(22), COLORS["muted"], 1040, line_gap=8)
    cx = 64
    for item in ["role=status", "polite live region", "not color alone", "dismiss target", "no exact timing promise"]:
        cx = chip(draw, cx, 286, item)

    x, y, w, h = app_frame(draw, y=330, h=500)
    draw.text((x + 34, y + 124), "STREAM DETAIL", font=font(15, "bold"), fill=COLORS["success"])
    draw.text((x + 34, y + 158), "Design Retainer Stream", font=font(40, "black"), fill="#FFFFFF")
    draw.text((x + 34, y + 214), "Ada Creative Studio - active", font=font(18), fill=COLORS["app_muted"])
    draw_toast(draw, x + w - 540, y + 116, "Stream created", "Draft saved. Review before starting.", "View stream")
    draw_toast(draw, x + w - 540, y + 238, "Settlement completed", "Activity may take a moment to refresh.", "View receipt")
    draw_toast(draw, x + w - 540, y + 360, "Withdrawal completed", "Wallet activity usually updates after refresh.", "Open activity")

    draw_round(draw, (64, 392, 376, 704), 22, COLORS["paper"], COLORS["line"])
    draw.text((88, 420), "When to use", font=F["h3"], fill=COLORS["ink"])
    notes = [
        "Stream created while staying in flow.",
        "Settlement confirmed on detail.",
        "Withdrawal complete with activity link.",
        "No receipt required in the moment.",
    ]
    ny = 476
    for note in notes:
        draw.ellipse((88, ny + 7, 98, ny + 17), fill=COLORS["success"])
        ny = wrapped_text(draw, (112, ny), note, font(16), COLORS["muted"], 220, line_gap=4, max_lines=3) + 14

    draw.text((64, 858), "Copy handoff: move final wording into a separate frontend issue; this PR is Figma/static design only.", font=font(13, "semibold"), fill="#64748B")
    return img


def page_full_page():
    img = Image.new("RGB", (W, H), COLORS["page"])
    draw = ImageDraw.Draw(img)
    brand(draw, "Blocking confirmation patterns")
    draw.text((64, 132), "Full-page or blocking confirmations", font=F["h1"], fill=COLORS["ink"])
    wrapped_text(draw, (64, 198), "Use blocking patterns when the milestone deserves a receipt, a clear next step, or confirmation that a money-adjacent flow is complete.", font(22), COLORS["muted"], 1100, line_gap=8)
    cx = 64
    for item in ["receipt-like", "amount + recipient", "ledger placeholder", "calm success", "clear next action"]:
        cx = chip(draw, cx, 286, item)

    draw_round(draw, (64, 352, 1536, 784), 30, COLORS["app"], "#111827")
    draw_receipt_card(draw, 116, 382, 420, "Stream created", "120 XLM / month", "The stream is ready to start. Review details before any funds move.", "Review stream")
    draw_receipt_card(draw, 590, 382, 420, "Settlement complete", "84.4 XLM", "This may take a moment to appear in chain-observed activity.", "View receipt")
    draw_receipt_card(draw, 1064, 382, 420, "Withdrawal complete", "84.4 XLM", "Wallet activity usually updates after StreamPay refreshes status.", "Open activity")

    draw.text((64, 858), "Soroban/contract receipt lines are TBD until contracts and API behavior are final.", font=font(13, "semibold"), fill="#64748B")
    return img


def page_edge():
    img = Image.new("RGB", (W, H), COLORS["page"])
    draw = ImageDraw.Draw(img)
    brand(draw, "Edge case and a11y annotations")
    draw.text((64, 132), "Delayed confirmation after submitted success", font=F["h1"], fill=COLORS["ink"])
    wrapped_text(draw, (64, 198), "Use this frame when local submission succeeds but Horizon or chain-observed confirmation is delayed. It is not an error unless product defines the failure condition.", font(22), COLORS["muted"], 1200, line_gap=8)
    cx = 64
    for item in ["failure-after-success edge", "status not error", "refresh status", "view activity", "Soroban TBD"]:
        cx = chip(draw, cx, 286, item)

    draw_round(draw, (64, 356, 880, 720), 28, COLORS["panel"], COLORS["border"])
    draw_round(draw, (104, 402, 160, 458), 28, COLORS["amber_bg"], "#F59E0B")
    center_text(draw, (104, 402, 160, 458), "!", font(26, "black"), COLORS["amber_text"])
    wrapped_text(draw, (184, 392), "Submitted. Confirmation is taking longer than expected.", font(26, "black"), "#FFFFFF", 640, line_gap=6, max_lines=2)
    wrapped_text(draw, (184, 470), "We will keep checking and show the latest status in Activity. This may take a moment to appear after wallet and chain-observed activity refresh.", font(18), COLORS["app_muted"], 600, line_gap=7)
    draw_round(draw, (184, 546, 808, 602), 16, COLORS["amber_bg"], "#F59E0B")
    draw.text((204, 563), "Do not promise finality or exact timing until product/legal signs off.", font=font(16, "bold"), fill=COLORS["amber_text"])
    button(draw, 184, 640, "Refresh status", primary=True, width=160)
    button(draw, 356, 640, "View activity", width=150)

    draw_round(draw, (930, 356, 1536, 720), 22, COLORS["paper"], COLORS["line"])
    draw.text((954, 386), "Figma accessibility annotations", font=F["h3"], fill=COLORS["ink"])
    notes = [
        "Toast: role=status, aria-live=polite.",
        "Success mark is paired with text label.",
        "Do not rely on green alone for success.",
        "Dismiss and action targets are at least 44 x 44 px.",
        "Blocking modal traps focus; full page uses main heading.",
        "Delayed confirmation remains a status until failure is defined.",
    ]
    ny = 444
    for note in notes:
        draw.ellipse((954, ny + 7, 964, ny + 17), fill=COLORS["success"])
        ny = wrapped_text(draw, (978, ny), note, font(16), COLORS["muted"], 470, line_gap=4, max_lines=2) + 14

    draw.text((64, 858), "Design crit required: one product stakeholder + one engineering stakeholder. Static storyboard can be attached in issue closeout.", font=font(13, "semibold"), fill="#64748B")
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
    pages = [page_toasts(), page_full_page(), page_edge()]
    outputs = [TOAST_PNG, FULL_PAGE_PNG, EDGE_PNG]
    for page, output in zip(pages, outputs):
        page.save(output, "PNG")
    pages[0].save(PDF_PATH, "PDF", resolution=144, save_all=True, append_images=pages[1:])

    pairs = [
        ("body on page", COLORS["ink"], COLORS["page"], 4.5),
        ("muted on page", COLORS["muted"], COLORS["page"], 4.5),
        ("app text on dark", COLORS["app_text"], COLORS["app"], 4.5),
        ("app muted on dark", COLORS["app_muted"], COLORS["app"], 4.5),
        ("toast body", COLORS["muted"], COLORS["paper"], 4.5),
        ("success text", COLORS["success_text"], COLORS["success_bg"], 4.5),
        ("warning text", COLORS["amber_text"], COLORS["amber_bg"], 4.5),
        ("success button text", COLORS["green_ink"], COLORS["success"], 4.5),
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

    inspections = [inspect(page) for page in pages]
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "pdf": str(PDF_PATH),
        "previews": [str(path) for path in outputs],
        "pdfBytes": PDF_PATH.stat().st_size,
        "pngBytes": [path.stat().st_size for path in outputs],
        "previewsInspection": inspections,
        "contrast": contrast_results,
        "checks": {
            "pageCount": len(pages),
            "previewsNonBlank": all(item["nonBlank"] for item in inspections),
            "previewDimensionsExpected": all(item["width"] == W and item["height"] == H for item in inspections),
            "contrastPairsPass": all(item["pass"] for item in contrast_results),
        },
        "notes": [
            "Quick contrast check only; not a full WCAG audit.",
            "Interactive focus and live-region behavior require Figma/prototype review.",
            "Design crit with product and engineering remains pending outside this local export.",
        ],
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"pdf": str(PDF_PATH), "previews": [str(path) for path in outputs], "report": str(REPORT_PATH)}, indent=2))


if __name__ == "__main__":
    main()
