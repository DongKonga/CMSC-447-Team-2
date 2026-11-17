"""
emailer.py - Sending email notifications

From the 10/23 stakeholder meeting:
    "Email sent when inspection failed, not completed."
    Emails go to the WORKORDER shared mailbox (workorder@umbc.edu).

So when an inspection comes back "Fail", or someone creates a work
order, we email that mailbox. This file holds the code that actually
sends the email.

HOW EMAIL SENDING WORKS (SMTP):
Programs send email by connecting to a "mail server" using a protocol
called SMTP. It's like dropping a letter at the post office: we hand the
message to the server, and the server delivers it.

DRY RUN MODE (important for testing):
We don't have UMBC's mail server details yet. So if no mail
server is set (SMTP_HOST is empty), this file does a "dry run": it
prints the email in the terminal instead of sending it. 
"""

import os

# smtplib is Python's built-in library for talking to mail servers.
import smtplib

# EmailMessage is Python's built-in way to build a properly formatted email.
from email.message import EmailMessage


# SETTINGS
# All of these come from environment variables (set in docker-compose.yml)
# so passwords never have to be written into the code.

# The mail server's address. Empty means "dry run, just print".
SMTP_HOST = os.getenv("SMTP_HOST", "")

# The port on the mail server. 587 is the standard port for sending
# email securely with STARTTLS (explained below).
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

# Login for the mail server, if it needs one.
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

# Who the email says it's from, and who receives it.
EMAIL_FROM = os.getenv("EMAIL_FROM", "stormwater-map@umbc.edu")
WORKORDER_EMAIL = os.getenv("WORKORDER_EMAIL", "workorder@umbc.edu")


def send_email(subject, body, to_address=WORKORDER_EMAIL):
    """
    Send one email, or print it if we're in dry run mode.

    Returns True if it worked and False if it failed. We return
    True/False instead of crashing because a broken mail server should
    NOT stop an inspection report from being saved. The report is the
    important part; the email is a bonus notification.
    """
    # Build the email like filling in an envelope and a letter.
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = EMAIL_FROM
    message["To"] = to_address
    message.set_content(body)

    # Dry run: no mail server set, so just print it
    if not SMTP_HOST:
        print("========== DRY RUN EMAIL (not actually sent) ==========")
        print(f"To: {to_address}")
        print(f"Subject: {subject}")
        print(body)
        print("========================================================")
        return True

    # Real send 
    try:
        # "with" makes sure the connection to the mail server closes
        # when we're done, even if something goes wrong.
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            # STARTTLS switches the connection to an encrypted one, so
            # nobody in between can read the email or the password.
            server.starttls()
            if SMTP_USERNAME:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
        return True
    except Exception as error:
        # Print the problem so we can debug it, but don't crash.
        print(f"Email failed to send: {error}")
        return False


def build_failed_inspection_email(report):
    """
    Write the subject and body for a failed inspection.

    "report" is a dictionary holding one row from the inspection_reports
    table. We pull values out of it with report["field_name"].
    The "or 'None given'" part shows that text when a field is empty.
    """
    subject = f"FAILED stormwater inspection: BMP {report['bmp_id']}"

    body = (
        "A stormwater facility failed inspection and needs attention.\n"
        "\n"
        f"Report ID:     {report['report_id']}\n"
        f"BMP ID:        {report['bmp_id']}\n"
        f"Inspector:     {report['inspector_name']}\n"
        f"Date:          {report['inspection_date']}\n"
        f"Status:        {report['status']}\n"
        "\n"
        f"Condition notes:\n{report['condition_notes'] or 'None given'}\n"
        "\n"
        f"Repairs needed:\n{report['repairs_needed'] or 'None given'}\n"
        "\n"
        f"GPS location:  {report['latitude']}, {report['longitude']}\n"
        "\n"
        "Sent automatically by the UMBC Stormwater Facilities Map."
    )
    return subject, body


def build_work_order_email(order):
    """Write the subject and body for a new work order."""
    subject = (
        f"New stormwater work order ({order['priority']} priority): "
        f"BMP {order['bmp_id']}"
    )

    body = (
        "A new stormwater work order was submitted.\n"
        "\n"
        f"Work order ID: {order['work_order_id']}\n"
        f"BMP ID:        {order['bmp_id']}\n"
        f"Requested by:  {order['requested_by']}\n"
        f"Priority:      {order['priority']}\n"
        f"Created:       {order['created_at']}\n"
        "\n"
        f"Description:\n{order['description']}\n"
        "\n"
        "Sent automatically by the UMBC Stormwater Facilities Map."
    )
    return subject, body
