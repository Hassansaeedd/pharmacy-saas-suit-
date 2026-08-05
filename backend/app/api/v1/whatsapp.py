import re
import httpx
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import User
from app.models.business import Business
from app.models.inventory import Medicine, Batch

router = APIRouter()

META_VERIFY_TOKEN = "pharmaflow_meta_verify_token_2026"

# --- META WEBHOOK VERIFICATION (GET) ---
@router.get("/webhook")
async def verify_whatsapp_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge")
):
    """
    Meta WhatsApp Cloud API Webhook Verification Endpoint.
    Meta sends GET request to verify the webhook endpoint.
    """
    if hub_mode == "subscribe" and hub_verify_token == META_VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification token mismatch")

# --- META INBOUND MESSAGE WEBHOOK (POST) ---
@router.post("/webhook")
async def handle_whatsapp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handles inbound WhatsApp messages from customers inquiring about medicine stock.
    Processes NLP text search against pharmacy catalog and sends automated response.
    """
    body = await request.json()
    
    try:
        entry = body.get("entry", [])[0]
        changes = entry.get("changes", [])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])
        
        if not messages:
            return {"status": "ignored", "reason": "No messages in payload"}

        msg = messages[0]
        from_phone = msg.get("from") # Customer's WhatsApp phone number
        text_body = msg.get("text", {}).get("body", "").strip()

        if not text_body:
            return {"status": "ignored", "reason": "Non-text message"}

        # Extract business_id if provided in query or default to business ID 1
        business_id = 1

        # Process medicine query NLP
        reply_text = await process_stock_query(db, business_id, text_body)

        # In production: Send reply via Meta WhatsApp Graph API using httpx
        # await send_whatsapp_message(from_phone, reply_text)

        return {
            "status": "success",
            "customer_phone": from_phone,
            "query": text_body,
            "reply": reply_text
        }

    except Exception as e:
        return {"status": "error", "detail": str(e)}

# --- DIRECT INQUIRY API FOR TESTING / FRONTEND ---
@router.post("/inquire")
async def inquire_medicine_stock(
    query: str = Query(..., description="Medicine query text e.g. 'Panadol' or 'Paracetamol'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Direct endpoint for testing NLP stock inquiry bot.
    """
    reply_text = await process_stock_query(db, current_user.business_id, query)
    return {
        "business_id": current_user.business_id,
        "query": query,
        "reply": reply_text
    }

async def process_stock_query(db: AsyncSession, business_id: int, query_text: str) -> str:
    """
    NLP / Keyword parser that extracts medicine name from query text
    and formats a friendly WhatsApp response.
    """
    clean_text = re.sub(r'[^\w\s]', '', query_text).strip()
    
    # Common query stop-words removal
    stop_words = {"is", "are", "do", "you", "have", "in", "stock", "available", "price", "of", "the", "a", "an", "at", "pharmacy", "please"}
    tokens = [word for word in clean_text.split() if word.lower() not in stop_words]
    search_keyword = " ".join(tokens) if tokens else clean_text

    if not search_keyword:
        return "Hello! Please provide a medicine brand or generic name to check stock availability. Example: 'Panadol' or 'Augmentin'."

    # Query DB for medicine match
    stmt = (
        select(Medicine)
        .options(selectinload(Medicine.batches))
        .where(
            Medicine.business_id == business_id,
            or_(
                Medicine.brand_name.ilike(f"%{search_keyword}%"),
                Medicine.generic_name.ilike(f"%{search_keyword}%")
            )
        )
    )
    res = await db.execute(stmt)
    medicines = res.scalars().all()

    if not medicines:
        return f"Sorry, '{search_keyword}' is currently not available in our catalog. Please contact our pharmacist for special orders."

    reply_lines = ["💊 *PharmaFlow Automated Stock Query* 💊\n"]
    for med in medicines[:3]:
        tot_stock = sum(b.quantity_in_stock for b in med.batches)
        availability = f"✅ In Stock ({tot_stock} {med.unit_type}s)" if tot_stock > 0 else "❌ Out of Stock"
        rx_note = " ⚠️ (Prescription Required)" if med.requires_prescription else ""

        reply_lines.append(
            f"• *{med.brand_name}* ({med.generic_name})\n"
            f"  Status: {availability}\n"
            f"  Price: Rs. {med.sale_price:.2f} per {med.unit_type}{rx_note}\n"
        )

    reply_lines.append("Thank you for contacting our pharmacy!")
    return "\n".join(reply_lines)
