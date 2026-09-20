"""Creates the local secret files and env files the compose stack needs.

Usage: python scripts/prepare-local-secrets.py
Generates random passwords in `.secrets/` (git-ignored) and copies the example
env files if they do not exist yet. Existing files are never overwritten, so
running it twice is safe.
"""
import secrets
import shutil
import stat
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SECRETS = ROOT / ".secrets"
SECRET_FILES = ["db_superuser_password", "db_app_password", "session_secret"]
ENV_FILES = [(".env.docker.example", ".env.docker"), (".env.runtime.example", ".env.runtime")]


def main() -> None:
    SECRETS.mkdir(exist_ok=True)
    for name in SECRET_FILES:
        path = SECRETS / name
        if path.exists():
            print(f"kept   {path.relative_to(ROOT)}")
            continue
        # No newline: Postgres reads the file verbatim as the password.
        path.write_text(secrets.token_urlsafe(32), encoding="utf-8", newline="")
        path.chmod(stat.S_IRUSR | stat.S_IWUSR)
        print(f"created {path.relative_to(ROOT)}")

    for example, target in ENV_FILES:
        dst = ROOT / target
        if dst.exists():
            print(f"kept   {target}")
            continue
        shutil.copyfile(ROOT / example, dst)
        print(f"created {target} from {example}")

    ports = ROOT / ".env.ports"
    if not ports.exists():
        print("\nRun `python scripts/preflight-ports.py --write` to pick the host port.")


if __name__ == "__main__":
    main()
