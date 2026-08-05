import pytest

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["currency"] == "PKR"

@pytest.mark.asyncio
async def test_onboard_pharmacy_and_login(client):
    # 1. Onboard a new pharmacy tenant
    onboard_payload = {
        "name": "Al-Razi Pharmacy",
        "license_number": "LIC-PK-99481",
        "address": "Blue Area, Islamabad",
        "contact": "+92 300 1234567",
        "owner_full_name": "Dr. Tariq Mahmood",
        "owner_email": "tariq@alrazi.pk",
        "owner_password": "SecurePassword123!"
    }
    response = await client.post("/api/v1/auth/onboard", json=onboard_payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["business"]["name"] == "Al-Razi Pharmacy"
    assert data["user"]["role"] == "owner_pharmacist"
    assert data["business"]["subscription_status"] == "trial"

    # 2. Test login with created credentials
    login_payload = {
        "email": "tariq@alrazi.pk",
        "password": "SecurePassword123!"
    }
    login_resp = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # 3. Test /auth/me with bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["email"] == "tariq@alrazi.pk"

@pytest.mark.asyncio
async def test_multi_tenant_isolation_and_rbac(client):
    # Create Business A
    resp_a = await client.post("/api/v1/auth/onboard", json={
        "name": "Pharmacy A",
        "license_number": "LIC-A-101",
        "owner_full_name": "Owner A",
        "owner_email": "owner_a@pharm.pk",
        "owner_password": "Password123"
    })
    token_a = resp_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Business A owner creates a counter staff member
    staff_resp = await client.post("/api/v1/business/staff", headers=headers_a, json={
        "full_name": "Counter Staff A",
        "email": "staff_a@pharm.pk",
        "password": "StaffPassword123",
        "role": "counter_staff"
    })
    assert staff_resp.status_code == 201
    assert staff_resp.json()["role"] == "counter_staff"

    # Login as Counter Staff A
    staff_login = await client.post("/api/v1/auth/login", json={
        "email": "staff_a@pharm.pk",
        "password": "StaffPassword123"
    })
    token_staff = staff_login.json()["access_token"]
    headers_staff = {"Authorization": f"Bearer {token_staff}"}

    # Verify Counter Staff CANNOT create new staff (Requires owner_pharmacist role)
    forbidden_resp = await client.post("/api/v1/business/staff", headers=headers_staff, json={
        "full_name": "Rogue Staff",
        "email": "rogue@pharm.pk",
        "password": "RoguePassword123",
        "role": "counter_staff"
    })
    assert forbidden_resp.status_code == 403 # RBAC enforced!

    # Create Business B
    resp_b = await client.post("/api/v1/auth/onboard", json={
        "name": "Pharmacy B",
        "license_number": "LIC-B-202",
        "owner_full_name": "Owner B",
        "owner_email": "owner_b@pharm.pk",
        "owner_password": "Password123"
    })
    token_b = resp_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Verify Business B owner only sees Business B staff, NOT Business A staff
    staff_list_b = await client.get("/api/v1/business/staff", headers=headers_b)
    assert staff_list_b.status_code == 200
    b_emails = [u["email"] for u in staff_list_b.json()]
    assert "owner_b@pharm.pk" in b_emails
    assert "staff_a@pharm.pk" not in b_emails # Strict tenant isolation!
