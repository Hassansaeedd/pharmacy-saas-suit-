import pytest
from datetime import date, timedelta

@pytest.mark.asyncio
async def test_fefo_batch_auto_selection_and_stock_decrement(client):
    # Onboard Pharmacy (Owner Pharmacist)
    resp = await client.post("/api/v1/auth/onboard", json={
        "name": "Iqbal Pharmacy",
        "license_number": "LIC-IQB-786",
        "owner_full_name": "Dr. Iqbal",
        "owner_email": "iqbal@pharmacy.pk",
        "owner_password": "Password123!"
    })
    token_owner = resp.json()["access_token"]
    headers_owner = {"Authorization": f"Bearer {token_owner}"}

    # Create Medicine (Panadol 500mg)
    med_resp = await client.post("/api/v1/inventory/medicines", headers=headers_owner, json={
        "brand_name": "Panadol 500mg",
        "generic_name": "Paracetamol",
        "sale_price": 20.0
    })
    med_id = med_resp.json()["id"]

    # Add Batch A: Expiring in 90 Days, Qty: 50
    date_a = (date.today() + timedelta(days=90)).isoformat()
    b_a = await client.post("/api/v1/inventory/batches", headers=headers_owner, json={
        "medicine_id": med_id,
        "batch_number": "BATCH-LATER-90D",
        "expiry_date": date_a,
        "quantity_in_stock": 50
    })
    batch_a_id = b_a.json()["id"]

    # Add Batch B: Expiring in 15 Days (EARLIEST!), Qty: 30
    date_b = (date.today() + timedelta(days=15)).isoformat()
    b_b = await client.post("/api/v1/inventory/batches", headers=headers_owner, json={
        "medicine_id": med_id,
        "batch_number": "BATCH-SOON-15D",
        "expiry_date": date_b,
        "quantity_in_stock": 30
    })
    batch_b_id = b_b.json()["id"]

    # Checkout 20 units without specifying batch_id (FEFO Auto Selection)
    sale_resp = await client.post("/api/v1/pos/sales", headers=headers_owner, json={
        "items": [
            {"medicine_id": med_id, "quantity": 20, "unit_price": 20.0}
        ],
        "payment_method": "cash"
    })
    assert sale_resp.status_code == 201
    sale_data = sale_resp.json()
    assert sale_data["total_amount"] == 400.0 # 20 * 20.0
    assert len(sale_data["items"]) == 1

    # CRITICAL FEFO CHECK: System must automatically pick Batch B (earliest expiry!)
    sold_item = sale_data["items"][0]
    assert sold_item["batch_id"] == batch_b_id
    assert sold_item["batch_number"] == "BATCH-SOON-15D"

    # Verify Stock Decrement: Batch B had 30, now must have 10 left!
    med_check = await client.get(f"/api/v1/inventory/medicines/{med_id}", headers=headers_owner)
    med_info = med_check.json()
    assert med_info["total_stock"] == 60 # (30-20) + 50 = 60

@pytest.mark.asyncio
async def test_prescription_required_rbac_enforcement(client):
    # Onboard Pharmacy (Owner Pharmacist)
    resp = await client.post("/api/v1/auth/onboard", json={
        "name": "Nishtar Pharmacy",
        "license_number": "LIC-NIS-331",
        "owner_full_name": "Dr. Nishtar",
        "owner_email": "owner@nishtar.pk",
        "owner_password": "Password123!"
    })
    token_owner = resp.json()["access_token"]
    headers_owner = {"Authorization": f"Bearer {token_owner}"}

    # Owner creates Counter Staff user
    staff_resp = await client.post("/api/v1/business/staff", headers=headers_owner, json={
        "full_name": "Counter Staff Bilal",
        "email": "bilal@nishtar.pk",
        "password": "StaffPassword123",
        "role": "counter_staff"
    })
    token_staff = (await client.post("/api/v1/auth/login", json={
        "email": "bilal@nishtar.pk",
        "password": "StaffPassword123"
    })).json()["access_token"]
    headers_staff = {"Authorization": f"Bearer {token_staff}"}

    # Owner adds Prescription-Required Medicine (Xanax - Alprazolam)
    med_resp = await client.post("/api/v1/inventory/medicines", headers=headers_owner, json={
        "brand_name": "Xanax 0.5mg",
        "generic_name": "Alprazolam",
        "requires_prescription": True,
        "sale_price": 120.0
    })
    med_id = med_resp.json()["id"]

    # Add Stock Batch
    await client.post("/api/v1/inventory/batches", headers=headers_owner, json={
        "medicine_id": med_id,
        "batch_number": "XAN-990",
        "expiry_date": (date.today() + timedelta(days=100)).isoformat(),
        "quantity_in_stock": 100
    })

    # 1. Counter Staff attempts to sell without prescription approval -> REJECTED (400)
    unapproved_sale = await client.post("/api/v1/pos/sales", headers=headers_staff, json={
        "items": [{"medicine_id": med_id, "quantity": 10, "unit_price": 120.0}],
        "prescription_verified": False
    })
    assert unapproved_sale.status_code == 400

    # 2. Counter Staff attempts to self-verify prescription -> REJECTED (403 Forbidden - Role check!)
    self_verify_sale = await client.post("/api/v1/pos/sales", headers=headers_staff, json={
        "items": [{"medicine_id": med_id, "quantity": 10, "unit_price": 120.0}],
        "prescription_verified": True
    })
    assert self_verify_sale.status_code == 403

    # 3. Owner/Pharmacist completes sale with prescription_verified=True -> SUCCESS (201)
    approved_sale = await client.post("/api/v1/pos/sales", headers=headers_owner, json={
        "items": [{"medicine_id": med_id, "quantity": 10, "unit_price": 120.0}],
        "prescription_verified": True
    })
    assert approved_sale.status_code == 201
    sale_id = approved_sale.json()["id"]

    # 4. Download PDF Receipt
    pdf_resp = await client.get(f"/api/v1/pos/sales/{sale_id}/receipt", headers=headers_owner)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert pdf_resp.content.startswith(b"%PDF") # Valid PDF header!
