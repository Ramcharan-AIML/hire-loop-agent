# Deployment Plan: The Closer Outreach Console

This document outlines the deployment strategy for **The Closer** (Streamlit-based Cold Outreach Console). 

Since the project features an interactive Streamlit UI, we have created a **`streamlit_app.py`** in the root of the project that imports and runs **`ui/app.py`**. Streamlit is the recommended framework for hosting the frontend application.

---

## 1. Deployment Options Overview

We recommend three primary deployment options depending on your hosting preferences, budget, and security requirements.

| Platform | Best For | Cost | Setup Complexity | Persistence Support |
|---|---|---|---|---|
| **Streamlit Community Cloud** | Fast demos, personal use, quick sharing | Free | Low | Stateless (requires external database or download buttons) |
| **Render / Railway (PaaS)** | Production-ready, containerized deploy | Low (~$5/mo) | Medium | Persistent Volume available |
| **Self-Hosted VPS (AWS/DO)** | Complete control, custom domain, private deployment | Medium (~$5-$10/mo) | High | Fully persistent (local SSD) |

---

## 2. Secrets & Environment Configuration

Do **NOT** commit your `.env` file to your Git repository. All deployment platforms require defining these environment variables in their respective configuration panels:

| Variable | Required | Recommended Production Value | Description |
|---|---|---|---|
| `SMTP_HOST` | Yes | `smtp.gmail.com` | SMTP Server domain. |
| `SMTP_PORT` | Yes | `587` | Server connection port (STARTTLS). |
| `SMTP_USER` | Yes | *Your sending email* | Authenticating sender email account. |
| `SMTP_PASSWORD`| Yes | *Your 16-character App Password* | App authentication credential. |
| `SENDER_NAME` | Yes | *Your Full Name* | Friendly display name in email headers. |
| `DRY_RUN` | Yes | `true` (Toggle to `false` in UI for live) | Safety switch. |
| `SEND_MODE` | Yes | `"draft"` | Default routing mode. |
| `MAX_OUTREACH_PER_RUN`| Yes | `5` | Batch volume cap boundary. |
| `INPUT_PATH` | Yes | `contacts.json` | Path to contact target list. |
| `GROQ_API_KEY` | No | *Your Groq API Token* | Needed for LLM refinement. |

---

## 3. Option 1: Streamlit Community Cloud (Recommended & Free)

Streamlit Community Cloud is a free hosting platform provided by Streamlit that deploys directly from a public or private GitHub repository.

### Setup Instructions
1. Push your code to a GitHub repository (ensure `.env`, `outreach_log.csv`, and virtual environments are ignored).
2. Go to [share.streamlit.io](https://share.streamlit.io/) and log in with your GitHub account.
3. Click **New App**.
4. Select your repository, branch (`main`), and set the main file path to:
   `streamlit_app.py`
5. Click **Advanced settings...** to configure your secrets. Paste the `.env` contents in the secrets editor using TOML format:
   ```toml
   SMTP_HOST = "smtp.gmail.com"
   SMTP_PORT = 587
   SMTP_USER = "your_email@gmail.com"
   SMTP_PASSWORD = "your_app_password"
   SENDER_NAME = "Your Name"
   DRY_RUN = "true"
   SEND_MODE = "draft"
   MAX_OUTREACH_PER_RUN = 5
   INPUT_PATH = "contacts.json"
   GROQ_API_KEY = "your_groq_key"
   ```
6. Click **Deploy**. The app will be built and accessible at a public URL (e.g., `https://your-app.streamlit.app`).

---

## 4. Option 2: Render / Railway (Containerized PaaS)

If you prefer containerized deployment, you can use a PaaS like Render or Railway. This option supports adding a **Persistent Volume** to store audit logs and contacts permanently.

### Dockerfile
Create a `Dockerfile` in the root of the project:

```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 8501 for Streamlit
EXPOSE 8501

# Streamlit Healthcheck
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

# Run streamlit when the container launches
CMD ["streamlit", "run", "streamlit_app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

### Setup on Render
1. Create a new **Web Service** on Render and link your GitHub repo.
2. Select **Docker** as the Runtime.
3. In **Environment Variables**, add the environment keys listed in Section 2.
4. **Data Persistence (Crucial)**: Add a Persistent Disk under the **Advanced** settings:
   - **Mount Path**: `/app/data`
   - Update `INPUT_PATH` in your Env Variables to `/app/data/contacts.json`.
   - Update any code reference to write `outreach_log.csv` to `/app/data/outreach_log.csv` to ensure audit trails survive container redeployments.

---

## 5. Option 3: VPS Self-Hosted (AWS EC2 / DigitalOcean)

For maximum privacy and custom domains, deploy to a virtual private server (VPS).

### Step 1: Clone and Build
```bash
sudo apt update && sudo apt install python3-pip python3-venv git -y
git clone <your-repo-url> /var/www/the-closer
cd /var/www/the-closer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit with nano/vim
```

### Step 2: Systemd Daemon Service
Create a service file to run the Streamlit app continuously:
`sudo nano /etc/systemd/system/the-closer.service`

```ini
[Unit]
Description=The Closer Outreach Streamlit UI
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/var/www/the-closer
ExecStart=/var/www/the-closer/venv/bin/streamlit run streamlit_app.py --server.port=8501 --server.address=127.0.0.1
Restart=always

[Install]
WantedBy=multi-user.target
```

Start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl start the-closer
sudo systemctl enable the-closer
```

### Step 3: Nginx Proxy & SSL
Configure Nginx to proxy port `8501` to standard HTTPS (`443`) and secure it with Let's Encrypt Certbot.

---

## 6. Critical Considerations for Production

### A. Data Persistence Strategy
Because Streamlit instances are stateless by default on free/cheap hosting:
1. **Audit Logs (`outreach_log.csv`)**: If the container restarts, local files are deleted.
   - *Mitigation*: We recommend adding a **Download CSV** button to the **Audit Trails & Analytics** tab so you can manually save logs to your computer.
   - *Alternative*: Migrate `logger.py` to use a cloud database (like Supabase) or append to a Google Sheet using the `gspread` library.
2. **Target List (`contacts.json`)**:
   - *Mitigation*: Use the built-in **Target Directory** tab file uploader to load target CSVs directly via the browser rather than hardcoding files.

### B. Access Control & Security
Since anyone with the deployment URL can access the console and send emails under your authenticated address:
1. Add standard authentication:
   - Streamlit Community Cloud has built-in **viewer whitelist controls** in app sharing settings.
   - For PaaS/VPS, implement a basic login form at the top of `ui/app.py` or use basic HTTP auth at the proxy layer.
