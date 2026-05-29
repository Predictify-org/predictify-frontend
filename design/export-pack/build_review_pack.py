from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
PREVIEWS = ROOT / "previews"
PDF_PATH = ROOT / "streampay-stellar-v1-review-pack.pdf"
REPORT_PATH = ROOT / "quality-report.json"

W, H = 1600, 900

COLORS = {
    "page": "#f6f8fb",
    "paper": "#ffffff",
    "ink": "#101827",
    "muted": "#475569",
    "soft": "#e2e8f0",
    "line": "#cbd5e1",
    "app": "#0a0a0f",
    "panel": "#13131a",
    "panel2": "#17171f",
    "border": "#27272a",
    "app_text": "#e4e4e7",
    "app_muted": "#a1a1aa",
    "accent": "#22c55e",
    "accent_ink": "#03150a",
    "blue": "#60a5fa",
    "amber": "#fbbf24",
    "red": "#f87171",
    "danger": "#b91c1c",
}

FONT_DIR = Path("C:/Windows/Fonts")


def font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont:
    names = {
        "regular": "segoeui.ttf",
        "semibold": "seguisb.ttf",
        "bold": "segoeuib.ttf",
        "black": "seguibl.ttf",
        "mono": "consolab.ttf",
    }
    return ImageFont.truetype(str(FONT_DIR / names.get(weight, "segoeui.ttf")), size)


F = {
    "tiny": font(14, "semibold"),
    "small": font(16, "semibold"),
    "label": font(18, "bold"),
    "body": font(22),
    "body_bold": font(22, "semibold"),
    "h3": font(26, "bold"),
    "h2": font(42, "bold"),
    "h1": font(70, "black"),
    "app_body": font(19),
    "app_bold": font(18, "bold"),
    "app_h3": font(22, "bold"),
    "app_title": font(48, "black"),
    "app_big": font(56, "black"),
    "mono": font(16, "mono"),
}


def new_slide() -> Image.Image:
    return Image.new("RGB", (W, H), COLORS["page"])


