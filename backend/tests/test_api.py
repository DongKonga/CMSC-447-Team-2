"""
test_api.py - Automatic tests for the API

WHAT IS AN AUTOMATED TEST?
Instead of clicking around the /docs page every time we change
something, we write small functions that call the API and check the
answer is right. One command runs them all. If a change breaks
something, a test fails and tells us exactly what.

These tests can also go straight into our Testing Document (SCRUM-57).

HOW TO RUN THEM:
With the back end running (docker compose up), open a SECOND PowerShell
window in the backend folder and run:

    docker compose exec api pytest -v

"exec api" means "run this command inside the api container".
"-v" means "verbose", so it lists every test by name.

HOW A TEST WORKS:
pytest runs every function whose name starts with "test_".
Inside, "assert" means "this must be true". If it's false, the test fails.

NOTE: These tests save real rows into the database. That's fine for
local testing. Use "docker compose down -v" to wipe it clean afterward.
"""

# TestClient lets us call our API from Python as if we were a browser,
# without needing to start a real web server.
from fastapi.testclient import TestClient

from app.main import app

# One client for all the tests to share.
client = TestClient(app)


# A sample valid inspection we can reuse. Each test copies it with
# dict(...) so changing the copy doesn't change the original.
VALID_INSPECTION = {
    "bmp_id": "TEST-BMP-1",
    "inspector_name": "Test Inspector",
    "status": "Pass",
    "condition_notes": "Looks good.",
}


# ---------- Health ----------

def test_health_check_reports_ok():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"api": "ok", "database": "ok"}


# ---------- Inspections ----------

def test_passing_inspection_is_saved_without_email():
    response = client.post("/api/v1/inspections", json=VALID_INSPECTION)

    # 201 means "Created".
    assert response.status_code == 201
    body = response.json()
    assert body["bmp_id"] == "TEST-BMP-1"
    assert body["status"] == "Pass"
    # Passing inspections should NOT send an email.
    assert body["email_sent"] is False
    # The database should have given it an ID.
    assert body["report_id"] > 0


def test_failed_inspection_sends_email():
    failed = dict(VALID_INSPECTION)
    failed["status"] = "Fail"

    response = client.post("/api/v1/inspections", json=failed)

    assert response.status_code == 201
    # Failed inspections SHOULD send an email.
    assert response.json()["email_sent"] is True


def test_inspection_with_bad_status_is_rejected():
    bad = dict(VALID_INSPECTION)
    bad["status"] = "Kinda Okay"  # not one of Pass / Needs Repair / Fail

    response = client.post("/api/v1/inspections", json=bad)

    # 422 means "the data you sent breaks the rules".
    assert response.status_code == 422


def test_inspection_missing_bmp_id_is_rejected():
    bad = dict(VALID_INSPECTION)
    del bad["bmp_id"]  # remove a required field

    response = client.post("/api/v1/inspections", json=bad)
    assert response.status_code == 422


def test_inspection_with_impossible_latitude_is_rejected():
    bad = dict(VALID_INSPECTION)
    bad["latitude"] = 500  # latitude can only be -90 to 90

    response = client.post("/api/v1/inspections", json=bad)
    assert response.status_code == 422


def test_can_get_inspection_by_id():
    created = client.post("/api/v1/inspections", json=VALID_INSPECTION).json()

    response = client.get(f"/api/v1/inspections/{created['report_id']}")

    assert response.status_code == 200
    assert response.json()["report_id"] == created["report_id"]


def test_missing_inspection_returns_404():
    response = client.get("/api/v1/inspections/999999")
    assert response.status_code == 404


def test_filter_inspections_by_bmp_id():
    unique = dict(VALID_INSPECTION)
    unique["bmp_id"] = "FILTER-TEST-BMP"
    client.post("/api/v1/inspections", json=unique)

    response = client.get("/api/v1/inspections", params={"bmp_id": "FILTER-TEST-BMP"})

    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    # Every result should be for the BMP we asked about. We check them
    # one at a time with an index-based while loop.
    index = 0
    while index < len(results):
        assert results[index]["bmp_id"] == "FILTER-TEST-BMP"
        index = index + 1


# ---------- Work orders ----------

def test_work_order_is_saved_and_emailed():
    order = {
        "bmp_id": "TEST-BMP-1",
        "requested_by": "Test Requester",
        "description": "Clear debris from inlet grate.",
        "priority": "High",
    }
    response = client.post("/api/v1/work-orders", json=order)

    assert response.status_code == 201
    body = response.json()
    assert body["priority"] == "High"
    assert body["email_sent"] is True


def test_work_order_priority_defaults_to_normal():
    order = {
        "bmp_id": "TEST-BMP-1",
        "requested_by": "Test Requester",
        "description": "Check the outlet.",
    }
    response = client.post("/api/v1/work-orders", json=order)

    assert response.status_code == 201
    assert response.json()["priority"] == "Normal"


def test_missing_work_order_returns_404():
    response = client.get("/api/v1/work-orders/999999")
    assert response.status_code == 404
