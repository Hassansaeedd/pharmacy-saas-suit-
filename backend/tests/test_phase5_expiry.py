import pytest
from datetime import date, timedelta

@pytest.mark.asyncio
async def test_expiry_alerts_tiering_and_writeoff(client):
    # Onboard Pharmacy
    resp = await client.post("/api/v1/auth/onboard", json={
        "name": "Shaukat Farma",
        "license_number": "LIC-SF-777",
        "owner_full_name": "Dr. Shaukat",
        "owner_email": "shaukat@farma.pk",
        "owner_password": "Password123!"
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create a medicine
    med_resp = await client.post("/api/v1/inventory/medicines", headers=headers, json={
        "brand_name": "Metformin 500mg",
        "generic_name": "Metformin HCl",
        "category": "tablet",
        "sale_price": 50.0
    })
    med_id = med_resp.json()["id"]

    # Add 3 batches: critical (15d), warning (45d), monitor (75d)
    critical_date = (date.today() + timedelta(days=15)).isoformat()
    warning_date  = (date.today() + timedelta(days=45)).isoformat()
    monitor_date  = (date.today() + timedelta(days=75)).isoformat()

    b_critical = await client.post("/api/v1/inventory/batches", headers=headers, json={
        "medicine_id": med_id, "batch_number": "MET-CRIT", "expiry_date": critical_date, "quantity_in_stock": 10
    })
    b_warning = await client.post("/api/v1/inventory/batches", headers=headers, json={
        "medicine_id": med_id, "batch_number": "MET-WARN", "expiry_date": warning_date, "quantity_in_stock": 20
    })
    b_monitor = await client.post("/api/v1/inventory/batches", headers=headers, json={
        "medicine_id": med_id, "batch_number": "MET-MON", "expiry_date": monitor_date, "quantity_in_stock": 30
    })

    b_critical_id = b_critical.json()["id"]

    # 1. Test alerts endpoint
    alerts_resp = await client.get("/api/v1/expiry/alerts", headers=headers)
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()

    # Verify tiered sorting
    assert alerts["summary"]["critical_count"] == 1
    assert alerts["summary"]["warning_count"] == 1
    assert alerts["summary"]["monitor_count"] == 1
    assert alerts["critical"][0]["batch_number"] == "MET-CRIT"
    assert alerts["warning"][0]["batch_number"] == "MET-WARN"
    assert alerts["monitor"][0]["batch_number"] == "MET-MON"

    # 2. Test write-off endpoint (owner only)
    writeoff_resp = await client.post(
        f"/api/v1/expiry/batches/{b_critical_id}/write-off",
        headers=headers
    )
    assert writeoff_resp.status_code == 200
    assert writeoff_resp.json()["written_off_quantity"] == 10

    # 3. Verify the batch stock is now 0 and no longer appears in critical alerts
    alerts_after = await client.get("/api/v1/expiry/alerts", headers=headers)
    assert alerts_after.json()["summary"]["critical_count"] == 0
