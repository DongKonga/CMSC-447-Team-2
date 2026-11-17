"""
this is the shape of the data going in and out of the API

WHAT THIS FILE DOES:
When the front end sends us a form, we need to check it before saving
it. Is the BMP ID there? Is the status one of the allowed values? Is the
name too long?

Instead of writing a pile of "if" checks by hand, we describe what valid
data looks like using Pydantic "models" (classes). FastAPI then checks
every request against these automatically. If something is wrong, it
sends the front end a clear error message (status code 422) and our
route code never even runs.

"""

# datetime is Python's type for a date plus a time.
from datetime import datetime

# Literal means it has to be exact
from typing import Literal, Optional

# BaseModel is the parent class every Pydantic model builds on.
# Field lets us add rules.
from pydantic import BaseModel, Field


# The only allowed inspection results are (Pass / Needs Repair / Fail).
InspectionStatus = Literal["Pass", "Needs Repair", "Fail"]

# The only allowed work order priorities.
WorkOrderPriority = Literal["Low", "Normal", "High"]



# INSPECTION REPORTS


class InspectionCreate(BaseModel):
    """
    What the front end must send to SUBMIT a new inspection report.

    Example of a valid request body (in JSON):
        {
          "bmp_id": "BMP-101",
          "inspector_name": "Isa Rizvi",
          "status": "Fail",
          "condition_notes": "Outlet pipe is clogged with leaves.",
          "repairs_needed": "Clear the outlet pipe.",
          "latitude": 39.2556,
          "longitude": -76.7110
        }
    """

    # "..." inside Field means this field is REQUIRED.
    # min_length=1 stops someone from sending an empty string "".
    bmp_id: str = Field(..., min_length=1, max_length=50)
    inspector_name: str = Field(..., min_length=1, max_length=100)
    status: InspectionStatus    

    # These have "= None", which makes them optional.
    condition_notes: Optional[str] = None
    repairs_needed: Optional[str] = None

    # ge = "greater than or equal", le = "less than or equal".
    # Real latitudes are between -90 and 90, longitudes between -180 and 180,
    # so anything outside that is a mistake and gets rejected.
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class InspectionOut(InspectionCreate):

    report_id: int
    inspection_date: datetime
    email_sent: bool


# WORK ORDERS


class WorkOrderCreate(BaseModel):
    """
    What the front end must send to CREATE a new work order.

    Example:
        {
          "bmp_id": "BMP-101",
          "requested_by": "Isa Rizvi",
          "description": "Replace the broken grate on the inlet.",
          "priority": "High"
        }
    """

    bmp_id: str = Field(..., min_length=1, max_length=50)
    requested_by: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1)

    # If the front end doesn't send a priority, we use "Normal".
    priority: WorkOrderPriority = "Normal"


class WorkOrderOut(WorkOrderCreate):
    """What the API sends BACK for a work order."""

    work_order_id: int
    created_at: datetime
    email_sent: bool
