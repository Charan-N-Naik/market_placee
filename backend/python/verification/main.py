"""
verification/main.py
=====================
FastAPI application — CropVerify AI Verification Microservice
Runs on port 5002 as an internal service called by the Node.js backend.

Endpoints:
  POST /verify/upload-product        → full verification pipeline
  GET  /verify/product/{id}          → fetch product + verification from MongoDB
  GET  /verify/product/{id}/report   → generate / serve cached PDF report
  GET  /verify/health                → health check
"""

import os
import io
import logging
from typing import Optional, Annotated

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Header
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv

# Load env from parent python dir
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from .verification_service import run_verification
from .report_generator import generate_verification_report
from .db import get_listings_col, get_users_col, close_connection
from .config import SERVICE_HOST, SERVICE_PORT

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="CropVerify AI — Verification Microservice",
    description=(
        "Internal microservice for Image Authenticity, Geo-location Validation, "
        "Trust Scoring, and PDF Report generation. "
        "Called exclusively by the KisanBazaar Node.js backend — not directly by clients."
    ),
    version="1.0.0",
    docs_url="/verify/docs",
    redoc_url="/verify/redoc",
)

# Allow calls only from localhost (Node backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5000", "http://localhost:5000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    await close_connection()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/verify/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "cropverify-ai", "port": SERVICE_PORT}


# ---------------------------------------------------------------------------
# POST /verify/upload-product
# ---------------------------------------------------------------------------
@app.post("/verify/upload-product", tags=["Verification"])
async def upload_product(
    image: UploadFile = File(..., description="Crop photo file"),
    listing_id: str   = Form(..., description="MongoDB ObjectId of the created listing"),
    farmer_id:  str   = Form(..., description="MongoDB ObjectId of the authenticated farmer"),
    crop_name:  str   = Form("Unknown"),
    lat:        Optional[float] = Form(None, description="GPS latitude"),
    lon:        Optional[float] = Form(None, description="GPS longitude"),
    idempotency_key: Optional[str] = Form(None),
):
    """
    Run the full verification pipeline for a newly created listing.

    Called by the Node.js backend after creating the listing document in MongoDB.
    Auth is enforced at the Node layer — this endpoint trusts the caller.

    Returns the verification result dict which the Node backend can forward to the client.
    """
    # Validate ObjectIds
    for field_name, value in [("listing_id", listing_id), ("farmer_id", farmer_id)]:
        try:
            ObjectId(value)
        except (InvalidId, Exception):
            raise HTTPException(status_code=422, detail=f"Invalid {field_name}: '{value}'")

    # Read image bytes
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    mime_type = image.content_type or "image/jpeg"

    logger.info(
        "[API] POST /verify/upload-product listing=%s farmer=%s size=%d bytes",
        listing_id, farmer_id, len(image_bytes),
    )

    result = await run_verification(
        image_bytes=image_bytes,
        image_mime=mime_type,
        listing_id=listing_id,
        crop_name=crop_name,
        lat=lat,
        lon=lon,
        farmer_id=farmer_id,
        idempotency_key=idempotency_key,
    )

    # Serialize datetime objects to ISO strings for JSON response
    for key in ("verified_at", "updated_at"):
        if result.get(key) and hasattr(result[key], "isoformat"):
            result[key] = result[key].isoformat()

    logger.info(
        "[API] Verification complete listing=%s status=%s trust=%.3f",
        listing_id, result.get("status"), result.get("trust_score"),
    )

    return JSONResponse(content={"success": True, "verification": result})


# ---------------------------------------------------------------------------
# GET /verify/product/{id}
# ---------------------------------------------------------------------------
@app.get("/verify/product/{listing_id}", tags=["Products"])
async def get_product(listing_id: str):
    """
    Fetch a product listing document including its verification sub-doc.
    Accessible to both farmers and buyers (public product data).
    """
    try:
        oid = ObjectId(listing_id)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid listing_id format.")

    col = get_listings_col()
    doc = await col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Listing '{listing_id}' not found.")

    # Serialize MongoDB document
    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("farmer"), ObjectId):
        doc["farmer"] = str(doc["farmer"])

    # Serialize datetime fields in verification
    verif = doc.get("verification", {})
    for key in ("verified_at", "updated_at"):
        if verif.get(key) and hasattr(verif[key], "isoformat"):
            verif[key] = verif[key].isoformat()

    return JSONResponse(content={"success": True, "listing": doc})


# ---------------------------------------------------------------------------
# GET /verify/product/{id}/report
# ---------------------------------------------------------------------------
@app.get("/verify/product/{listing_id}/report", tags=["Reports"])
async def get_verification_report(listing_id: str):
    """
    Generate (or serve cached) a PDF verification report for this listing.

    Requirements:
      - Listing must exist in MongoDB
      - Verification status must be 'verified' or 'flagged' (not pending_review)

    Response: PDF file download (application/pdf)
    Caching: keyed by listing_id + verification.updated_at — regenerates only when data changes.
    """
    try:
        oid = ObjectId(listing_id)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid listing_id format.")

    col = get_listings_col()
    doc = await col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Listing '{listing_id}' not found.")

    verif = doc.get("verification", {})
    status = verif.get("status", "pending_review")

    if status == "pending_review":
        raise HTTPException(
            status_code=409,
            detail=(
                "Verification is still pending review. "
                "The report will be available once verification is complete."
            ),
        )
    if status == "rejected":
        raise HTTPException(
            status_code=403,
            detail="This listing was rejected — no verification report is available.",
        )

    # Fetch farmer details for the report
    farmer_doc = {}
    if isinstance(doc.get("farmer"), ObjectId):
        farmer_doc = await get_users_col().find_one(
            {"_id": doc["farmer"]}, {"name": 1, "phone": 1, "location": 1}
        ) or {}
        doc["farmer"] = {"name": farmer_doc.get("name", "—")}

    # Generate PDF
    pdf_bytes = generate_verification_report(
        listing_id=listing_id,
        listing_data=doc,
        verification=verif,
    )

    if not pdf_bytes:
        raise HTTPException(
            status_code=503,
            detail="PDF generation unavailable. Ensure 'reportlab' is installed.",
        )

    crop_name = doc.get("cropName", "product").replace(" ", "_")
    filename = f"CropVerify_Report_{crop_name}_{listing_id[-6:]}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Run directly for development
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "verification.main:app",
        host=SERVICE_HOST,
        port=SERVICE_PORT,
        reload=True,
        log_level="info",
    )
