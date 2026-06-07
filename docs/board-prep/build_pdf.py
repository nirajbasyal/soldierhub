#!/usr/bin/env python3
"""Render board-prep-study-guide.html into a polished PDF using reportlab.

LibreOffice (no Writer module) and fpdf2 (broken cryptography rust binding) are
unavailable in this environment, so we parse our own well-structured HTML with
the stdlib html.parser and lay it out with reportlab Platypus.
"""
import html as _html
import re
import sys
from html.parser import HTMLParser

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable,
)

SRC = "/home/user/soldierhub/docs/board-prep/board-prep-study-guide.html"
OUT = "/home/user/soldierhub/docs/board-prep/SoldierHub-Board-Prep-Study-Guide.pdf"

# ---- palette (matches the app theme) ----
NAVY   = colors.HexColor("#071B33")
RED    = colors.HexColor("#B31942")
BLUE   = colors.HexColor("#1E4E8C")
GREEN  = colors.HexColor("#1c5238")
GREENBG= colors.HexColor("#E4F3EC")
GREENBD= colors.HexColor("#C7E3D4")
LIGHTBOX = colors.HexColor("#EAF0F8")
BOXBD  = colors.HexColor("#CFDAE8")
YELLOW = colors.HexColor("#FFF1D7")
YELLOWBD = colors.HexColor("#F2D29A")
PINK   = colors.HexColor("#FDECF0")
PINKBD = colors.HexColor("#F2C5D0")
GRAY   = colors.HexColor("#43556B")
SUBTLE = colors.HexColor("#7B8797")
ALT    = colors.HexColor("#F3F6FB")

VOID = {"meta", "hr", "img", "link", "input"}

