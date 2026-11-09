# ============================================================
# Dockerfile - Recipe for building the API container
#
# WHAT IS A CONTAINER?
# A container is like a tiny, sealed computer that has exactly what
# our app needs and nothing else. This means the API runs the same
# way on your laptop, your teammates' laptops, and a real server.
# No more "it works on my machine."
#
# This file is the recipe. Docker follows it top to bottom.
# ============================================================

# Start from an official image that already has Python 3.12 installed.
# "slim" means a smaller version without extra tools we don't need.
# (Your laptop's Python version doesn't matter. The container brings
# its own Python.)
FROM python:3.12-slim

# Make a folder called /code inside the container and work from there.
WORKDIR /code

# Copy the list of libraries in and install them.
# We copy requirements.txt by itself FIRST on purpose: Docker remembers
# finished steps, so if only our code changes later, it can skip
# reinstalling all the libraries. That makes rebuilds much faster.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Now copy our actual code and tests into the container.
COPY app ./app
COPY tests ./tests

# The command that starts the API when the container starts.
# uvicorn is the web server that runs FastAPI apps.
#   app.main:app   means "in app/main.py, use the object named app"
#   --host 0.0.0.0 means "accept requests from outside the container"
#   --port 8000    means "listen on port 8000"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
