"""
This is the API

WHAT DOES OUR BACK END DO?
The map and its facilities come from ArcGIS Online, so we don't need to
serve those. What ArcGIS can't do for us is handle the two buttons in
each facility's popup:

"Conduct Inspection Report"  ==  save the report, email if it failed
"Create Work Order"      ==  save the work order, email the mailbox

ROUTES IN THIS FILE:
    GET  /api/v1/health                  Is the API and database working?

    POST /api/v1/inspections             Submit a new inspection report
    GET  /api/v1/inspections             List reports (optionally for one BMP)
    GET  /api/v1/inspections/{id}        Get one report

    POST /api/v1/work-orders             Create a new work order
    GET  /api/v1/work-orders             List work orders (optionally for one BMP)
    GET  /api/v1/work-orders/{id}        Get one work order

GET vs POST:
    GET  means "give me data"           (like reading a page)
    POST means "here is new data"       (like submitting a form)
"""

import os


from typing import Optional

# FastAPI is the main framework.
# HTTPException lets us send back errors like "404 Not Found" properly.
from fastapi import FastAPI, HTTPException

# CORS middleware
from fastapi.middleware.cors import CORSMiddleware

# Our own helper files.
from app.db import get_connection
from app.emailer import (
    build_failed_inspection_email,
    build_work_order_email,
    send_email,
)
from app.schemas import (
    InspectionCreate,
    InspectionOut,
    WorkOrderCreate,
    WorkOrderOut,
)


# CREATE THE APP
# This is te API. Every route gets attached to it.
# ============================================================
app = FastAPI(
    title="UMBC Stormwater Map API",
    version="0.2.0",
)


#=====================================================================
# Our front end runs at http://localhost:5173 (Vite's default port) and
# our API runs at http://localhost:8000. Different addresses, so without
# this section the browser would block every request.
frontend_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173",
).split(",") #make into list

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,  # which front ends are trusted
    allow_methods=["*"],             # allow GET, POST, etc.
    allow_headers=["*"],             # allow any request headers
)


@app.get("/api/v1/health")
def health_check():
    #If "database" says "unreachable", the problem is the
    #database, not our code.
    
    
    try:
        with get_connection() as conn:
            # The simplest possible query. If this works, the database is up.
            conn.execute("SELECT 1")
        database_status = "ok"
    except Exception:
        database_status = "unreachable"

    # Whatever dictionary we return, FastAPI turns into JSON automatically.
    return {"api": "ok", "database": database_status}



# INSPECTION REPORTS


# "response_model=InspectionOut" tells FastAPI what shape we send back
# "status_code=201" means "Created", the standard answer when a POST
# successfully makes something new.
@app.post("/api/v1/inspections", response_model=InspectionOut, status_code=201)
def create_inspection(report: InspectionCreate):
    """
    Save a new inspection report. If the result is "Fail", also email
    the work order mailbox.

    The "report:
    FastAPI reads the JSON the front end sent, checks it against the
    rules in schemas.py, and hands us a ready to use object. If the data
    breaks a rule, FastAPI rejects it before this code runs.
    """
    # INSERT adds a new row. The %(name)s parts are placeholders that get
    # filled in with values from the dictionary we pass in.
    #
    # use placeholders, NEVER paste user input straight into SQL text.
    # Placeholders protect us from "SQL injection".
    #
    # "RETURNING *" asks the database to send back the full new row,
    # including the parts it filled in itself (report_id, date, etc.).
    insert_query = """
        INSERT INTO inspection_reports
            (bmp_id, inspector_name, status, condition_notes,
             repairs_needed, latitude, longitude)
        VALUES
            (%(bmp_id)s, %(inspector_name)s, %(status)s, %(condition_notes)s,
             %(repairs_needed)s, %(latitude)s, %(longitude)s)
        RETURNING *
    """

    with get_connection() as conn:
        # report.model_dump() turns the Pydantic object into a plain
        # dictionary, like {"bmp_id": "BMP-101", "status": "Fail", ...}
        saved = conn.execute(insert_query, report.model_dump()).fetchone()

        # Only failed inspections trigger an email.
        if saved["status"] == "Fail":
            subject, body = build_failed_inspection_email(saved)
            if send_email(subject, body):
                # Remember that the email went out.
                conn.execute(
                    "UPDATE inspection_reports SET email_sent = TRUE "
                    "WHERE report_id = %s",
                    (saved["report_id"],),
                )
                saved["email_sent"] = True

    # Leaving the "with" block automatically SAVES (commits) our changes.
    # If anything above had crashed, the changes would be thrown away
    # instead, so we never end up with half-saved data.
    return saved