def draw_round(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text_size(draw: ImageDraw.ImageDraw, text: str, ft: ImageFont.FreeTypeFont):
    box = draw.textbbox((0, 0), text, font=ft)
    return box[2] - box[0], box[3] - box[1]


def wrapped_text(draw, xy, text, ft, fill, max_width, line_gap=8, max_lines=None):
    words = text.split()
    lines: list[str] = []
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


def center_text(draw, box, text, ft, fill):
    x1, y1, x2, y2 = box
    tw, th = text_size(draw, text, ft)
    draw.text((x1 + (x2 - x1 - tw) / 2, y1 + (y2 - y1 - th) / 2 - 2), text, font=ft, fill=fill)


def brand(draw, title: str, right: str):
    draw_round(draw, (64, 54, 98, 88), 10, COLORS["accent"])
    center_text(draw, (64, 54, 98, 88), "S", font(20, "black"), COLORS["accent_ink"])
    draw.text((110, 58), title, font=font(21, "bold"), fill=COLORS["ink"])
    rw, _ = text_size(draw, right, font(19, "semibold"))
    draw.text((W - 64 - rw, 60), right, font=font(19, "semibold"), fill=COLORS["muted"])


def footer(draw, text: str):
    draw.text((64, 862), text, font=font(13, "semibold"), fill="#64748b")


def eyebrow(draw, x, y, text, fill="#166534"):
    draw.text((x, y), text.upper(), font=font(17, "bold"), fill=fill)


def chip(draw, x, y, text, fill="#ffffff", outline=COLORS["line"], color="#334155"):
    tw, th = text_size(draw, text, font(15, "bold"))
    draw_round(draw, (x, y, x + tw + 26, y + 34), 17, fill, outline)
    center_text(draw, (x, y, x + tw + 26, y + 34), text, font(15, "bold"), color)
    return x + tw + 36


def status(draw, x, y, text, kind="active"):
    styles = {
        "active": ("#0f2d1e", COLORS["accent"], "#d3f9df"),
        "draft": ("#1e293b", COLORS["blue"], "#dbeafe"),
        "paused": ("#31230f", COLORS["amber"], "#fef3c7"),
        "ended": ("#2a1617", COLORS["red"], "#fee2e2"),
    }
    fill, outline, color = styles[kind]
    tw, _ = text_size(draw, text, font(14, "bold"))
    draw_round(draw, (x, y, x + tw + 24, y + 32), 16, fill, outline)
    center_text(draw, (x, y, x + tw + 24, y + 32), text, font(14, "bold"), color)
    return x + tw + 34


def button(draw, x, y, text, primary=False, danger=False, width=None):
    ft = font(16, "bold")
    tw, _ = text_size(draw, text, ft)
    w = width or tw + 42
    fill = COLORS["panel"]
    outline = "#3f3f46"
    color = COLORS["app_text"]
    if primary:
        fill = COLORS["accent"]
        outline = COLORS["accent"]
        color = COLORS["accent_ink"]
    if danger:
        fill = COLORS["danger"]
        outline = COLORS["danger"]
        color = "#ffffff"
    draw_round(draw, (x, y, x + w, y + 46), 23, fill, outline)
    center_text(draw, (x, y, x + w, y + 46), text, ft, color)
    return x + w + 12


def app_frame(draw, x=462, y=134, w=1074, h=708):
    draw_round(draw, (x, y, x + w, y + h), 30, COLORS["app"], "#111827")
    draw_round(draw, (x, y, x + w, y + 78), 30, COLORS["panel"], COLORS["panel"])
    draw.rectangle((x, y + 50, x + w, y + 78), fill=COLORS["panel"])
    draw.line((x, y + 78, x + w, y + 78), fill=COLORS["border"], width=1)
    draw_round(draw, (x + 34, y + 22, x + 66, y + 54), 10, COLORS["accent"])
    center_text(draw, (x + 34, y + 22, x + 66, y + 54), "S", font(19, "black"), COLORS["accent_ink"])
    draw.text((x + 78, y + 25), "StreamPay", font=font(21, "bold"), fill="#ffffff")
    return x, y, w, h


def app_header_text(draw, x, y, nav, wallet="GDK4...9F2A"):
    nav_x = x + 575
    for label, active in nav:
        draw.text((nav_x, y + 29), label, font=font(15, "bold"), fill="#ffffff" if active else COLORS["app_muted"])
        nav_x += text_size(draw, label, font(15, "bold"))[0] + 28
    draw_round(draw, (x + 904, y + 19, x + 1040, y + 59), 20, COLORS["panel2"], "#3f3f46")
    center_text(draw, (x + 904, y + 19, x + 1040, y + 59), wallet, font(14, "mono"), COLORS["app_text"])


def review_rail(draw, title, body, checks, note=None):
    x = 64
    eyebrow(draw, x, 146, "Review intent")
    title_end = wrapped_text(draw, (x, 186), title, font(39, "bold"), COLORS["ink"], 335, line_gap=6, max_lines=3)
    body_end = wrapped_text(draw, (x, title_end + 14), body, font(21), COLORS["muted"], 335, line_gap=7, max_lines=5)
    line_y = max(body_end + 30, 500)
    draw.line((x, line_y, 410, line_y), fill=COLORS["line"], width=2)
    checks_y = line_y + 34
    draw.text((x, checks_y), "Non-designer checks", font=F["h3"], fill=COLORS["ink"])
    cx, cy = x, checks_y + 44
    for item in checks:
        cx = chip(draw, cx, cy, item)
        if cx > 320:
            cx, cy = x, cy + 46
    if note:
        note_line = max(cy + 92, 700)
        draw.line((x, note_line, 410, note_line), fill=COLORS["line"], width=2)
        wrapped_text(draw, (x, note_line + 28), note, font(20), COLORS["muted"], 335, line_gap=7, max_lines=4)


def stream_row(draw, box, name, desc, rate, badge, action, kind="active"):
    x1, y1, x2, y2 = box
    draw_round(draw, box, 22, COLORS["panel2"], COLORS["border"])
    draw.text((x1 + 20, y1 + 19), name, font=F["app_h3"], fill="#ffffff")
    draw.text((x1 + 20, y1 + 52), desc, font=font(15), fill=COLORS["app_muted"])
    draw.text((x1 + 440, y1 + 22), "RATE", font=font(13, "bold"), fill="#71717a")
    draw.text((x1 + 440, y1 + 48), rate, font=font(18, "bold"), fill="#ffffff")
    status(draw, x1 + 670, y1 + 34, badge, kind)
    button(draw, x2 - 126, y1 + 31, action, width=100)


def slide_exec():
    img = new_slide()
    d = ImageDraw.Draw(img)
    brand(d, "StreamPay on Stellar", "v1 stakeholder PDF pack")
    eyebrow(d, 64, 140, "Executive summary")
    wrapped_text(d, (64, 182), "Payment streams should feel steady and inspectable.", font(60, "black"), COLORS["ink"], 880, line_gap=8, max_lines=2)
    wrapped_text(d, (64, 360), "This review pack frames StreamPay v1 as a calm Stellar-fintech dashboard for creating, tracking, settling, and withdrawing scheduled payments. It avoids promising Soroban, escrow, or vesting behavior until product and engineering sign off.", font(26), "#334155", 840, line_gap=9)
    x = 64
    for label in ["Draft", "Active", "Paused", "Ended"]:
        draw_round(d, (x, 640, x + 16, 656), 8, COLORS["accent"])
        d.text((x + 26, 633), label, font=font(16, "bold"), fill="#334155")
        x += 150
        if label != "Ended":
            d.line((x - 64, 648, x - 16, 648), fill=COLORS["line"], width=4)

    draw_round(d, (992, 146, 1536, 748), 22, COLORS["paper"], COLORS["line"], 2)
    rows = [
        ("What", "Scheduled payment agreement that accrues over time with visible rate, status, and next action."),
        ("Positioning", "Wallet-connected money movement, asset/trustline awareness, and ledger-visible activity."),
        ("Guardrails", "No smart-contract, escrow, vesting, or final-timing guarantees until v1 scope is approved."),
    ]
    y = 180
    for label, body in rows:
        d.text((1030, y), label.upper(), font=font(17, "bold"), fill="#334155")
        wrapped_text(d, (1190, y - 4), body, font(20, "bold"), COLORS["ink"], 300, line_gap=7, max_lines=4)
        y += 180
        if y < 710:
            d.line((1030, y - 24, 1500, y - 24), fill=COLORS["soft"], width=2)
    footer(d, "Reference basis: project copy, design QA docs, and official Stellar developer language. All mock data is fake.")
    return img


def slide_home():
    img = new_slide()
    d = ImageDraw.Draw(img)
    brand(d, "01 Home / Hero", "Fake wallet data")
    review_rail(d, "Explain the product without marketing heat.", "Primary job: connect a Stellar wallet and orient users to stream actions.", ["Clear value prop", "Wallet state", "Lifecycle labels", "AA contrast pass"])
    x, y, w, h = app_frame(d)
    d.text((x + 246, y + 29), "on Stellar", font=font(15, "bold"), fill="#bbf7d0")
    app_header_text(d, x, y, [("Streams", False), ("Activity", False), ("Design QA", False)], "Connect wallet")
    eyebrow(d, x + 34, y + 126, "Payment streaming on Stellar", COLORS["accent"])
    wrapped_text(d, (x + 34, y + 170), "Manage payment streams with clear, consistent actions.", F["app_title"], "#ffffff", 500, line_gap=4, max_lines=3)
    wrapped_text(d, (x + 34, y + 340), "Create, pause, settle, and withdraw from streams with enough context to know what happens next.", F["app_body"], COLORS["app_muted"], 560, line_gap=7)
    bx = button(d, x + 34, y + 446, "Connect wallet", primary=True)
    button(d, bx, y + 446, "View stream actions")
    draw_round(d, (x + 594, y + 124, x + 1038, y + 620), 24, COLORS["panel2"], COLORS["border"])
    for i, (num, lab) in enumerate([("3", "Active streams"), ("1,240 XLM", "Monthly rate"), ("2", "Actions pending")]):
        mx = x + 616 + i * 136
        draw_round(d, (mx, y + 148, mx + 124, y + 246), 18, "#0f1118", COLORS["border"])
        d.text((mx + 14, y + 164), num, font=font(24, "black"), fill="#ffffff")
        wrapped_text(d, (mx + 14, y + 202), lab, font(13, "bold"), COLORS["app_muted"], 96, line_gap=2)
    stream_row(d, (x + 616, y + 280, x + 1016, y + 386), "Design Retainer", "120 XLM / month to Ada Creative Studio", "", "Active", "", "active")
    stream_row(d, (x + 616, y + 404, x + 1016, y + 510), "Onboarding Support", "Draft stream ready to launch", "", "Draft", "", "draft")
    return img


def slide_streams():
    img = new_slide()
    d = ImageDraw.Draw(img)
    brand(d, "02 Streams List", "Fake recipients and amounts")
    review_rail(d, "Make the next money-adjacent action scannable.", "The list keeps recipient, rate, status, and primary action visible without exposing raw chain detail.", ["Populated", "Empty", "Loading", "Network error"])
    x, y, w, h = app_frame(d)
    app_header_text(d, x, y, [("Streams", True), ("Activity", False), ("Settings", False)])
    eyebrow(d, x + 34, y + 122, "Streams", COLORS["accent"])
    d.text((x + 34, y + 158), "Manage every stream from one list.", font=font(40, "black"), fill="#ffffff")
    d.text((x + 34, y + 216), "Recipient, rate, status, and the primary next action stay visible at a glance.", font=F["app_body"], fill=COLORS["app_muted"])
    button(d, x + 860, y + 150, "Create stream", primary=True)
    stream_row(d, (x + 34, y + 286, x + 1040, y + 392), "Ada Creative Studio", "Pays every 30 days", "120 XLM / month", "Active", "Pause", "active")
    stream_row(d, (x + 34, y + 410, x + 1040, y + 516), "Kemi Onboarding Support", "Draft stream ready to launch", "32 XLM / week", "Draft", "Start", "draft")
    stream_row(d, (x + 34, y + 534, x + 1040, y + 640), "Yusuf QA Partnership", "Ended yesterday with funds available", "18 XLM / day", "Ended", "Withdraw", "ended")
    return img


def slide_create():
    img = new_slide()
    d = ImageDraw.Draw(img)
    brand(d, "03 Create Stream Wizard", "Fake Stellar address")
    review_rail(d, "Prevent bad setup before funds move.", "Use plain validation for asset format, recipient account, trustline status, and schedule before launch.", ["Labels", "Focus ring", "Errors", "44px targets"], "Every input has label, focus, error text, and disabled state documented in Figma.")
    x, y, w, h = app_frame(d)
    app_header_text(d, x, y, [("1 Recipient", False), ("2 Terms", True), ("3 Review", False)])
    eyebrow(d, x + 34, y + 122, "Create stream", COLORS["accent"])
    d.text((x + 34, y + 158), "Set payment terms", font=font(40, "black"), fill="#ffffff")
    draw_round(d, (x + 34, y + 228, x + 656, y + 642), 24, COLORS["panel2"], COLORS["border"])
    d.text((x + 58, y + 254), "Payment terms", font=F["app_h3"], fill="#ffffff")
    fields = [("Recipient address", "GB6V...J2QX", True), ("Asset", "XLM - Stellar native", False), ("Rate", "120 XLM / month", False), ("Start date", "May 1, 2026 UTC", False)]
    fy = y + 310
    for label, value, focus in fields:
        d.text((x + 58, fy), label.upper(), font=font(13, "bold"), fill="#71717a")
        outline = COLORS["accent"] if focus else "#3f3f46"
        draw_round(d, (x + 58, fy + 26, x + 620, fy + 78), 14, "#0f1118", outline, 2)
        d.text((x + 76, fy + 39), value, font=F["mono"] if "GB" in value else font(17, "bold"), fill="#ffffff")
        fy += 82
    draw_round(d, (x + 680, y + 228, x + 1040, y + 642), 24, COLORS["panel2"], COLORS["border"])
    status(d, x + 704, y + 254, "Draft", "draft")
    d.text((x + 704, y + 310), "Preview", font=F["app_h3"], fill="#ffffff")
    wrapped_text(d, (x + 704, y + 350), "Ada Creative Studio receives 120 XLM per calendar month after the stream starts.", font(17), COLORS["app_muted"], 300, line_gap=6)
    rows = [("First payout", "UTC proration"), ("Trustline", "XLM native"), ("Next action", "Review draft")]
    ry = y + 454
    for label, value in rows:
        d.text((x + 704, ry), label, font=font(15, "bold"), fill=COLORS["app_muted"])
        d.text((x + 874, ry), value, font=font(15, "bold"), fill="#ffffff")
        ry += 46
    button(d, x + 704, y + 584, "Continue to review", primary=True, width=300)
    return img


def slide_detail():
    img = new_slide()
    d = ImageDraw.Draw(img)
    brand(d, "04 Stream Detail", "Fake ledger values")
    review_rail(d, "Show balance, lifecycle, and the right next action.", "The detail view separates reversible actions from irreversible money actions.", ["Balance", "Timeline", "Action grouping", "Copy guardrail"], "Avoid guaranteed, instant, or smart-contract claims unless product has signed off.")
    x, y, w, h = app_frame(d)
    app_header_text(d, x, y, [("Streams", True), ("Activity", False)])
    eyebrow(d, x + 34, y + 122, "Stream detail", COLORS["accent"])
    d.text((x + 34, y + 158), "Design Retainer Stream", font=font(40, "black"), fill="#ffffff")
    d.text((x + 34, y + 216), "Ada Creative Studio - created Apr 24, 2026", font=F["app_body"], fill=COLORS["app_muted"])
    status(d, x + 900, y + 158, "Active", "active")
    draw_round(d, (x + 34, y + 286, x + 500, y + 642), 24, COLORS["panel2"], COLORS["border"])
    d.text((x + 58, y + 314), "AVAILABLE TO SETTLE", font=font(13, "bold"), fill="#71717a")
    d.text((x + 58, y + 348), "84.4 XLM", font=F["app_big"], fill="#ffffff")
    wrapped_text(d, (x + 58, y + 420), "Estimate refreshes after wallet and chain data update.", font(17), COLORS["app_muted"], 390, line_gap=6)
    bx = button(d, x + 58, y + 534, "Pause")
    bx = button(d, bx, y + 534, "Settle", primary=True)
    button(d, bx, y + 534, "Stop", danger=True)
    draw_round(d, (x + 522, y + 286, x + 1040, y + 642), 24, COLORS["panel2"], COLORS["border"])
    d.text((x + 546, y + 314), "Lifecycle and recent events", font=F["app_h3"], fill="#ffffff")
    events = [("Apr 24", "Draft created and reviewed"), ("May 01", "Stream activated"), ("Today", "84.4 XLM available to settle")]
    ey = y + 370
    for date, event in events:
        d.text((x + 546, ey), date, font=font(14, "bold"), fill=COLORS["app_muted"])
        d.text((x + 666, ey), event, font=font(18, "bold"), fill="#ffffff")
        ey += 54
    rows = [("Schedule", "120 XLM / month"), ("Recipient", "GB6V...J2QX"), ("Asset", "XLM")]
    ry = y + 540
    for label, value in rows:
        d.text((x + 546, ry), label, font=font(15, "bold"), fill=COLORS["app_muted"])
        d.text((x + 746, ry), value, font=font(15, "bold"), fill="#ffffff")
        ry += 34
    return img


def slide_modal():
    img = new_slide()
    d = ImageDraw.Draw(img)
    brand(d, "05 Settle / Withdraw Modal", "Irreversible-action copy")
    review_rail(d, "Slow the user down before final actions.", "Amount, recipient, asset, and warning copy are visible before submission.", ["Default", "Submitting", "Success", "Error"], "Copy says pending or submitted, never guaranteed complete before confirmation.")
    x, y, w, h = app_frame(d)
    app_header_text(d, x, y, [("Stream detail", True)])
    d.rectangle((x, y + 78, x + w, y + h), fill="#050508")
    draw_round(d, (x + 258, y + 150, x + 818, y + 638), 24, COLORS["panel2"], COLORS["border"])
    d.text((x + 286, y + 184), "Settle outstanding balance", font=F["app_h3"], fill="#ffffff")
    status(d, x + 704, y + 180, "Review", "paused")
    wrapped_text(d, (x + 286, y + 230), "Review this settlement before submitting it from your wallet.", font(17), COLORS["app_muted"], 490, line_gap=6)
    draw_round(d, (x + 286, y + 294, x + 790, y + 354), 16, "#30250f", "#b45309")
    wrapped_text(d, (x + 306, y + 306), "This action cannot be undone. Confirm the amount and recipient before continuing.", font(16, "bold"), "#fde68a", 462, line_gap=4)
    rows = [("Recipient", "Ada Creative Studio  GB6V...J2QX"), ("Amount", "84.4 XLM"), ("Source stream", "Design Retainer Stream")]
    ry = y + 390
    for label, value in rows:
        d.text((x + 286, ry), label, font=font(15, "bold"), fill=COLORS["app_muted"])
        d.text((x + 500, ry), value, font=font(16, "bold"), fill="#ffffff")
        d.line((x + 286, ry + 32, x + 790, ry + 32), fill=COLORS["border"])
        ry += 52
    bx = button(d, x + 286, y + 566, "Cancel")
    button(d, bx, y + 566, "Confirm in wallet", primary=True, width=220)
    return img


def slide_activity():
    img = new_slide()
    d = ImageDraw.Draw(img)
    brand(d, "06 Activity", "No SLO claims")
    review_rail(d, "Let users inspect what happened.", "Activity shows readable events first, with expandable transaction or ledger references when available.", ["Readable event", "TX reference", "Refresh timestamp", "No SLO"], "Users can see when StreamPay last refreshed wallet or chain-observed activity; no timing guarantee is promised.")
    x, y, w, h = app_frame(d)
    app_header_text(d, x, y, [("Streams", False), ("Activity", True)])
    eyebrow(d, x + 34, y + 122, "Activity", COLORS["accent"])
    d.text((x + 34, y + 158), "Recent stream events", font=font(40, "black"), fill="#ffffff")
    d.text((x + 34, y + 216), "Readable updates with optional transaction references.", font=F["app_body"], fill=COLORS["app_muted"])
    chip(d, x + 840, y + 164, "Last refresh: 2 min ago", fill="#111827", outline="#334155", color="#e5e7eb")
    items = [
        ("Today", "Settlement submitted", "Ada Creative Studio - 84.4 XLM pending confirmation", "TX 71AF...C20B", "paused"),
        ("Yesterday", "Stream ended", "Yusuf QA Partnership - funds available to withdraw", "Ended", "ended"),
        ("Apr 25", "Trustline checked", "Recipient ready for USDC:G... asset stream", "Ready", "active"),
        ("Apr 24", "Draft created", "Kemi Onboarding Support - waiting for sender review", "Draft", "draft"),
    ]
    iy = y + 294
    for date, title, desc, badge, kind in items:
        draw_round(d, (x + 34, iy, x + 1040, iy + 84), 18, COLORS["panel2"], COLORS["border"])
        d.text((x + 56, iy + 30), date, font=font(15, "bold"), fill=COLORS["app_muted"])
        d.text((x + 160, iy + 18), title, font=font(18, "bold"), fill="#ffffff")
        d.text((x + 160, iy + 46), desc, font=font(14), fill=COLORS["app_muted"])
        status(d, x + 850, iy + 26, badge, kind)
        iy += 98
    return img


def slide_tbd():
    img = new_slide()
    d = ImageDraw.Draw(img)
    brand(d, "Product TBD and Handoff", "Review-ready notes")
    eyebrow(d, 64, 138, "Open product items")
    d.text((64, 176), "Keep Soroban-related claims minimal until sign-off.", font=F["h2"], fill=COLORS["ink"])
    tx, ty = 64, 260
    col_w = [190, 350, 390]
    headers = ["Area", "Current pack wording", "Decision needed"]
    draw_round(d, (tx, ty, tx + sum(col_w), ty + 470), 22, COLORS["paper"], COLORS["line"], 2)
    d.rectangle((tx, ty, tx + sum(col_w), ty + 58), fill="#111827")
    x = tx
    for i, head in enumerate(headers):
        d.text((x + 18, ty + 20), head.upper(), font=font(14, "bold"), fill="#ffffff")
        x += col_w[i]
    rows = [
        ("Soroban\nSmart contracts", "Marked as pending product/engineering sign-off.", "Is a Soroban contract path in v1, or future/backlog only?"),
        ("On-chain escrow\nFunds custody", "UI says available, pending, and settle; it does not claim final enforcement behavior.", "Which values come from contract reads, Horizon/ledger, or local state?"),
        ("Vesting\nSchedule type", "Out of v1 in this pack unless product adds it explicitly.", "If included, define vesting model, copy, and lifecycle states."),
    ]
    y = ty + 58
    for row in rows:
        d.line((tx, y, tx + sum(col_w), y), fill=COLORS["soft"], width=2)
        x = tx
        for i, cell in enumerate(row):
            wrapped_text(d, (x + 18, y + 18), cell, font(17, "bold") if i == 0 else font(17), COLORS["ink"] if i == 0 else "#334155", col_w[i] - 34, line_gap=4, max_lines=5)
            x += col_w[i]
            if i < 2:
                d.line((x, y, x, y + 137), fill=COLORS["soft"], width=2)
        y += 137
    draw_round(d, (1042, 260, 1536, 730), 22, "#111827", "#111827")
    d.text((1070, 290), "Handoff checklist", font=F["h3"], fill="#ffffff")
    notes = [
        "Named PDF export plus eight PNG previews.",
        "Redlines/specs: 8px grid, 44px targets, labels, focus ring.",
        "States: empty, loading, error, success, draft/active/paused/ended.",
        "WCAG quick contrast pairs pass; prototype keyboard review still needed.",
        "Design crit requires one product and one engineering stakeholder.",
        "No Next.js implementation included.",
    ]
    ny = 345
    for note in notes:
        d.ellipse((1070, ny + 9, 1080, ny + 19), fill=COLORS["accent"])
        ny = wrapped_text(d, (1096, ny), note, font(18), "#e5e7eb", 390, line_gap=4, max_lines=2) + 12
    footer(d, "Official references for wording: Stellar Docs on assets, Horizon, and Soroban smart contracts. No mock value represents real user data.")
    return img


SLIDES = [
    ("exec-summary", slide_exec),
    ("home-hero", slide_home),
    ("streams-list", slide_streams),
    ("create-stream", slide_create),
    ("stream-detail", slide_detail),
    ("settle-withdraw-modal", slide_modal),
    ("activity", slide_activity),
    ("product-tbd-handoff", slide_tbd),
]


def rel_luminance(hex_color: str) -> float:
    value = hex_color.lstrip("#")
    channels = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    corrected = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * corrected[0] + 0.7152 * corrected[1] + 0.0722 * corrected[2]


def contrast(foreground: str, background: str) -> float:
    a, b = rel_luminance(foreground), rel_luminance(background)
    light, dark = max(a, b), min(a, b)
    return (light + 0.05) / (dark + 0.05)


def inspect(img: Image.Image) -> dict:
    small = img.resize((80, 45))
    colors = small.getcolors(maxcolors=80 * 45)
    unique = len(colors or [])
    return {"width": img.width, "height": img.height, "sampledUniqueColors": unique, "nonBlank": unique > 12}


def main():
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    images = []
    preview_results = []
    for index, (name, build) in enumerate(SLIDES, start=1):
        img = build()
        output = PREVIEWS / f"{index:02d}-{name}.png"
        img.save(output, "PNG")
        images.append(img)
        preview_results.append({"slide": index, "name": name, "path": str(output), **inspect(img)})

    images[0].save(PDF_PATH, "PDF", resolution=144, save_all=True, append_images=images[1:])

    pairs = [
        ("slide body", COLORS["ink"], COLORS["page"], 4.5),
        ("slide muted text", COLORS["muted"], COLORS["page"], 4.5),
        ("app primary text", COLORS["app_text"], COLORS["app"], 4.5),
        ("app muted text", COLORS["app_muted"], COLORS["app"], 4.5),
        ("accent button text", COLORS["accent_ink"], COLORS["accent"], 4.5),
        ("active badge", "#d3f9df", "#0f2d1e", 4.5),
        ("draft badge", "#dbeafe", "#1e293b", 4.5),
        ("paused badge", "#fef3c7", "#31230f", 4.5),
        ("ended badge", "#fee2e2", "#2a1617", 4.5),
        ("danger button", "#ffffff", COLORS["danger"], 4.5),
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
        "pdfBytes": PDF_PATH.stat().st_size,
        "slides": preview_results,
        "contrast": contrast_results,
        "checks": {
            "slideCount": len(images),
            "allPreviewsNonBlank": all(result["nonBlank"] for result in preview_results),
            "allPreviewDimensionsExpected": all(result["width"] == W and result["height"] == H for result in preview_results),
            "contrastPairsPass": all(result["pass"] for result in contrast_results),
        },
        "notes": [
            "WCAG check is a quick self-check of key text/background pairs, not a full audit.",
            "Focus/keyboard states are documented as handoff requirements and still need prototype review.",
            "Design crit with product and engineering stakeholders remains pending outside this local export.",
        ],
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"pdf": str(PDF_PATH), "report": str(REPORT_PATH), "previews": [r["path"] for r in preview_results]}, indent=2))


if __name__ == "__main__":
    main()
