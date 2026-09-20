"""Checks the host ports the stack wants before compose starts.

Usage: python scripts/preflight-ports.py [--write]
Writes `.env.ports` with the first free gateway port when --write is passed.
Never stops a service that already holds a port; it picks the next candidate.
"""
import socket
import sys
from pathlib import Path

GATEWAY_CANDIDATES = [18473, 18474, 18475, 18476]
# These stay inside the compose network; listed only to report the host state.
INTERNAL_ONLY = {"postgres": 5432, "redis": 6379, "web": 3000, "api": 3001}

ROOT = Path(__file__).resolve().parent.parent


def is_free(port: int) -> bool:
    with socket.socket() as probe:
        probe.settimeout(0.6)
        return probe.connect_ex(("127.0.0.1", port)) != 0


def main() -> int:
    chosen = next((p for p in GATEWAY_CANDIDATES if is_free(p)), None)
    for port in GATEWAY_CANDIDATES:
        print(f"gateway candidate {port}: {'free' if is_free(port) else 'in use'}")
    for name, port in INTERNAL_ONLY.items():
        state = "free" if is_free(port) else "in use by something else"
        print(f"{name} container port {port} (not published): host {state}")

    if chosen is None:
        print("No candidate port is free. Pick one manually and set DVB_HTTP_PORT.")
        return 1

    print(f"\nUse DVB_HTTP_PORT={chosen}")
    if "--write" in sys.argv:
        (ROOT / ".env.ports").write_text(f"DVB_HTTP_PORT={chosen}\n", encoding="utf-8")
        print("wrote .env.ports")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