# ---------------------------------------------------------------- parser
class Doc(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.stack = []
        self.curbuf = None
        self.blocks = []

    def _cls(self, attrs):
        return dict(attrs).get("class", "") or ""

    def _role(self, tag, cls):
        if tag == "head":
            return "skip"
        if tag == "div" and "cover" in cls:
            return "skip"
        if tag == "div":
            for c in ("reg-head", "qa", "mc", "pub", "stem", "note", "disclaimer"):
                if c in cls.split():
                    return {"reg-head": "reghead", "qa": "qa", "mc": "mc",
                            "pub": "pub", "stem": "stem", "note": "note",
                            "disclaimer": "disc"}[c]
            if "q" in cls.split():
                return "q"
            if "a" in cls.split():
                return "a"
            return "plain"
        if tag == "span":
            if "ans" in cls.split():
                return "ans"
            if "currency" in cls.split():
                return "currency"
            return "plain"
        return {
            "table": "table", "tr": "tr", "th": "cellh", "td": "celld",
            "ol": "ol", "ul": "ul", "li": "li",
            "h1": "part", "h2": "h2", "h3": "h3", "p": "p", "section": "section",
        }.get(tag, "plain")

    LEAF = {"pub", "stem", "note", "disc", "q", "a", "ans", "currency",
            "cellh", "celld", "li", "part", "h2", "h3", "p"}

    def _in_skip(self):
        return any(f["role"] == "skip" or f.get("skip") for f in self.stack)

    def handle_starttag(self, tag, attrs):
        if tag in ("b", "i"):
            if self.curbuf is not None:
                self.curbuf.append("<%s>" % tag)
            return
        if tag == "br":
            if self.curbuf is not None:
                self.curbuf.append("<br/>")
            return
        if tag in VOID:
            return
        cls = self._cls(attrs)
        role = self._role(tag, cls)
        skip = self._in_skip() or role == "skip"
        frame = {"tag": tag, "role": role, "cls": cls, "skip": skip,
                 "buf": [], "options": [], "items": [], "rows": [], "cells": []}
        if role in self.LEAF and not skip:
            self.curbuf = frame["buf"]
        self.stack.append(frame)
        if role == "section":
            self.blocks.append(("newpage",))

    def handle_startendtag(self, tag, attrs):
        if tag == "br" and self.curbuf is not None:
            self.curbuf.append("<br/>")

    def handle_data(self, data):
        if self.curbuf is not None:
            self.curbuf.append(data)

    def handle_entityref(self, name):
        if self.curbuf is not None:
            self.curbuf.append("&%s;" % name)

    def handle_charref(self, name):
        if self.curbuf is not None:
            self.curbuf.append("&#%s;" % name)

    def handle_endtag(self, tag):
        if tag in ("b", "i"):
            if self.curbuf is not None:
                self.curbuf.append("</%s>" % tag)
            return
        if tag in VOID or tag == "br":
            return
        if not self.stack:
            return
        f = self.stack.pop()
        self.curbuf = None
        if f["skip"]:
            return
        text = re.sub(r"\s+", " ", "".join(f["buf"])).strip()
        parent = self.stack[-1] if self.stack else None
        role = f["role"]
        if role == "pub":
            if parent: parent["pub"] = text
        elif role == "h2":
            if parent and parent["role"] == "reghead":
                parent["title"] = text
            else:
                self.blocks.append(("h2", text))
        elif role == "part":
            self.blocks.append(("part", text))
        elif role == "currency":
            self.blocks.append(("currency", text))
        elif role == "h3":
            self.blocks.append(("block", text))
        elif role == "q":
            if parent: parent["q"] = text
        elif role == "a":
            if parent: parent["a"] = text
        elif role == "stem":
            if parent: parent["stem"] = text
        elif role == "ans":
            if parent: parent["ans"] = text
        elif role == "li":
            if parent and parent["role"] == "ol":
                parent["options"].append(text)
            elif parent and parent["role"] == "ul":
                parent["items"].append(text)
        elif role in ("cellh", "celld"):
            if parent:
                parent["cells"].append((text, role == "cellh"))
        elif role == "reghead":
            self.blocks.append(("reghead", f.get("pub"), f.get("title")))
        elif role == "qa":
            self.blocks.append(("qa", f.get("q", ""), f.get("a", "")))
        elif role == "mc":
            self.blocks.append(("mc", f.get("stem", ""), f.get("options", []), f.get("ans", "")))
        elif role == "tr":
            if parent: parent["rows"].append(f["cells"])
        elif role == "ol":
            if parent and parent["role"] == "mc":
                parent["options"] = f["options"]
        elif role == "ul":
            self.blocks.append(("ul", f["items"]))
        elif role == "table":
            self.blocks.append(("table", f["rows"]))
        elif role == "note":
            self.blocks.append(("callout", "note", text))
        elif role == "disc":
            self.blocks.append(("callout", "disc", text))
        elif role == "p":
            if text:
                self.blocks.append(("p", text, f["cls"]))


# ---------------------------------------------------------------- text conv
_SENT = {"<b>": "\x01b\x02", "</b>": "\x01/b\x02", "<i>": "\x01i\x02", "</i>": "\x01/i\x02"}
_FIX = {"→": "->", "≤": "<=", "≥": ">=", "▸": "-", "‑": "-"}

def rl(s):
    if not s:
        return ""
    for k, v in _SENT.items():
        s = s.replace(k, v)
    s = re.sub(r"<br\s*/?>", "\x01br\x02", s)
    s = _html.unescape(s)
    for k, v in _FIX.items():
        s = s.replace(k, v)
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = (s.replace("\x01b\x02", "<b>").replace("\x01/b\x02", "</b>")
          .replace("\x01i\x02", "<i>").replace("\x01/i\x02", "</i>")
          .replace("\x01br\x02", "<br/>"))
    return s


# ---------------------------------------------------------------- styles
def styles():
    base = ParagraphStyle("base", fontName="Helvetica", fontSize=9.5, leading=12.5,
                          textColor=colors.HexColor("#11202f"))
    return {
        "base": base,
        "q": ParagraphStyle("q", parent=base, fontName="Helvetica-Bold", textColor=NAVY),
        "a": ParagraphStyle("a", parent=base, textColor=GREEN, leftIndent=10),
        "stem": ParagraphStyle("stem", parent=base, fontName="Helvetica-Bold", textColor=NAVY),
        "opt": ParagraphStyle("opt", parent=base, leftIndent=12, leading=12),
        "ans": ParagraphStyle("ans", parent=base, fontSize=8.8, textColor=GREEN, leading=11.5),
        "title": ParagraphStyle("title", parent=base, fontName="Helvetica-Bold",
                                fontSize=15, leading=18, textColor=NAVY),
        "pub": ParagraphStyle("pub", parent=base, fontName="Helvetica-Bold",
                              fontSize=9, textColor=BLUE),
        "h2": ParagraphStyle("h2", parent=base, fontName="Helvetica-Bold",
                             fontSize=15, leading=18, textColor=NAVY),
        "block": ParagraphStyle("block", parent=base, fontName="Helvetica-Bold",
                                fontSize=10, textColor=RED, spaceBefore=6, spaceAfter=2),
        "currency": ParagraphStyle("currency", parent=base, fontSize=8.5, textColor=GRAY,
                                   leading=11),
        "small": ParagraphStyle("small", parent=base, fontSize=9, textColor=SUBTLE, leading=11.5),
        "callout": ParagraphStyle("callout", parent=base, fontSize=9.2, leading=12),
        "banner": ParagraphStyle("banner", parent=base, fontName="Helvetica-Bold",
                                 fontSize=15, textColor=colors.white),
        "cover_kick": ParagraphStyle("ck", parent=base, fontName="Helvetica-Bold",
                                     fontSize=11, textColor=RED, alignment=TA_CENTER),
        "cover_title": ParagraphStyle("ct", parent=base, fontName="Helvetica-Bold",
                                      fontSize=30, leading=34, textColor=NAVY, alignment=TA_CENTER),
        "cover_sub": ParagraphStyle("cs", parent=base, fontSize=13, leading=17,
                                    textColor=GRAY, alignment=TA_CENTER),
        "cover_meta": ParagraphStyle("cm", parent=base, fontSize=9.5, leading=14,
                                     textColor=SUBTLE, alignment=TA_CENTER),
        "li": ParagraphStyle("li", parent=base, leftIndent=14, bulletIndent=4),
    }


def box(flow, bg, bd, pad=7):
    t = Table([[flow]], colWidths=[6.7 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.75, bd),
        ("LEFTPADDING", (0, 0), (-1, -1), pad),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), pad - 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad - 2),
    ]))
    return t


