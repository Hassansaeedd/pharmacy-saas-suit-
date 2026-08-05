import pytest

@pytest.mark.asyncio
async def test_whatsapp_webhook_verification_and_nlp_inquire(client):
    # 1. Meta Webhook Verification GET test
    verify_resp = await client.get(
        "/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=pharmaflow_meta_verify_token_2026&hub.challenge=test_challenge_123"
    )
    assert verify_resp.status_code == 200
    assert verify_resp.text == "test_challenge_123"

    # Onboard Pharmacy
    resp = await client.post("/api/v1/auth/onboard", json={
        "name": "Zamzam Pharmacy",
        "license_number": "LIC-ZAM-101",
        "owner_full_name": "Dr. Zamzam",
        "owner_email": "zamzam@pharmacy.pk",
        "owner_password": "Password123!"
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add Medicine (Brufen 400mg)
    await client.post("/api/v1/inventory/medicines", headers=headers, json={
        "brand_name": "Brufen 400mg",
        "generic_name": "Ibuprofen",
        "sale_price": 35.0
    })

    # 2. Test WhatsApp NLP Inquire Endpoint
    inquire_resp = await client.post(
        "/api/v1/whatsapp/inquire?query=Is%20Brufen%20available%20in%20stock%3F",
        headers=headers
    )
    assert inquire_resp.status_code == 200
    reply = inquire_resp.json()["reply"]
    assert "Brufen 400mg" in reply
    assert "Ibuprofen" in reply
    assert "Rs. 35.00" in reply

@pytest.mark.asyncio
async def test_strict_multi_tenant_isolation_audit(client):
    # Create Business Tenant A
    res_a = await client.post("/api/v1/auth/onboard", json={
        "name": "Tenant A Pharmacy",
        "license_number": "LIC-TA-01",
        "owner_full_name": "Owner A",
        "owner_email": "owner.a@tenant-a.pk",
        "owner_password": "Password123!"
    })
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    # Create Business Tenant B
    res_b = await client.post("/api/v1/auth/onboard", json={
        "name": "Tenant B Pharmacy",
        "license_number": "LIC-TB-02",
        "owner_full_name": "Owner B",
        "owner_email": "owner.b@tenant-b.pk",
        "owner_password": "Password123!"
    })
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # Tenant A adds Medicine A
    med_a = await client.post("/api/v1/inventory/medicines", headers=headers_a, json={
        "brand_name": "Tenant A Secret Drug",
        "generic_name": "DrugA",
        "sale_price": 500.0
    })
    med_a_id = med_a.json()["id"]

    # Tenant B lists medicines -> MUST NOT see Tenant A's medicine!
    list_b = await client.get("/api/v1/inventory/medicines", headers=headers_b)
    assert list_b.status_code == 200
    meds_b = list_b.json()
    assert len(meds_b) == 0

    # Tenant B tries to access Tenant A's medicine by ID -> 404 Not Found!
    direct_get = await client.get(f"/api/v1/inventory/medicines/{med_a_id}", headers=headers_b)
    assert direct_get.status_code == 404
