import pytest
from datetime import date, timedelta

@pytest.mark.asyncio
async def test_medicine_crud_and_dual_search(client):
    # Onboard pharmacy
    resp = await client.post("/api/v1/auth/onboard", json={
        "name": "Shifa Pharmacy",
        "license_number": "LIC-SHIFA-001",
        "owner_full_name": "Dr. Usman",
        "owner_email": "usman@shifa.pk",
        "owner_password": "Password123!"
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Medicine (Panadol Extra - Paracetamol)
    med_resp = await client.post("/api/v1/inventory/medicines", headers=headers, json={
        "brand_name": "Panadol Extra",
        "generic_name": "Paracetamol + Caffeine",
        "manufacturer": "GSK",
        "category": "tablet",
        "requires_prescription": False,
        "unit_type": "strip",
        "purchase_price": 45.0,
        "sale_price": 60.0,
        "reorder_threshold": 20
    })
    assert med_resp.status_code == 201
    med_data = med_resp.json()
    assert med_data["brand_name"] == "Panadol Extra"
    assert med_data["total_stock"] == 0

    # 2. Search by Brand Name ("Panadol")
    search_brand = await client.get("/api/v1/inventory/medicines?q=Panadol", headers=headers)
    assert search_brand.status_code == 200
    assert len(search_brand.json()) == 1

    # 3. Search by Generic Name ("Paracetamol")
    search_generic = await client.get("/api/v1/inventory/medicines?q=Paracetamol", headers=headers)
    assert search_generic.status_code == 200
    assert len(search_generic.json()) == 1

@pytest.mark.asyncio
async def test_batch_entry_validation_and_stock_aggregation(client):
    resp = await client.post("/api/v1/auth/onboard", json={
        "name": "Khyber Pharmacy",
        "license_number": "LIC-KHY-002",
        "owner_full_name": "Dr. Gul",
        "owner_email": "gul@khyber.pk",
        "owner_password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    # Create Medicine
    med_resp = await client.post("/api/v1/inventory/medicines", headers=headers, json={
        "brand_name": "Augmentin 625mg",
        "generic_name": "Co-amoxiclav",
        "category": "tablet",
        "requires_prescription": True,
        "unit_type": "box",
        "sale_price": 350.0
    })
    med_id = med_resp.json()["id"]

    # 1. Attempt batch entry with PAST expiry date (Should FAIL 400)
    past_date = (date.today() - timedelta(days=10)).isoformat()
    bad_batch = await client.post("/api/v1/inventory/batches", headers=headers, json={
        "medicine_id": med_id,
        "batch_number": "EXPIRED-101",
        "expiry_date": past_date,
        "quantity_in_stock": 50,
        "purchase_price": 250.0
    })
    assert bad_batch.status_code == 400
    assert "cannot be in the past" in bad_batch.json()["detail"]

    # 2. Add valid batch 1 (Expiring in 60 days)
    b1_date = (date.today() + timedelta(days=60)).isoformat()
    b1_resp = await client.post("/api/v1/inventory/batches", headers=headers, json={
        "medicine_id": med_id,
        "batch_number": "BATCH-2026A",
        "expiry_date": b1_date,
        "quantity_in_stock": 100,
        "purchase_price": 250.0
    })
    assert b1_resp.status_code == 201

    # 3. Add valid batch 2 (Expiring in 20 days - Near Expiry!)
    b2_date = (date.today() + timedelta(days=20)).isoformat()
    b2_resp = await client.post("/api/v1/inventory/batches", headers=headers, json={
        "medicine_id": med_id,
        "batch_number": "BATCH-2026B",
        "expiry_date": b2_date,
        "quantity_in_stock": 50,
        "purchase_price": 250.0
    })
    assert b2_resp.status_code == 201

    # 4. Verify aggregated medicine stock & earliest expiry calculation
    get_med = await client.get(f"/api/v1/inventory/medicines/{med_id}", headers=headers)
    assert get_med.status_code == 200
    med_obj = get_med.json()
    assert med_obj["total_stock"] == 150 # 100 + 50
    assert med_obj["earliest_expiry"] == b2_date # 20 days earliest!
