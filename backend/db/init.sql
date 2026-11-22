-- ============================================================
-- init.sql - Database setup
--
-- WHAT THIS FILE DOES:
-- This runs automatically ONE time, the very first time the
-- database container starts. It creates the tables our back end
-- needs.
--
-- If you change this file later, it will NOT run again on its own.
-- You have to wipe the database first with: docker compose down -v
-- WHY THERE IS NO "FACILITIES" TABLE:
-- The ponds, drains, and other stormwater facilities already live in
-- ArcGIS Online, in the "BMP Database" layer that the front end loads.
-- Facilities staff edit them there. Copying them into our own database
-- would mean two copies that could drift apart. So instead, our tables
-- just store the facility's "BMP ID" from ArcGIS to say which facility
-- a report is about.
-- ============================================================


-- ------------------------------------------------------------
-- TABLE 1: inspection_reports
-- One row each time an inspector fills out the
-- "Conduct Inspection Report" form on the map.
-- Based on Table 2 in section 3.1 of the SDD.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspection_reports (
    report_id        SERIAL PRIMARY KEY,

    -- Which facility this report is about (the "BMP ID" from ArcGIS).
    bmp_id           VARCHAR(50)  NOT NULL,

    -- Who did the inspection.
    inspector_name   VARCHAR(100) NOT NULL,

    -- When it was submitted. Filled in automatically with the current time.
    inspection_date  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- The result. The CHECK rule means the database will refuse any
    -- value other than these three, so bad data can't sneak in.
    status           VARCHAR(20)  NOT NULL
                     CHECK (status IN ('Pass', 'Needs Repair', 'Fail')),

    -- What the inspector saw, and what needs fixing. Both optional.
    condition_notes  TEXT,
    repairs_needed   TEXT,

    -- Where the inspector was standing, from the tablet's GPS. Optional,
    -- because the device might not share its location.
    latitude         DOUBLE PRECISION,
    longitude        DOUBLE PRECISION,

    -- Did we send the insection failed email? Starts as false.
    email_sent       BOOLEAN      NOT NULL DEFAULT FALSE
);

-- An index works like the index at the back of a textbook. We will
-- often ask "show me every report for BMP X", so this lets the database
-- jump straight to those rows instead of reading the whole table.
CREATE INDEX IF NOT EXISTS inspection_reports_bmp_idx
    ON inspection_reports (bmp_id);


-- ------------------------------------------------------------
-- TABLE 2: work_orders
-- One row each time someone clicks "Create Work Order" on the map
-- and submits a repair request.
CREATE TABLE IF NOT EXISTS work_orders (
    work_order_id  SERIAL PRIMARY KEY,

    -- Which facility needs work (the "BMP ID" from ArcGIS).
    bmp_id         VARCHAR(50)  NOT NULL,

    -- Who asked for the work.
    requested_by   VARCHAR(100) NOT NULL,

    -- What needs to be done.
    description    TEXT         NOT NULL,

    -- How urgent it is. Only these three values are allowed.
    priority       VARCHAR(10)  NOT NULL DEFAULT 'Normal'
                   CHECK (priority IN ('Low', 'Normal', 'High')),

    -- When it was created. Filled in automatically.
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Did we email the work order mailbox about it?
    email_sent     BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS work_orders_bmp_idx
    ON work_orders (bmp_id);


-- ------------------------------------------------------------
-- TABLE 3: inspection_pdfs
-- Binary PDF inspection documents attached to inspection reports.
-- Stored centrally to enable cross-device viewing on iPads, tablets, and desktops.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspection_pdfs (
    report_id        INT PRIMARY KEY REFERENCES inspection_reports(report_id) ON DELETE CASCADE,

    -- The original downloaded filename (e.g. Inspection_BMP-101_2026-11-22.pdf).
    file_name        VARCHAR(255) NOT NULL,

    -- The full PDF binary data.
    pdf_data         BYTEA        NOT NULL,

    -- When the PDF was uploaded to the server.
    uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS inspection_pdfs_report_idx
    ON inspection_pdfs (report_id);