@app.get("/api/v1/inspections", response_model=list[InspectionOut])
def list_inspections(bmp_id: Optional[str] = None):
    """
    List inspection reports, newest first.

    "bmp_id" is an optional "query parameter", meaning it goes after a
    question mark in the address:
        /api/v1/inspections               -> every report
        /api/v1/inspections?bmp_id=BMP-101 -> only reports for BMP-101

    This is what the info popup can use to show a facility's past
    inspections (SDD use case UC-3) and what the compiled reports page
    can use (UC-6).
    """
    with get_connection() as conn:
        if bmp_id is None:
            rows = conn.execute(
                "SELECT * FROM inspection_reports "
                "ORDER BY inspection_date DESC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM inspection_reports WHERE bmp_id = %s "
                "ORDER BY inspection_date DESC",
                (bmp_id,),  # the comma makes this a one-item tuple
            ).fetchall()
    return rows


# The {report_id} part is a placeholder in the address. Visiting
# /api/v1/inspections/5 runs this function with report_id = 5.
# Writing "report_id: int" makes FastAPI reject things like /inspections/abc.
@app.get("/api/v1/inspections/{report_id}", response_model=InspectionOut)
def get_inspection(report_id: int):
    """Get one inspection report by its ID."""
    with get_connection() as conn:
        # fetchone() gets a single row, or None if nothing matched.
        row = conn.execute(
            "SELECT * FROM inspection_reports WHERE report_id = %s",
            (report_id,),
        ).fetchone()

    # If no report has that ID, send a proper "404 Not Found" error.
    if row is None:
        raise HTTPException(status_code=404, detail="Inspection report not found")
    return row



# WORK ORDERS


@app.post("/api/v1/work-orders", response_model=WorkOrderOut, status_code=201)
def create_work_order(order: WorkOrderCreate):
    """Save a new work order and email the work order mailbox about it."""
    insert_query = """
        INSERT INTO work_orders (bmp_id, requested_by, description, priority)
        VALUES (%(bmp_id)s, %(requested_by)s, %(description)s, %(priority)s)
        RETURNING *
    """

    with get_connection() as conn:
        saved = conn.execute(insert_query, order.model_dump()).fetchone()

        # Every new work order gets emailed
        subject, body = build_work_order_email(saved)
        if send_email(subject, body):
            conn.execute(
                "UPDATE work_orders SET email_sent = TRUE "
                "WHERE work_order_id = %s",
                (saved["work_order_id"],),
            )
            saved["email_sent"] = True

    return saved


@app.get("/api/v1/work-orders", response_model=list[WorkOrderOut])
def list_work_orders(bmp_id: Optional[str] = None):
    """List work orders, newest first. Add ?bmp_id=... to filter."""
    with get_connection() as conn:
        if bmp_id is None:
            rows = conn.execute(
                "SELECT * FROM work_orders ORDER BY created_at DESC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM work_orders WHERE bmp_id = %s "
                "ORDER BY created_at DESC",
                (bmp_id,),
            ).fetchall()
    return rows


@app.get("/api/v1/work-orders/{work_order_id}", response_model=WorkOrderOut)
def get_work_order(work_order_id: int):
    """Get one work order by its ID."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM work_orders WHERE work_order_id = %s",
            (work_order_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Work order not found")
    return row
