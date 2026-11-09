# Stormwater Map Back End (SCRUM-49)

This is the back end for the UMBC Stormwater Facilities Interactive Map. It uses the stack from our SDD: **FastAPI** (Python) for the API and **PostgreSQL** for the database, both running in **Docker**.

It goes in a folder called `backend` at the top of our repo, next to `src` and `package.json`.

---

## The big picture (read this first)

Our app has three parts, like a restaurant:

| Part | What it is | Restaurant version |
|---|---|---|
| Front end | The React map in the browser | The customer |
| Back end (this folder) | The FastAPI app | The waiter |
| Database | PostgreSQL | The kitchen |

**What the back end does NOT do:** serve the map or the facilities. Those already come from ArcGIS Online. The front end loads a UMBC web map, and the facilities are in its "BMP Database" layer. Facilities staff can edit them right in ArcGIS, which matches the stakeholder request that data be easy to change.

**What the back end DOES do:** handle the two buttons in each facility's popup, which ArcGIS can't do for us.

| Button on the map | What the back end does |
|---|---|
| Conduct Inspection Report | Saves the report. If the result is **Fail**, emails workorder@umbc.edu |
| Create Work Order | Saves the work order and emails workorder@umbc.edu |

Every report and work order stores the facility's **BMP ID** from ArcGIS, so we always know which facility it belongs to.

---

## What each file does

```
backend/
  app/
    main.py           The API routes. Start reading here.
    schemas.py        The rules for what valid data looks like.
    emailer.py        Builds and sends the notification emails.
    db.py             How the API connects to the database.
    __init__.py       Empty file that makes "app" a Python package.
  db/
    init.sql          Creates the database tables.
  tests/
    test_api.py       Automatic tests (12 of them).
  Dockerfile          Recipe for building the API container.
  docker-compose.yml  Starts the API and database together.
  requirements.txt    Python libraries the API needs.
  .gitignore          Files Git should not upload.
```

Every file has comments explaining what each part does. A good reading order is `main.py`, `schemas.py`, `emailer.py`, `db.py`, `init.sql`, `docker-compose.yml`, `Dockerfile`, then `test_api.py`.

---

## How to run it

1. Open **Docker Desktop** and wait until it says it's running.
2. Open PowerShell and go into the `backend` folder, for example:
   ```
   cd C:\Users\isari\Documents\CMSC-447-Team-2\backend
   ```
3. Start everything:
   ```
   docker compose up --build
   ```
   The first run downloads things, so it can take a few minutes. It's ready when you see `Uvicorn running on http://0.0.0.0:8000`.

4. Open **http://localhost:8000/docs** in your browser. This page lists every route and lets you try them:
   - Click a route, like **POST /api/v1/inspections**
   - Click **Try it out**
   - Edit the example data and click **Execute**
   - Scroll down to see the answer

   Try submitting an inspection with `"status": "Fail"`, then look at your PowerShell window. You'll see the email it would have sent.

5. To stop it, press `Ctrl + C`.

---

## The routes

| Method and address | What it does |
|---|---|
| `GET /api/v1/health` | Checks the API and database are working |
| `POST /api/v1/inspections` | Submit a new inspection report |
| `GET /api/v1/inspections` | List all reports, newest first |
| `GET /api/v1/inspections?bmp_id=BMP-101` | List reports for one facility |
| `GET /api/v1/inspections/5` | Get report number 5 |
| `POST /api/v1/work-orders` | Create a new work order |
| `GET /api/v1/work-orders` | List all work orders |
| `GET /api/v1/work-orders?bmp_id=BMP-101` | List work orders for one facility |
| `GET /api/v1/work-orders/5` | Get work order number 5 |

**GET** means "give me data." **POST** means "here's new data to save."

---

## Running the tests

With the back end running, open a **second** PowerShell window in the `backend` folder and run:

```
docker compose exec api pytest -v
```

You should see `12 passed`. The tests check things like: a failed inspection sends an email, a passing one doesn't, bad data gets rejected, and asking for a report that doesn't exist gives a "not found" error.

---

## Useful commands

| Command | What it does |
|---|---|
| `docker compose up --build` | Build and start everything |
| `docker compose up` | Start again without rebuilding (faster) |
| `docker compose down` | Stop and remove the containers (data is kept) |
| `docker compose down -v` | Stop AND wipe the database. Use after editing `init.sql` |
| `docker compose exec api pytest -v` | Run the tests |

---

## About emails (dry run mode)

We don't have UMBC's mail server details yet, and we don't want to spam the real mailbox while testing. So right now emails are **printed in the terminal instead of sent**. This is called a "dry run."

When we get the mail server details, fill in `SMTP_HOST` (and a login if needed) in `docker-compose.yml`, and emails will really send. No code changes needed.

---

## Key ideas, explained simply

**API route (endpoint):** A web address the front end can send requests to. In `main.py`, each `@app.get(...)` or `@app.post(...)` line creates one.

**JSON:** A text format for data that looks like a Python dictionary. The front end sends JSON to us, and we send JSON back.

**Validation:** Checking data before saving it. `schemas.py` lists the rules, and FastAPI checks every request automatically. Bad data gets a `422` error and never reaches the database.

**Status codes:** Numbers that say how a request went. `200` = OK, `201` = created, `404` = not found, `422` = your data broke a rule.

**Docker container:** A small sealed computer with exactly what the app needs. Everyone on the team gets the same setup with one command.

**CORS:** A browser safety rule. The front end (port 5173) and API (port 8000) are at different addresses, so the API has to say "I trust this front end" or the browser blocks it.

**SQL injection:** A hacking trick where someone sneaks SQL code into a form. We block it by using placeholders like `%s` in queries instead of pasting values into the SQL text.

---

## How the front end will use this (next step, not done yet)

Right now the popup buttons in `src/App.jsx` just show a "TODO" alert. Later, the inspection button would open a form, and on submit the front end would send the form to the back end like this:

```js
const response = await fetch("http://localhost:8000/api/v1/inspections", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    bmp_id: attributes["BMP ID"],   // from the clicked facility
    inspector_name: currentUser.username,
    status: "Fail",
    condition_notes: "Outlet clogged with leaves.",
  }),
})
const savedReport = await response.json()
```

---

## Still to decide with the team

- **Login:** the back end doesn't check who is logged in yet. The front end login is currently a placeholder too. Once login really uses ArcGIS (per the 10/23 stakeholder meeting), we can have the back end check the ArcGIS sign-in before saving reports.
- **Past inspection forms:** the stakeholder said old forms just need to be findable in a Box folder. This back end stores new reports. We may also want to export them to that Box folder later.
- **Mail server:** need UMBC's SMTP details to send real emails.
