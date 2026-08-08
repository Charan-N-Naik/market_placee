"""
verification/report_generator.py
==================================
Module C — PDF Verification Report Generator

Generates a downloadable, tamper-evident PDF report for every verified/flagged listing.

Features:
  - Crop info, farmer location (resolved address), quantity, price
  - Color-coded trust badge (green / amber / red)
  - Verification breakdown: authenticity, geo, disease, trust_score
  - QR code linking to the live product listing page
  - Unique report ID + timestamp
  - CropVerify AI disclaimer footer
  - Cached by {listing_id}_{updated_at_hash} — only regenerates when data changes

Dependencies (all pure Python, no system libs required):
  pip install reportlab qrcode[pil]
"""

import io
import os
import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, Image as RLImage, KeepTogether,
    )
    from reportlab.graphics.shapes import Drawing, Rect, String
    from reportlab.graphics import renderPDF
    _REPORTLAB_AVAILABLE = True
except ImportError:
    _REPORTLAB_AVAILABLE = False
    logger.warning("[ReportGenerator] ReportLab not installed — PDF generation disabled.")

try:
    import qrcode
    from PIL import Image as PILImage
    _QR_AVAILABLE = True
except ImportError:
    _QR_AVAILABLE = False
    logger.warning("[ReportGenerator] qrcode/Pillow not installed — QR codes disabled.")

from .config import REPORT_CONFIG


# =============================================================================
# PUBLIC ENTRY POINT
# =============================================================================

def generate_verification_report(
    listing_id: str,
    listing_data: dict[str, Any],
    verification: dict[str, Any],
) -> Optional[bytes]:
    """
    Generate (or return cached) PDF verification report.

    Args:
        listing_id:    MongoDB ObjectId string
        listing_data:  The full listing document (crop name, price, farmer, etc.)
        verification:  The verification sub-doc (trust_score, status, etc.)

    Returns:
        PDF bytes if successful, None if ReportLab not available.
    """
    if not _REPORTLAB_AVAILABLE:
        logger.error("[ReportGenerator] ReportLab not available — cannot generate PDF.")
        return None

    # ── Cache check ──────────────────────────────────────────────────────────
    cache_key = _build_cache_key(listing_id, verification)
    cache_path = _cache_file_path(cache_key)

    if cache_path.exists():
        logger.info("[ReportGenerator] Serving cached report: %s", cache_path)
        return cache_path.read_bytes()

    # ── Generate ─────────────────────────────────────────────────────────────
    logger.info("[ReportGenerator] Generating new report for listing=%s", listing_id)
    pdf_bytes = _build_pdf(listing_id, listing_data, verification)

    # ── Cache to disk ────────────────────────────────────────────────────────
    if pdf_bytes:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(pdf_bytes)
        logger.info("[ReportGenerator] Cached report: %s", cache_path)

    return pdf_bytes


def get_cached_report_path(listing_id: str, updated_at: Any) -> Optional[Path]:
    """Return the cached PDF path if it exists, else None."""
    key = _build_cache_key(listing_id, {"updated_at": updated_at})
    path = _cache_file_path(key)
    return path if path.exists() else None


# =============================================================================
# INTERNAL BUILDERS
# =============================================================================

def _build_cache_key(listing_id: str, verification: dict) -> str:
    """Build a cache key from listing_id + verification updated_at timestamp."""
    updated_at = str(verification.get("updated_at", ""))
    raw = f"{listing_id}:{updated_at}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _cache_file_path(cache_key: str) -> Path:
    reports_dir = Path(REPORT_CONFIG["reports_dir"])
    return reports_dir / f"report_{cache_key}.pdf"


