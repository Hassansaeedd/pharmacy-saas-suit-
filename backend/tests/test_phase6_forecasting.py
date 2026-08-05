import pytest
from datetime import date, timedelta

@pytest.mark.asyncio
async def test_scikit_learn_forecasting_and_purchase_orders(client):
    # Onboard Pharmacy
    resp = await client.post("/api/v1/auth/onboard", json={
        "name": "Medicare Forecast Pharmacy",
        "license_number": "LIC-FC-001",
        "owner_full_name": "Dr. Tariq ML",
        "owner_email": "tariq@forecast.pk",
        "owner_password": "Password123!"
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Supplier
    sup_resp = await client.post("/api/v1/inventory/suppliers", headers=headers, json={
        "name": "GSK Pakistan Distributors"
    })
    sup_id = sup_resp.json()["id"]

    # Create Medicine (Panadol)
    med_resp = await client.post("/api/v1/inventory/medicines", headers=headers, json={
        "brand_name": "Panadol 500mg",
        "generic_name": "Paracetamol",
        "sale_price": 25.0,
        "reorder_threshold": 30
    })
    med_id = med_resp.json()["id"]

    # Add Batch (Stock: 15 -> Below reorder_threshold of 30!)
    await client.post("/api/v1/inventory/batches", headers=headers, json={
        "medicine_id": med_id,
        "batch_number": "PAN-FC-1",
        "expiry_date": (date.today() + timedelta(days=45)).isoformat(),
        "quantity_in_stock": 15,
        "supplier_id": sup_id
    })

    # Record 2 Sales to establish historical velocity
    await client.post("/api/v1/pos/sales", headers=headers, json={
        "items": [{"medicine_id": med_id, "quantity": 5, "unit_price": 25.0}]
    })

    # 1. Test Reorder Forecast ML Endpoint
    fc_resp = await client.get("/api/v1/forecasting/reorder", headers=headers)
    assert fc_resp.status_code == 200
    forecasts = fc_resp.json()
    assert len(forecasts) == 1
    item = forecasts[0]
    assert item["brand_name"] == "Panadol 500mg"
    assert item["needs_reorder"] == True
    assert item["suggested_reorder_qty"] > 0
    assert item["primary_supplier"] == "GSK Pakistan Distributors"

    # 2. Test Purchase Order Generation Endpoint
    po_resp = await client.get("/api/v1/forecasting/purchase-orders", headers=headers)
    assert po_resp.status_code == 200
    po_data = po_resp.json()
    assert po_data["total_purchase_orders"] == 1
    po = po_data["purchase_orders"][0]
    assert po["supplier_name"] == "GSK Pakistan Distributors"
    assert len(po["items"]) == 1
    assert po["items"][0]["brand_name"] == "Panadol 500mg"
