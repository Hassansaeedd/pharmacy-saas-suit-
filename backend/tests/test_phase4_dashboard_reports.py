import pytest
from datetime import date, timedelta

@pytest.mark.asyncio
async def test_dashboard_summary_and_reports(client):
    # Onboard Pharmacy (Owner Pharmacist)
    resp = await client.post("/api/v1/auth/onboard", json={
        "name": "Khyber Medicare",
        "license_number": "LIC-KHY-99",
        "owner_full_name": "Dr. Khan",
        "owner_email": "khan@khybermed.pk",
        "owner_password": "Password123!"
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Medicine (Augmentin 1g)
    med_resp = await client.post("/api/v1/inventory/medicines", headers=headers, json={
        "brand_name": "Augmentin 1g",
        "generic_name": "Co-amoxiclav",
        "category": "tablet",
        "purchase_price": 200.0,
        "sale_price": 300.0,
        "reorder_threshold": 50
    })
    med_id = med_resp.json()["id"]

    # Add Batch expiring in 40 days (Qty: 20 -> Low stock!)
    b_resp = await client.post("/api/v1/inventory/batches", headers=headers, json={
        "medicine_id": med_id,
        "batch_number": "AUG-40D",
        "expiry_date": (date.today() + timedelta(days=40)).isoformat(),
        "quantity_in_stock": 20,
        "purchase_price": 200.0
    })

    # Complete a Sale (10 units @ 300.0)
    await client.post("/api/v1/pos/sales", headers=headers, json={
        "items": [{"medicine_id": med_id, "quantity": 10, "unit_price": 300.0}]
    })

    # 1. Test Dashboard Summary Endpoint
    dash_resp = await client.get("/api/v1/dashboard/summary", headers=headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert dash_data["today_sales_total"] == 3000.0 # 10 * 300.0
    assert dash_data["today_sales_count"] == 1
    assert len(dash_data["top_selling_medicines"]) == 1
    assert dash_data["top_selling_medicines"][0]["brand_name"] == "Augmentin 1g"
    assert dash_data["expiring_summary"]["expiring_60_days"] == 1

    # 2. Test Expiry Report Endpoint
    exp_resp = await client.get("/api/v1/reports/expiry?days=90", headers=headers)
    assert exp_resp.status_code == 200
    exp_items = exp_resp.json()
    assert len(exp_items) == 1
    assert exp_items[0]["batch_number"] == "AUG-40D"

    # 3. Test Expiry CSV Export
    csv_resp = await client.get("/api/v1/reports/expiry/csv?days=90", headers=headers)
    assert csv_resp.status_code == 200
    assert csv_resp.headers["content-type"] == "text/csv; charset=utf-8"
    assert "AUG-40D" in csv_resp.text
    assert "Augmentin 1g" in csv_resp.text

    # 4. Test Profit Report Endpoint
    profit_resp = await client.get("/api/v1/reports/profit", headers=headers)
    assert profit_resp.status_code == 200
    profit_data = profit_resp.json()
    assert profit_data["total_revenue"] == 3000.0
    # Profit = (300.0 - 200.0) * 10 = 1000.0
    assert profit_data["total_gross_profit"] == 1000.0
    assert profit_data["overall_margin_percentage"] == pytest.approx(33.33, rel=1e-2)