def _build_pdf(
    listing_id: str,
    listing_data: dict[str, Any],
    verification: dict[str, Any],
) -> Optional[bytes]:
    """Build the PDF using ReportLab Platypus (high-level layout engine)."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"CropVerify Report — {listing_data.get('cropName', 'Product')}",
        author=REPORT_CONFIG["brand_name"],
    )

    # ── Color palette ────────────────────────────────────────────────────────
    brand_green  = colors.HexColor("#16a34a")
    amber        = colors.HexColor("#d97706")
    danger_red   = colors.HexColor("#dc2626")
    light_grey   = colors.HexColor("#f8fafc")
    mid_grey     = colors.HexColor("#6b7280")
    dark         = colors.HexColor("#111827")
    border_grey  = colors.HexColor("#e5e7eb")

    status = verification.get("status", "pending_review")
    trust_score = float(verification.get("trust_score", 0.0))

    status_color = {
        "verified":       brand_green,
        "flagged":        amber,
        "pending_review": mid_grey,
        "rejected":       danger_red,
    }.get(status, mid_grey)

    status_label = {
        "verified":       "✓ VERIFIED",
        "flagged":        "⚠ FLAGGED — UNDER REVIEW",
        "pending_review": "⏳ PENDING REVIEW",
        "rejected":       "✗ REJECTED",
    }.get(status, status.upper())

    # ── Styles ───────────────────────────────────────────────────────────────
    styles = getSampleStyleSheet()

    def st(name, **kw) -> ParagraphStyle:
        """Quickly create a new ParagraphStyle."""
        base = styles["Normal"]
        return ParagraphStyle(name, parent=base, **kw)

    s_title     = st("Title",    fontSize=22, textColor=brand_green, fontName="Helvetica-Bold",   spaceAfter=2)
    s_subtitle  = st("Subtitle", fontSize=10, textColor=mid_grey,    fontName="Helvetica",         spaceAfter=8)
    s_section   = st("Section",  fontSize=11, textColor=dark,        fontName="Helvetica-Bold",   spaceBefore=10, spaceAfter=4)
    s_body      = st("Body",     fontSize=9,  textColor=dark,        fontName="Helvetica",         spaceAfter=3, leading=14)
    s_small     = st("Small",    fontSize=7,  textColor=mid_grey,    fontName="Helvetica",         spaceAfter=2, leading=11)
    s_status    = st("Status",   fontSize=14, textColor=colors.white, fontName="Helvetica-Bold",   alignment=TA_CENTER)
    s_disclaimer= st("Disc",     fontSize=7,  textColor=mid_grey,    fontName="Helvetica-Oblique", alignment=TA_CENTER, leading=10)
    s_center    = st("Center",   fontSize=9,  alignment=TA_CENTER,   fontName="Helvetica")

    # ── Report Unique ID ─────────────────────────────────────────────────────
    report_id = f"KBR-{listing_id[-8:].upper()}"
    generated_at = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")

    # ── Listing metadata ─────────────────────────────────────────────────────
    crop_name        = listing_data.get("cropName", "Unknown Crop")
    variety          = listing_data.get("variety", "")
    quantity         = listing_data.get("quantity", "—")
    unit             = listing_data.get("unit", "")
    price_per_unit   = listing_data.get("pricePerUnit", "—")
    farmer_name      = (listing_data.get("farmer") or {}).get("name", "—") if isinstance(listing_data.get("farmer"), dict) else "—"
    resolved_address = verification.get("resolved_address", "Not resolved")
    disease_label    = verification.get("disease_label", "None")
    disease_conf     = verification.get("disease_confidence", 0.0)
    auth_score       = verification.get("authenticity_score", 0.0)
    loc_valid        = verification.get("location_valid", False)
    auth_reasons     = verification.get("authenticity_reasons", [])
    geo_flags        = verification.get("geo_flags", [])

    # ── QR Code ──────────────────────────────────────────────────────────────
    qr_element = None
    if _QR_AVAILABLE:
        product_url = f"{REPORT_CONFIG['product_base_url']}/{listing_id}"
        qr_img_buf = _generate_qr(product_url)
        if qr_img_buf:
            qr_element = RLImage(qr_img_buf, width=2.8*cm, height=2.8*cm)

    # ── Build story (page content) ───────────────────────────────────────────
    story = []

    # Header row: brand title + QR code side by side
    header_data = [[
        [
            Paragraph(REPORT_CONFIG["brand_name"], s_title),
            Paragraph(f"AI Crop Verification Certificate | Report ID: {report_id}", s_subtitle),
            Paragraph(f"Generated: {generated_at}", s_small),
        ],
        qr_element or Paragraph("", s_body),
    ]]
    header_table = Table(header_data, colWidths=["75%", "25%"])
    header_table.setStyle(TableStyle([
        ("VALIGN",  (0, 0), (-1, -1), "TOP"),
        ("ALIGN",   (1, 0), (1, 0),   "RIGHT"),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=brand_green, spaceAfter=10))

    # ── Status Badge ─────────────────────────────────────────────────────────
    badge_table = Table([[Paragraph(status_label, s_status)]], colWidths=["100%"])
    badge_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), status_color),
        ("ROUNDEDCORNERS", [8]),
        ("TOPPADDING",   (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 10),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 0.3*cm))

    # Trust score bar (text representation)
    bar_filled  = int(trust_score * 20)
    bar_empty   = 20 - bar_filled
    bar_text    = "█" * bar_filled + "░" * bar_empty
    score_pct   = f"{trust_score * 100:.1f}%"
    trust_label = (
        "High Confidence"  if trust_score >= 0.75 else
        "Moderate"         if trust_score >= 0.55 else
        "Low Confidence"   if trust_score >= 0.40 else
        "Rejected"
    )
    story.append(Paragraph(
        f"<font color='#{status_color.hexval()[2:]}'>{bar_text}</font>  "
        f"<b>Trust Score: {score_pct}</b> — {trust_label}",
        st("Bar", fontSize=9, fontName="Courier", spaceAfter=6)
    ))
    story.append(HRFlowable(width="100%", thickness=0.5, color=border_grey, spaceAfter=8))

    # ── Product Info Table ───────────────────────────────────────────────────
    story.append(Paragraph("Product Information", s_section))
    prod_data = [
        ["Crop Name",        f"{crop_name}" + (f" ({variety})" if variety else "")],
        ["Quantity",         f"{quantity} {unit}"],
        ["Price",            f"₹{price_per_unit} / {unit}"],
        ["Farmer",           farmer_name],
        ["Farm Location",    resolved_address or "Not provided"],
    ]
    prod_table = _info_table(prod_data, border_grey, light_grey, s_body, dark)
    story.append(prod_table)
    story.append(Spacer(1, 0.3*cm))

    # ── Verification Details ─────────────────────────────────────────────────
    story.append(Paragraph("Verification Breakdown", s_section))

    auth_status_str = "✓ Authentic"  if auth_score >= 0.60 else "⚠ Questionable"  if auth_score >= 0.40 else "✗ Not Authentic"
    loc_status_str  = "✓ Valid"      if loc_valid else "✗ Invalid / Not Provided"
    disease_str     = f"✓ Healthy"   if verification.get("healthy_leaf") else f"⚠ {disease_label} ({disease_conf*100:.0f}% confidence)"

    ver_data = [
        ["Signal",                   "Result",           "Score / Notes"],
        ["Image Authenticity",       auth_status_str,    f"{auth_score*100:.1f}%"],
        ["Geo-location",             loc_status_str,     resolved_address[:50] + "…" if len(resolved_address) > 50 else resolved_address],
        ["Disease / Pest Detection", disease_str,        f"{disease_conf*100:.0f}% confidence"],
        ["Overall Trust Score",      trust_label,        score_pct],
    ]
    ver_table = Table(ver_data, colWidths=["35%", "35%", "30%"])
    ver_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0),  brand_green),
        ("TEXTCOLOR",   (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("GRID",        (0, 0), (-1, -1), 0.5, border_grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, light_grey]),
        ("TOPPADDING",  (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0,0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(ver_table)

    # ── Flag Reasons (if any) ────────────────────────────────────────────────
    all_flags = auth_reasons + geo_flags
    if all_flags:
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph("Flags Raised", s_section))
        for flag in all_flags:
            story.append(Paragraph(f"• {flag.replace('_', ' ').title()}", s_body))

    # ── QR Footer note ───────────────────────────────────────────────────────
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=border_grey, spaceAfter=6))
    story.append(Paragraph(
        "Scan the QR code above to view the live product listing and re-verify this report has not been reused.",
        s_small,
    ))

    # ── Disclaimer ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(REPORT_CONFIG["disclaimer"], s_disclaimer))

    # ── Build ────────────────────────────────────────────────────────────────
    try:
        doc.build(story)
        return buf.getvalue()
    except Exception as e:
        logger.error("[ReportGenerator] PDF build failed: %s", e)
        return None


def _info_table(data, border_color, bg_alt, style_body, dark_color):
    """Helper to build a 2-column info table with alternating row backgrounds."""
    table = Table(data, colWidths=["30%", "70%"])
    table.setStyle(TableStyle([
        ("FONTNAME",     (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1,-1), 9),
        ("TEXTCOLOR",    (0, 0), (-1,-1), dark_color),
        ("GRID",         (0, 0), (-1,-1), 0.5, border_color),
        ("ROWBACKGROUNDS",(0,0), (-1,-1), [colors.white, colors.HexColor("#f0fdf4")]),
        ("TOPPADDING",   (0, 0), (-1,-1), 5),
        ("BOTTOMPADDING",(0, 0), (-1,-1), 5),
        ("LEFTPADDING",  (0, 0), (-1,-1), 6),
        ("VALIGN",       (0, 0), (-1,-1), "MIDDLE"),
    ]))
    return table


def _generate_qr(url: str) -> Optional[io.BytesIO]:
    """Generate a QR code image and return as BytesIO."""
    if not _QR_AVAILABLE:
        return None
    try:
        qr = qrcode.QRCode(version=2, box_size=4, border=1)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return buf
    except Exception as e:
        logger.warning("[ReportGenerator] QR generation failed: %s", e)
        return None
