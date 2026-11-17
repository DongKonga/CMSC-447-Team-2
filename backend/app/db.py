# file to let code connect to the database
# "os" lets Python read settings from the computer's environment.
import os

# "psycopg" is the library that lets Python talk to PostgreSQL.
import psycopg


# "dict_row" makes makes the tuple into a dictionary like:
#     {"facility_id": 1, "asset_tag": "TEST-001", "facility_name": "Test Pond A"}
from psycopg.rows import dict_row


# This tells psycopg where the database is and how to log in.
# It reads like this:
#     postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
#
# os.getenv("DATABASE_URL", ...) means:
#     use the DATABASE_URL setting if one exists, otherwise use default
#
# the default database url below is only used if you run Python directly on your laptop.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://stormwater:stormwater@localhost:5432/stormwater",
)


def get_connection():
    """
    Open a new connection to the database and hand it back.

    How to use it (you will see this pattern in main.py):

        with get_connection() as conn:
            rows = conn.execute("SELECT * FROM work_orders").fetchall()

    The "with" part automatically closes the connection
    when the block ends, even if something goes wrong.
    """
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)
