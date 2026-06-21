"""
Deploy HireLoop's two Python services to Hugging Face Spaces (Docker SDK).

Steps performed:
  1. Read tokens/secrets from the gitignored top-level .env
  2. whoami() to resolve the HF username
  3. create_repo() for two Docker Spaces (idempotent)
  4. upload_folder() the service code (excluding .env/.venv/caches)
  5. add_space_secret() to inject runtime secrets (keys never live in the repo)

Run:  python scripts/deploy_hf.py
"""
from pathlib import Path
from huggingface_hub import HfApi

ROOT = Path(__file__).resolve().parent.parent


def load_env(path: Path) -> dict:
    d = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        d[k.strip()] = v.strip().strip('"').strip("'")
    return d


env = load_env(ROOT / ".env")
api = HfApi(token=env["HF_TOKEN"])
user = api.whoami()["name"]
print(f"Authenticated as HF user: {user}")

IGNORE = [
    ".venv/*", "**/.venv/*", ".env", ".env.*", "**/__pycache__/*", "*.pyc",
    "**/output/*", "*.log", "**/outreach_log*.csv", "**/naukri_debug_*", ".git/*",
]

services = {
    "hireloop-job-agent": {
        "folder": ROOT / "services" / "job-agent",
        "secrets": {
            "FIRECRAWL_API_KEY": env["FIRECRAWL_API_KEY"],
            "INTERNAL_API_KEY": env["INTERNAL_API_KEY"],
        },
    },
    "hireloop-cold-mail": {
        "folder": ROOT / "services" / "cold-mail",
        "secrets": {
            "GROQ_API_KEY": env["GROQ_API_KEY"],
            "LLM_PROVIDER": env.get("LLM_PROVIDER", "groq"),
            "LLM_MODEL": env.get("LLM_MODEL", "llama-3.1-8b-instant"),
            "SMTP_HOST": env.get("SMTP_HOST", "smtp.gmail.com"),
            "SMTP_PORT": env.get("SMTP_PORT", "587"),
            "SMTP_USER": env["SMTP_USER"],
            "SMTP_PASSWORD": env["SMTP_PASSWORD"],
            "SENDER_NAME": env.get("SENDER_NAME", ""),
            "DRY_RUN": env.get("DRY_RUN", "true"),
            "SEND_MODE": env.get("SEND_MODE", "draft"),
            "MAX_OUTREACH_PER_RUN": env.get("MAX_OUTREACH_PER_RUN", "5"),
            "INTERNAL_API_KEY": env["INTERNAL_API_KEY"],
        },
    },
}

urls = {}
for name, cfg in services.items():
    repo_id = f"{user}/{name}"
    print(f"\n=== {repo_id} ===")
    api.create_repo(repo_id=repo_id, repo_type="space", space_sdk="docker", exist_ok=True)
    print("  repo ready")
    api.upload_folder(
        repo_id=repo_id, repo_type="space",
        folder_path=str(cfg["folder"]), ignore_patterns=IGNORE,
        commit_message="Deploy HireLoop service",
    )
    print("  code uploaded")
    for k, v in cfg["secrets"].items():
        api.add_space_secret(repo_id=repo_id, key=k, value=v)
    print(f"  {len(cfg['secrets'])} secrets set")
    url = f"https://{user}-{name}.hf.space".lower()
    urls[name] = url
    print(f"  URL: {url}")

print("\n=== SPACE URLS ===")
for n, u in urls.items():
    print(f"{n}: {u}")