def build():
    with open(SRC, encoding="utf-8") as fh:
        doc = Doc()
        doc.feed(fh.read())
    blocks = doc.blocks
    S = styles()
    story = []

    def add_break():
        if story and not isinstance(story[-1], PageBreak):
            story.append(PageBreak())

    # ----- cover -----
    story.append(Spacer(1, 2.4 * inch))
    story.append(Paragraph("SOLDIER HUB &middot; CONNECT &middot; SHARE &middot; SUPPORT".replace("&middot;", "·"), S["cover_kick"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Army Promotion Board<br/>Study Guide", S["cover_title"]))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="40%", thickness=3, color=RED, spaceBefore=4, spaceAfter=10, hAlign="CENTER"))
    story.append(Paragraph("NCO / Soldier of the Month &amp; Semi-Centralized Promotion Boards", S["cover_sub"]))
    story.append(Paragraph("Organized by regulation · Open-ended Q&amp;A + Multiple choice", S["cover_sub"]))
    story.append(Spacer(1, 1.1 * inch))
    story.append(Paragraph(
        "Compiled June 2026 · Reflects current Army doctrine including the Army "
        "Fitness Test (AFT), the AR 600-9 Waist-to-Height standard, and the "
        "September 2025 AR 670-1 grooming directive.", S["cover_meta"]))

    pending_banner = [None]

    for b in blocks:
        kind = b[0]
        if kind == "newpage":
            add_break()
            if pending_banner[0]:
                story.append(box(Paragraph(pending_banner[0], S["banner"]), NAVY, NAVY, pad=10))
                story.append(Spacer(1, 10))
                pending_banner[0] = None
            continue
        if kind == "part":
            pending_banner[0] = rl(b[1])
            continue
        if kind == "reghead":
            pub, title = b[1], b[2]
            if pub:
                story.append(Paragraph(rl(pub), S["pub"]))
            if title:
                story.append(Paragraph(rl(title), S["title"]))
            story.append(HRFlowable(width="100%", thickness=1.4, color=RED, spaceBefore=2, spaceAfter=4))
            continue
        if kind == "h2":
            story.append(Paragraph(rl(b[1]), S["h2"]))
            story.append(HRFlowable(width="100%", thickness=1.4, color=RED, spaceBefore=2, spaceAfter=4))
            continue
        if kind == "currency":
            story.append(box(Paragraph(rl(b[1]), S["currency"]), LIGHTBOX, BOXBD, pad=6))
            story.append(Spacer(1, 6))
            continue
        if kind == "block":
            story.append(Paragraph(rl(b[1]).upper(), S["block"]))
            story.append(HRFlowable(width="100%", thickness=0.5, color=BOXBD, spaceBefore=0, spaceAfter=4))
            continue
        if kind == "qa":
            q = Paragraph(rl(b[1]), S["q"])
            a = Paragraph("• " + rl(b[2]), S["a"])
            story.append(KeepTogether([q, a, Spacer(1, 5)]))
            continue
        if kind == "mc":
            stem, opts, ans = b[1], b[2], b[3]
            flow = [Paragraph(rl(stem), S["stem"])]
            letters = "ABCDEFGH"
            optlines = "<br/>".join("<b>%s.</b> %s" % (letters[i], rl(o)) for i, o in enumerate(opts))
            flow.append(Paragraph(optlines, S["opt"]))
            flow.append(box(Paragraph(rl(ans), S["ans"]), GREENBG, GREENBD, pad=6))
            flow.append(Spacer(1, 7))
            story.append(KeepTogether(flow))
            continue
        if kind == "ul":
            for it in b[1]:
                story.append(Paragraph(rl(it), S["li"], bulletText="•"))
            story.append(Spacer(1, 4))
            continue
        if kind == "callout":
            bg, bd = (YELLOW, YELLOWBD) if b[1] == "note" else (PINK, PINKBD)
            story.append(box(Paragraph(rl(b[2]), S["callout"]), bg, bd, pad=8))
            story.append(Spacer(1, 6))
            continue
        if kind == "p":
            cls = b[2] if len(b) > 2 else ""
            st = S["small"] if ("small" in cls or "toc-note" in cls) else S["base"]
            story.append(Paragraph(rl(b[1]), st))
            story.append(Spacer(1, 4))
            continue
        if kind == "table":
            rows = b[1]
            if not rows:
                continue
            data = []
            for r in rows:
                data.append([Paragraph(rl(c), S["base"]) for c, _ in r])
            ncol = max(len(r) for r in data)
            for r in data:
                while len(r) < ncol:
                    r.append("")
            if ncol == 3:
                widths = [2.0 * inch, 1.9 * inch, 2.8 * inch]
            elif ncol == 4:
                widths = [1.7 * inch] * 1 + [1.66 * inch] * 3
            else:
                widths = [6.7 * inch / ncol] * ncol
            t = Table(data, colWidths=widths, repeatRows=1)
            ts = [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, BOXBD),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
            for ri in range(1, len(data)):
                if ri % 2 == 0:
                    ts.append(("BACKGROUND", (0, ri), (-1, ri), ALT))
            # header cells need white text -> rebuild header paragraphs
            hdr_style = ParagraphStyle("hdr", parent=S["base"], textColor=colors.white,
                                       fontName="Helvetica-Bold")
            data[0] = [Paragraph(p.text if hasattr(p, "text") else str(p), hdr_style) for p in data[0]]
            t = Table(data, colWidths=widths, repeatRows=1)
            t.setStyle(TableStyle(ts))
            story.append(t)
            story.append(Spacer(1, 6))
            continue

    def footer(canvas, d):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(SUBTLE)
        canvas.drawString(0.75 * inch, 0.5 * inch, "SoldierHub — Army Promotion Board Study Guide (unofficial)")
        canvas.drawRightString(7.75 * inch, 0.5 * inch, "Page %d" % d.page)
        canvas.restoreState()

    pdf = SimpleDocTemplate(OUT, pagesize=letter,
                            leftMargin=0.75 * inch, rightMargin=0.75 * inch,
                            topMargin=0.7 * inch, bottomMargin=0.8 * inch,
                            title="SoldierHub Board Prep Study Guide")
    pdf.build(story, onFirstPage=footer, onLaterPages=footer)
    print("wrote", OUT)


if __name__ == "__main__":
    build()
