#!/usr/bin/env python3
"""Local development server for islaAPP with scaffold and project APIs."""

from __future__ import annotations

import json
import hmac
import hashlib
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib import error as urlerror
from urllib import request as urlrequest
from urllib.parse import urlencode, urlparse

ROOT = Path(__file__).resolve().parent
PROJECTS_DIR = ROOT / "projects"
DATA_DIR = ROOT / "data"
SERVICE_REQUESTS_FILE = DATA_DIR / "service-requests.json"
AUTH_USERS_FILE = DATA_DIR / "auth-users.json"
AUTH_SESSIONS_FILE = DATA_DIR / "auth-sessions.json"
PROVIDER_CONFIG_FILE = DATA_DIR / "provider-config.json"
IS_RENDER = bool(str(os.environ.get("RENDER", "")).strip()) or bool(str(os.environ.get("RENDER_SERVICE_ID", "")).strip())
HOST = "0.0.0.0" if IS_RENDER else (os.environ.get("HOST", "0.0.0.0").strip() or "0.0.0.0")
_default_port = "10000" if IS_RENDER else "4173"
_raw_port = str(os.environ.get("PORT", _default_port)).strip() or _default_port
try:
    PORT = int(_raw_port)
except ValueError:
    PORT = int(_default_port)
if PORT < 1 or PORT > 65535:
    PORT = int(_default_port)
ALLOWED_REQUEST_STATUSES = {
    "submitted",
    "reviewing",
    "approved",
    "provisioning",
    "active",
    "partially_active",
    "provision_failed",
    "on_hold",
    "cancelled",
}
ALLOWED_USER_ROLES = {"owner", "admin", "viewer"}
SESSION_HOURS = 12
ALLOWED_PROVIDER_CONFIG_KEYS = {
    "RENDER_API_KEY",
    "RENDER_SERVICE_REPO",
    "RENDER_OWNER_ID",
    "RENDER_OWNER_SLUG",
    "RENDER_OWNER_NAME",
    "RENDER_SERVICE_BRANCH",
    "RENDER_SERVICE_REGION",
    "RENDER_BUILD_COMMAND",
    "RENDER_START_COMMAND",
    "DYNADOT_API_KEY",
    "DYNADOT_AUTO_REGISTER",
    "DYNADOT_REGISTRATION_YEARS",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_ORG_ID",
    "SUPABASE_DB_PASS",
    "SUPABASE_REGION",
    "NEON_API_KEY",
    "NEON_ORG_ID",
    "NEON_REGION_ID",
    "NEON_PG_VERSION",
    "DEFAULT_REGION",
    "DEFAULT_DB_PASSWORD",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
}
AI_TEMPLATE_OPTIONS = [
    "SaaS Dashboard",
    "Client Portal",
    "Marketplace",
    "E-commerce Storefront",
    "Booking Platform",
    "Support Helpdesk",
    "Community Platform",
    "Creator Membership Hub",
    "CRM Workspace",
    "HR Recruiting Portal",
    "Real Estate Listings",
    "Restaurant Ordering",
]
AI_FEATURE_OPTIONS = [
    "User authentication",
    "Team collaboration",
    "Payments and billing",
    "Notifications",
    "Admin dashboard",
    "Analytics reports",
]
AI_STACK_OPTIONS = [
    "HTML/CSS/JS",
    "React + Supabase",
    "Next.js + PostgreSQL",
    "Node API + React Frontend",
]
AI_TARGET_OPTIONS = [
    "Beta in 2 weeks",
    "MVP in 1 month",
    "Production in 2 months",
    "Scale in 3+ months",
]


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:  # noqa: N802 - stdlib method name
        route = urlparse(self.path).path
        if route in {"/healthz", "/api/healthz"}:
            self.send_text(HTTPStatus.OK, "ok")
            return
        if route == "/api/auth-config":
            self.send_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "bootstrapRequired": auth_bootstrap_required(),
                    "requiresAdminToken": admin_token_required(),
                    "sessionHours": SESSION_HOURS,
                },
            )
            return
        if route == "/api/auth-session":
            auth = authorize_request(self.headers)
            if not auth.get("ok"):
                self.send_json(HTTPStatus.OK, {"ok": True, "authenticated": False})
                return
            self.send_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "authenticated": True,
                    "user": {
                        "id": auth.get("userId", ""),
                        "username": auth.get("username", ""),
                        "role": auth.get("role", "viewer"),
                        "source": auth.get("source", "session"),
                    },
                },
            )
            return
        if route == "/api/auth-users":
            role_auth = self.require_role("owner")
            if not role_auth:
                return
            self.send_json(HTTPStatus.OK, {"ok": True, "users": list_auth_users(public_only=True)})
            return
        if route == "/api/admin-health":
            auth = authorize_request(self.headers)
            self.send_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "requiresAdminToken": admin_token_required(),
                    "authorized": bool(auth.get("ok") and has_required_role(str(auth.get("role", "")), "admin")),
                    "role": auth.get("role", ""),
                    "username": auth.get("username", ""),
                },
            )
            return
        if route == "/api/providers":
            self.send_json(HTTPStatus.OK, {"ok": True, "catalog": provider_catalog()})
            return
        if route == "/api/provider-health":
            self.send_json(HTTPStatus.OK, {"ok": True, "providers": provider_health()})
            return
        if route == "/api/provider-config":
            self.handle_provider_config_get()
            return
        if route == "/api/service-requests":
            self.send_json(HTTPStatus.OK, {"ok": True, "requests": list_service_requests()})
            return
        if route == "/api/projects":
            self.send_json(HTTPStatus.OK, {"ok": True, "projects": list_projects()})
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802 - stdlib method name
        route = urlparse(self.path).path
        if route == "/api/auth-bootstrap":
            self.handle_auth_bootstrap()
            return
        if route == "/api/auth-login":
            self.handle_auth_login()
            return
        if route == "/api/auth-logout":
            self.handle_auth_logout()
            return
        if route == "/api/auth-users":
            self.handle_auth_create_user()
            return
        if route == "/api/create-project":
            self.handle_create_project()
            return
        if route == "/api/ai-build":
            self.handle_ai_build()
            return
        if route == "/api/service-request":
            self.handle_service_request()
            return
        if route == "/api/provision-request":
            self.handle_provision_request()
            return
        if route == "/api/service-request-status":
            self.handle_service_request_status()
            return
        if route == "/api/provider-config":
            self.handle_provider_config_update()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Route not found")

    def handle_create_project(self) -> None:
        body, error = self.read_json_body()
        if error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": error})
            return

        validation_error = validate_body(body)
        if validation_error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": validation_error})
            return

        summary = create_project_scaffold(body)
        self.send_json(HTTPStatus.OK, summary)

    def handle_ai_build(self) -> None:
        body, error = self.read_json_body()
        if error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": error})
            return

        prompt = str(body.get("prompt", "")).strip() if isinstance(body, dict) else ""
        owner = str(body.get("owner", "")).strip() if isinstance(body, dict) else ""
        if len(prompt) < 6:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Prompt must be at least 6 characters."})
            return

        result = generate_ai_build_plan(prompt=prompt, owner=owner)
        self.send_json(HTTPStatus.OK, result)

    def handle_service_request(self) -> None:
        body, error = self.read_json_body()
        if error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": error})
            return

        validation_error = validate_service_request_payload(body)
        if validation_error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": validation_error})
            return

        result = create_service_request(body)
        if not result.get("ok"):
            self.send_json(HTTPStatus.BAD_REQUEST, result)
            return
        self.send_json(HTTPStatus.OK, result)

    def handle_provision_request(self) -> None:
        if not self.require_role("admin"):
            return

        body, error = self.read_json_body()
        if error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": error})
            return

        validation_error = validate_provision_payload(body)
        if validation_error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": validation_error})
            return

        result = provision_service_request(
            request_id=body["requestId"].strip(),
            options={
                "domainName": str(body.get("domainName", "")).strip(),
                "region": str(body.get("region", "")).strip(),
                "dbPassword": str(body.get("dbPassword", "")).strip(),
                "retryFailed": bool(body.get("retryFailed", False)),
            },
        )
        if not result.get("ok"):
            self.send_json(HTTPStatus.BAD_REQUEST, result)
            return
        self.send_json(HTTPStatus.OK, result)

    def handle_service_request_status(self) -> None:
        if not self.require_role("admin"):
            return

        body, error = self.read_json_body()
        if error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": error})
            return

        validation_error = validate_status_update_payload(body)
        if validation_error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": validation_error})
            return

        result = update_service_request_status(
            request_id=str(body.get("requestId", "")).strip(),
            status=str(body.get("status", "")).strip().lower(),
            reason=str(body.get("reason", "manual update")).strip() or "manual update",
        )
        if not result.get("ok"):
            self.send_json(HTTPStatus.BAD_REQUEST, result)
            return
        self.send_json(HTTPStatus.OK, result)

    def handle_auth_bootstrap(self) -> None:
        body, error = self.read_json_body()
        if error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": error})
            return

        if not auth_bootstrap_required():
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Bootstrap already completed"})
            return

        username = str(body.get("username", "")).strip()
        password = str(body.get("password", ""))
        validation = validate_auth_credentials(username=username, password=password)
        if validation:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": validation})
            return

        created = create_auth_user(username=username, password=password, role="owner")
        if not created.get("ok"):
            self.send_json(HTTPStatus.BAD_REQUEST, created)
            return

        user = created["user"]
        session = create_auth_session(user)
        self.send_json(HTTPStatus.OK, {"ok": True, "user": strip_private_user(user), "sessionToken": session["token"]})

    def handle_auth_login(self) -> None:
        body, error = self.read_json_body()
        if error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": error})
            return

        username = str(body.get("username", "")).strip()
        password = str(body.get("password", ""))
        validation = validate_auth_credentials(username=username, password=password, allow_short_password=False)
        if validation:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": validation})
            return

        user = authenticate_user(username=username, password=password)
        if not user:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Invalid username or password"})
            return

        session = create_auth_session(user)
        self.send_json(HTTPStatus.OK, {"ok": True, "user": strip_private_user(user), "sessionToken": session["token"]})

    def handle_auth_logout(self) -> None:
        token = extract_bearer_token(self.headers)
        if not token:
            body, _error = self.read_json_body()
            token = str(body.get("sessionToken", "")).strip() if isinstance(body, dict) else ""
        if token:
            revoke_auth_session(token)
        self.send_json(HTTPStatus.OK, {"ok": True})

    def handle_auth_create_user(self) -> None:
        role_auth = self.require_role("owner")
        if not role_auth:
            return

        body, error = self.read_json_body()
        if error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": error})
            return

        username = str(body.get("username", "")).strip()
        password = str(body.get("password", ""))
        role = str(body.get("role", "viewer")).strip().lower()

        validation = validate_auth_credentials(username=username, password=password)
        if validation:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": validation})
            return
        if role not in ALLOWED_USER_ROLES:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Invalid role"})
            return

        created = create_auth_user(username=username, password=password, role=role)
        if not created.get("ok"):
            self.send_json(HTTPStatus.BAD_REQUEST, created)
            return

        self.send_json(HTTPStatus.OK, {"ok": True, "user": strip_private_user(created["user"])})

    def handle_provider_config_get(self) -> None:
        if not self.require_role("admin"):
            return
        saved = read_provider_config()
        masked = {key: mask_secret(str(value)) for key, value in saved.items() if key in ALLOWED_PROVIDER_CONFIG_KEYS}
        self.send_json(HTTPStatus.OK, {"ok": True, "values": masked, "savedKeys": sorted(masked.keys())})

    def handle_provider_config_update(self) -> None:
        if not self.require_role("admin"):
            return

        body, error = self.read_json_body()
        if error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": error})
            return

        raw_values = body.get("values")
        if not isinstance(raw_values, dict):
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "values must be an object"})
            return

        current = read_provider_config()
        updated = dict(current)

        for key, value in raw_values.items():
            if key not in ALLOWED_PROVIDER_CONFIG_KEYS:
                continue
            cleaned = str(value if value is not None else "").strip()
            if cleaned:
                updated[key] = cleaned
            elif key in updated:
                del updated[key]

        write_provider_config(updated)
        masked = {key: mask_secret(str(value)) for key, value in updated.items() if key in ALLOWED_PROVIDER_CONFIG_KEYS}
        self.send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "savedKeys": sorted(masked.keys()),
                "values": masked,
                "message": "Provider settings saved.",
            },
        )

    def read_json_body(self) -> tuple[dict[str, Any], str | None]:
        length = int(self.headers.get("Content-Length", "0"))
        payload = self.rfile.read(length)
        try:
            body = json.loads(payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return {}, "Invalid JSON payload"
        if not isinstance(body, dict):
            return {}, "Request body must be a JSON object"
        return body, None

    def require_role(self, minimum_role: str) -> dict[str, Any] | None:
        auth = authorize_request(self.headers)
        if not auth.get("ok"):
            self.send_json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Unauthorized. Sign in first."})
            return None
        role = str(auth.get("role", "viewer"))
        if not has_required_role(role, minimum_role):
            self.send_json(HTTPStatus.FORBIDDEN, {"ok": False, "error": f"Forbidden. {minimum_role} role required."})
            return None
        return auth

    def do_HEAD(self) -> None:  # noqa: N802 - stdlib method name
        route = urlparse(self.path).path
        if route in {
            "/healthz",
            "/api/healthz",
            "/api/auth-config",
            "/api/auth-session",
            "/api/auth-users",
            "/api/admin-health",
            "/api/providers",
            "/api/provider-health",
            "/api/provider-config",
            "/api/service-requests",
            "/api/projects",
        }:
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", "0")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        super().do_HEAD()

    def do_OPTIONS(self) -> None:  # noqa: N802 - stdlib method name
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Token")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()

    def send_error(self, code: int, message: str | None = None, explain: str | None = None) -> None:
        if urlparse(self.path).path.startswith("/api/"):
            payload = {"ok": False, "error": message or "Request failed", "status": code}
            self.send_json(HTTPStatus(code), payload)
            return
        super().send_error(code, message, explain)

    def send_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        response = json.dumps(payload).encode("utf-8")
        self.send_response(int(status))
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def send_text(self, status: HTTPStatus, text: str) -> None:
        response = text.encode("utf-8")
        self.send_response(int(status))
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, fmt: str, *args: Any) -> None:
        route = urlparse(self.path).path
        if route in {"/healthz", "/api/healthz"}:
            return
        stamp = datetime.now().strftime("%H:%M:%S")
        client_ip = self.client_address[0] if self.client_address else "-"
        print(f"[{stamp}] {client_ip} - {fmt % args}")


def validate_body(body: Any) -> str | None:
    if not isinstance(body, dict):
        return "Request body must be a JSON object"

    required = ["projectName", "owner", "template", "stack", "target", "features"]
    for key in required:
        if key not in body:
            return f"Missing field: {key}"

    if not isinstance(body["projectName"], str) or not body["projectName"].strip():
        return "projectName is required"
    if not isinstance(body["owner"], str) or not body["owner"].strip():
        return "owner is required"
    if not isinstance(body["template"], str) or not body["template"].strip():
        return "template is required"
    if not isinstance(body["stack"], str) or not body["stack"].strip():
        return "stack is required"
    if not isinstance(body["target"], str) or not body["target"].strip():
        return "target is required"
    if not isinstance(body["features"], list) or len(body["features"]) == 0:
        return "features must be a non-empty array"
    if any(not isinstance(item, str) or not item.strip() for item in body["features"]):
        return "features must contain non-empty strings"

    return None


def admin_token_required() -> bool:
    return bool(env("ADMIN_API_TOKEN"))


def read_json_list(path: Path) -> list[dict[str, Any]]:
    DATA_DIR.mkdir(exist_ok=True)
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def write_json_list(path: Path, values: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    path.write_text(json.dumps(values, indent=2), encoding="utf-8")


def read_provider_config() -> dict[str, str]:
    DATA_DIR.mkdir(exist_ok=True)
    if not PROVIDER_CONFIG_FILE.exists():
        return {}
    try:
        payload = json.loads(PROVIDER_CONFIG_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    if not isinstance(payload, dict):
        return {}
    cleaned: dict[str, str] = {}
    for key, value in payload.items():
        if key not in ALLOWED_PROVIDER_CONFIG_KEYS:
            continue
        text = str(value).strip()
        if text:
            cleaned[key] = text
    return cleaned


def write_provider_config(values: dict[str, str]) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    clean_values = {
        key: str(value).strip()
        for key, value in values.items()
        if key in ALLOWED_PROVIDER_CONFIG_KEYS and str(value).strip()
    }
    PROVIDER_CONFIG_FILE.write_text(json.dumps(clean_values, indent=2), encoding="utf-8")


def mask_secret(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        return ""
    if len(cleaned) <= 4:
        return "*" * len(cleaned)
    return f"{'*' * (len(cleaned) - 4)}{cleaned[-4:]}"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def normalize_username(value: str) -> str:
    return value.strip().lower()


def parse_iso_datetime(value: str) -> datetime | None:
    text = value.strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def password_hash(password: str, salt_hex: str) -> str:
    salt = bytes.fromhex(salt_hex)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        390000,
    )
    return digest.hex()


def validate_auth_credentials(username: str, password: str, *, allow_short_password: bool = True) -> str | None:
    cleaned_username = normalize_username(username)
    if len(cleaned_username) < 3:
        return "username must be at least 3 characters"
    if not re.match(r"^[a-z0-9._-]+$", cleaned_username):
        return "username can only contain letters, numbers, dot, dash, and underscore"
    if not password:
        return "password is required"
    if allow_short_password and len(password) < 8:
        return "password must be at least 8 characters"
    if len(password) > 128:
        return "password must be 128 characters or fewer"
    return None


def strip_private_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(user.get("id", "")),
        "username": str(user.get("username", "")),
        "role": str(user.get("role", "viewer")),
        "createdAt": str(user.get("createdAt", "")),
        "updatedAt": str(user.get("updatedAt", "")),
        "lastLoginAt": str(user.get("lastLoginAt", "")),
    }


def list_auth_users(*, public_only: bool = False) -> list[dict[str, Any]]:
    users = read_json_list(AUTH_USERS_FILE)
    normalized: list[dict[str, Any]] = []
    for user in users:
        username = normalize_username(str(user.get("username", "")))
        role = str(user.get("role", "viewer")).strip().lower()
        if not username or role not in ALLOWED_USER_ROLES:
            continue
        record = dict(user)
        record["username"] = username
        record["role"] = role
        normalized.append(strip_private_user(record) if public_only else record)
    normalized.sort(key=lambda item: str(item.get("createdAt", "")))
    return normalized


def auth_bootstrap_required() -> bool:
    return len(list_auth_users(public_only=False)) == 0


def create_auth_user(*, username: str, password: str, role: str) -> dict[str, Any]:
    normalized_username = normalize_username(username)
    normalized_role = role.strip().lower()
    if normalized_role not in ALLOWED_USER_ROLES:
        return {"ok": False, "error": "Invalid role"}

    users = list_auth_users(public_only=False)
    if any(normalize_username(str(user.get("username", ""))) == normalized_username for user in users):
        return {"ok": False, "error": "username already exists"}

    timestamp = now_utc().isoformat()
    salt = secrets.token_hex(16)
    record = {
        "id": f"user_{secrets.token_hex(8)}",
        "username": normalized_username,
        "role": normalized_role,
        "createdAt": timestamp,
        "updatedAt": timestamp,
        "lastLoginAt": "",
        "passwordSalt": salt,
        "passwordHash": password_hash(password, salt),
    }
    users.append(record)
    write_json_list(AUTH_USERS_FILE, users)
    return {"ok": True, "user": record}


def authenticate_user(*, username: str, password: str) -> dict[str, Any] | None:
    normalized_username = normalize_username(username)
    users = list_auth_users(public_only=False)

    changed = False
    authenticated: dict[str, Any] | None = None
    for user in users:
        if normalize_username(str(user.get("username", ""))) != normalized_username:
            continue
        salt = str(user.get("passwordSalt", ""))
        stored_hash = str(user.get("passwordHash", ""))
        if not salt or not stored_hash:
            return None
        computed_hash = password_hash(password, salt)
        if not hmac.compare_digest(stored_hash, computed_hash):
            return None
        now_iso = now_utc().isoformat()
        user["lastLoginAt"] = now_iso
        user["updatedAt"] = now_iso
        authenticated = user
        changed = True
        break

    if changed:
        write_json_list(AUTH_USERS_FILE, users)
    return authenticated


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def valid_session_role(role: str) -> str:
    cleaned = role.strip().lower()
    return cleaned if cleaned in ALLOWED_USER_ROLES else "viewer"


def clean_sessions(sessions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    now = now_utc()
    kept: list[dict[str, Any]] = []
    for session in sessions:
        expires_at = parse_iso_datetime(str(session.get("expiresAt", "")))
        token_hash = str(session.get("tokenHash", ""))
        if not expires_at or expires_at <= now or not token_hash:
            continue
        kept.append(session)
    return kept


def create_auth_session(user: dict[str, Any]) -> dict[str, Any]:
    sessions = clean_sessions(read_json_list(AUTH_SESSIONS_FILE))
    timestamp = now_utc()
    expires_at = timestamp + timedelta(hours=SESSION_HOURS)
    raw_token = secrets.token_urlsafe(32)
    session = {
        "id": f"session_{secrets.token_hex(8)}",
        "userId": str(user.get("id", "")),
        "username": normalize_username(str(user.get("username", ""))),
        "role": valid_session_role(str(user.get("role", "viewer"))),
        "tokenHash": hash_session_token(raw_token),
        "createdAt": timestamp.isoformat(),
        "lastSeenAt": timestamp.isoformat(),
        "expiresAt": expires_at.isoformat(),
    }
    sessions.insert(0, session)
    write_json_list(AUTH_SESSIONS_FILE, sessions)
    return {"token": raw_token, "session": session}


def find_auth_session(token: str) -> dict[str, Any] | None:
    if not token:
        return None

    sessions = read_json_list(AUTH_SESSIONS_FILE)
    cleaned = clean_sessions(sessions)
    token_hash = hash_session_token(token)
    now_iso = now_utc().isoformat()

    match: dict[str, Any] | None = None
    for session in cleaned:
        stored_hash = str(session.get("tokenHash", ""))
        if not stored_hash:
            continue
        if hmac.compare_digest(stored_hash, token_hash):
            session["lastSeenAt"] = now_iso
            match = session
            break

    if cleaned != sessions or match is not None:
        write_json_list(AUTH_SESSIONS_FILE, cleaned)
    return match


def revoke_auth_session(token: str) -> None:
    if not token:
        return
    sessions = read_json_list(AUTH_SESSIONS_FILE)
    token_hash = hash_session_token(token)
    filtered = [item for item in sessions if not hmac.compare_digest(str(item.get("tokenHash", "")), token_hash)]
    if len(filtered) != len(sessions):
        write_json_list(AUTH_SESSIONS_FILE, filtered)


def extract_bearer_token(headers: Any) -> str:
    try:
        auth = str(headers.get("Authorization", "") or "")
    except Exception:  # noqa: BLE001
        auth = ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return ""


def extract_admin_token(headers: Any) -> str:
    try:
        explicit = str(headers.get("X-Admin-Token", "") or "")
    except Exception:  # noqa: BLE001
        explicit = ""
    if explicit.strip():
        return explicit.strip()
    return extract_bearer_token(headers)


def has_required_role(role: str, minimum_role: str) -> bool:
    hierarchy = {"viewer": 10, "admin": 20, "owner": 30}
    current = hierarchy.get(role.strip().lower(), 0)
    required = hierarchy.get(minimum_role.strip().lower(), 100)
    return current >= required


def authorize_request(headers: Any) -> dict[str, Any]:
    configured = env("ADMIN_API_TOKEN")
    provided_admin = extract_admin_token(headers)
    if configured and provided_admin and hmac.compare_digest(configured, provided_admin):
        return {
            "ok": True,
            "source": "admin_token",
            "userId": "system_admin_token",
            "username": "token-admin",
            "role": "owner",
        }

    session_token = extract_bearer_token(headers)
    session = find_auth_session(session_token)
    if session:
        role = valid_session_role(str(session.get("role", "viewer")))
        return {
            "ok": True,
            "source": "session",
            "userId": str(session.get("userId", "")),
            "username": normalize_username(str(session.get("username", ""))),
            "role": role,
        }

    return {"ok": False}


def provider_catalog() -> dict[str, Any]:
    return {
        "currency": "USD",
        "providers": [
            {
                "id": "render",
                "name": "Render",
                "category": "hosting",
                "description": "Managed hosting for web services and APIs.",
                "services": [
                    {
                        "id": "managed-web-hosting",
                        "name": "Managed Web Hosting",
                        "description": "Deploy frontend and backend apps with managed infrastructure.",
                        "plans": [
                            {"id": "starter", "label": "Starter", "billing": {"monthly": 7}},
                            {"id": "pro", "label": "Pro", "billing": {"monthly": 25}},
                            {"id": "team", "label": "Team", "billing": {"monthly": 85}},
                        ],
                    }
                ],
            },
            {
                "id": "dynadot",
                "name": "Dynadot",
                "category": "domain",
                "description": "Domain registration and DNS management with API access.",
                "services": [
                    {
                        "id": "domain-registration",
                        "name": "Domain Registration",
                        "description": "Register and connect a domain with DNS controls.",
                        "plans": [
                            {"id": "dot-com", "label": "Single Domain", "billing": {"yearly": 14}},
                            {"id": "dot-net", "label": "Business Domain", "billing": {"yearly": 16}},
                            {"id": "dot-org", "label": "Organization Domain", "billing": {"yearly": 13}},
                        ],
                    }
                ],
            },
            {
                "id": "supabase",
                "name": "Supabase",
                "category": "database",
                "description": "Postgres database, auth, and storage backend.",
                "services": [
                    {
                        "id": "managed-postgres",
                        "name": "Managed Postgres",
                        "description": "Hosted Postgres with auth and API helpers.",
                        "plans": [
                            {"id": "free", "label": "Free", "billing": {"monthly": 0}},
                            {"id": "pro", "label": "Pro", "billing": {"monthly": 25}},
                            {"id": "team", "label": "Team", "billing": {"monthly": 99}},
                        ],
                    }
                ],
            },
            {
                "id": "neon",
                "name": "Neon",
                "category": "database",
                "description": "Serverless PostgreSQL for production apps.",
                "services": [
                    {
                        "id": "serverless-postgres",
                        "name": "Serverless PostgreSQL",
                        "description": "Auto-scaling Postgres with branching workflows.",
                        "plans": [
                            {"id": "launch", "label": "Launch", "billing": {"monthly": 19}},
                            {"id": "scale", "label": "Scale", "billing": {"monthly": 69}},
                        ],
                    }
                ],
            },
        ],
    }


def validate_service_request_payload(body: Any) -> str | None:
    if not isinstance(body, dict):
        return "Request body must be a JSON object"

    if not isinstance(body.get("customerName"), str) or not body["customerName"].strip():
        return "customerName is required"
    if not isinstance(body.get("email"), str) or not body["email"].strip():
        return "email is required"
    email = body["email"].strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return "email must be valid"
    if not isinstance(body.get("projectName"), str) or not body["projectName"].strip():
        return "projectName is required"

    items = body.get("items")
    if not isinstance(items, list) or len(items) == 0:
        return "items must be a non-empty array"

    for item in items:
        if not isinstance(item, dict):
            return "Each item must be an object"
        if not isinstance(item.get("providerId"), str) or not item["providerId"].strip():
            return "Each item needs providerId"
        if not isinstance(item.get("serviceId"), str) or not item["serviceId"].strip():
            return "Each item needs serviceId"
        if not isinstance(item.get("planId"), str) or not item["planId"].strip():
            return "Each item needs planId"
        if not isinstance(item.get("billingCycle"), str) or not item["billingCycle"].strip():
            return "Each item needs billingCycle"

    notes = body.get("notes")
    if notes is not None and not isinstance(notes, str):
        return "notes must be text"

    return None


def validate_provision_payload(body: Any) -> str | None:
    if not isinstance(body, dict):
        return "Request body must be a JSON object"
    if not isinstance(body.get("requestId"), str) or not body["requestId"].strip():
        return "requestId is required"
    if body.get("domainName") is not None and not isinstance(body.get("domainName"), str):
        return "domainName must be text"
    if body.get("region") is not None and not isinstance(body.get("region"), str):
        return "region must be text"
    if body.get("dbPassword") is not None and not isinstance(body.get("dbPassword"), str):
        return "dbPassword must be text"
    if body.get("retryFailed") is not None and not isinstance(body.get("retryFailed"), bool):
        return "retryFailed must be true or false"
    return None


def validate_status_update_payload(body: Any) -> str | None:
    if not isinstance(body, dict):
        return "Request body must be a JSON object"
    request_id = body.get("requestId")
    status = body.get("status")
    if not isinstance(request_id, str) or not request_id.strip():
        return "requestId is required"
    if not isinstance(status, str) or not status.strip():
        return "status is required"
    normalized = status.strip().lower()
    if normalized not in ALLOWED_REQUEST_STATUSES:
        return f"status must be one of: {', '.join(sorted(ALLOWED_REQUEST_STATUSES))}"
    if body.get("reason") is not None and not isinstance(body.get("reason"), str):
        return "reason must be text"
    return None


def provider_health() -> list[dict[str, Any]]:
    render_has_owner = bool(env("RENDER_OWNER_ID"))
    render_auto_discover = bool(env("RENDER_API_KEY") and not render_has_owner)
    return [
        {
            "id": "render",
            "configured": bool(env("RENDER_API_KEY") and env("RENDER_SERVICE_REPO")),
            "required": ["RENDER_API_KEY", "RENDER_SERVICE_REPO"],
            "note": "RENDER_OWNER_ID optional" if render_auto_discover or render_has_owner else "",
        },
        {
            "id": "dynadot",
            "configured": bool(env("DYNADOT_API_KEY")),
            "required": ["DYNADOT_API_KEY"],
            "note": "Set DYNADOT_AUTO_REGISTER=true to place real registration orders.",
        },
        {
            "id": "supabase",
            "configured": bool(env("SUPABASE_ACCESS_TOKEN") and env("SUPABASE_ORG_ID")),
            "required": ["SUPABASE_ACCESS_TOKEN", "SUPABASE_ORG_ID"],
        },
        {
            "id": "neon",
            "configured": bool(env("NEON_API_KEY")),
            "required": ["NEON_API_KEY"],
        },
        {
            "id": "openai",
            "configured": bool(env("OPENAI_API_KEY")),
            "required": ["OPENAI_API_KEY"],
            "note": "Optional. Enables smarter AI planning in App Builder.",
        },
    ]


def create_service_request(body: dict[str, Any]) -> dict[str, Any]:
    catalog_index = build_catalog_index(provider_catalog())
    resolved_items: list[dict[str, Any]] = []
    total = 0.0

    for raw in body["items"]:
        key = (
            raw["providerId"].strip().lower(),
            raw["serviceId"].strip().lower(),
            raw["planId"].strip().lower(),
            raw["billingCycle"].strip().lower(),
        )
        plan = catalog_index.get(key)
        if not plan:
            return {
                "ok": False,
                "error": f"Unknown item: {raw['providerId']}/{raw['serviceId']}/{raw['planId']} ({raw['billingCycle']})",
            }

        price = float(plan["price"])
        total += price
        resolved_items.append(
            {
                "providerId": raw["providerId"],
                "providerName": plan["providerName"],
                "serviceId": raw["serviceId"],
                "serviceName": plan["serviceName"],
                "planId": raw["planId"],
                "planLabel": plan["planLabel"],
                "billingCycle": raw["billingCycle"],
                "unitPrice": price,
            }
        )

    requests = list_service_requests()
    request_id = next_service_request_id(requests)
    timestamp = datetime.now(timezone.utc).isoformat()

    record = {
        "requestId": request_id,
        "createdAt": timestamp,
        "updatedAt": timestamp,
        "customerName": body["customerName"].strip(),
        "email": body["email"].strip(),
        "projectName": body["projectName"].strip(),
        "notes": body.get("notes", "").strip(),
        "items": resolved_items,
        "total": round(total, 2),
        "status": "submitted",
        "statusHistory": [{"status": "submitted", "timestamp": timestamp, "reason": "request created"}],
        "provisioning": [],
    }

    requests.insert(0, record)
    write_service_requests(requests)

    return {"ok": True, "request": record}


def update_service_request_status(request_id: str, status: str, reason: str) -> dict[str, Any]:
    requests = list_service_requests()
    record = find_service_request(requests, request_id)
    if record is None:
        return {"ok": False, "error": "Request not found"}

    apply_status(record, status=status, reason=reason)
    write_service_requests(requests)
    return {"ok": True, "request": record}


def build_catalog_index(catalog: dict[str, Any]) -> dict[tuple[str, str, str, str], dict[str, Any]]:
    indexed: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    for provider in catalog.get("providers", []):
        provider_id = str(provider.get("id", "")).strip().lower()
        provider_name = str(provider.get("name", "")).strip()
        for service in provider.get("services", []):
            service_id = str(service.get("id", "")).strip().lower()
            service_name = str(service.get("name", "")).strip()
            for plan in service.get("plans", []):
                plan_id = str(plan.get("id", "")).strip().lower()
                plan_label = str(plan.get("label", "")).strip()
                billing = plan.get("billing", {})
                if not isinstance(billing, dict):
                    continue
                for cycle, price in billing.items():
                    cycle_name = str(cycle).strip().lower()
                    try:
                        numeric_price = float(price)
                    except (TypeError, ValueError):
                        continue
                    key = (provider_id, service_id, plan_id, cycle_name)
                    indexed[key] = {
                        "providerName": provider_name,
                        "serviceName": service_name,
                        "planLabel": plan_label,
                        "price": numeric_price,
                    }
    return indexed


def list_service_requests() -> list[dict[str, Any]]:
    DATA_DIR.mkdir(exist_ok=True)
    if not SERVICE_REQUESTS_FILE.exists():
        return []
    try:
        payload = json.loads(SERVICE_REQUESTS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def write_service_requests(requests: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    SERVICE_REQUESTS_FILE.write_text(json.dumps(requests, indent=2), encoding="utf-8")


def next_service_request_id(existing: list[dict[str, Any]]) -> str:
    date_part = datetime.now().strftime("%Y%m%d")
    max_seq = 0
    for item in existing:
        raw_id = str(item.get("requestId", ""))
        match = re.match(rf"^SRV-{date_part}-(\d{{4}})$", raw_id)
        if match:
            max_seq = max(max_seq, int(match.group(1)))
    return f"SRV-{date_part}-{max_seq + 1:04d}"


def find_service_request(requests: list[dict[str, Any]], request_id: str) -> dict[str, Any] | None:
    for record in requests:
        if str(record.get("requestId", "")) == request_id:
            return record
    return None


def apply_status(record: dict[str, Any], *, status: str, reason: str) -> None:
    status_value = status.strip().lower()
    if status_value not in ALLOWED_REQUEST_STATUSES:
        return
    timestamp = datetime.now(timezone.utc).isoformat()
    current = str(record.get("status", "")).strip().lower()
    record["updatedAt"] = timestamp
    if current != status_value:
        record["status"] = status_value
        history = record.get("statusHistory")
        if not isinstance(history, list):
            history = []
            record["statusHistory"] = history
        history.insert(0, {"status": status_value, "timestamp": timestamp, "reason": reason})


def env(name: str, default: str = "") -> str:
    os_value = str(os.environ.get(name, "")).strip()
    if os_value:
        return os_value
    provider_value = read_provider_config().get(name, "")
    if provider_value:
        return str(provider_value).strip()
    return str(default).strip()


def suggest_project_name_from_prompt(prompt: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", prompt).strip()
    if not cleaned:
        return "My AI App"
    stop_words = {"build", "create", "make", "app", "website", "site", "for", "with", "the", "a", "an", "to", "and"}
    words = [word for word in cleaned.split() if len(word) > 2 and word.lower() not in stop_words][:3]
    if not words:
        return "My AI App"
    title = " ".join(word.capitalize() for word in words)
    return title if title.endswith("App") else f"{title} App"


def infer_ai_draft_fallback(prompt: str, owner: str) -> dict[str, Any]:
    normalized = prompt.strip().lower()
    template = "SaaS Dashboard"
    if re.search(r"(marketplace|ecommerce|store|shop|listing|booking)", normalized):
        template = "Marketplace"
    elif re.search(r"(community|social|forum|member|group)", normalized):
        template = "Community Platform"
    elif re.search(r"(client|portal|agency|crm|internal|helpdesk|service desk)", normalized):
        template = "Client Portal"

    features: list[str] = []
    matcher_map = {
        "User authentication": r"(login|log in|sign in|auth|account|register|user profile)",
        "Team collaboration": r"(team|workspace|member|collaborat|organization|multi user)",
        "Payments and billing": r"(payment|billing|checkout|subscription|invoice|charge)",
        "Notifications": r"(notification|email|sms|alert|reminder|message)",
        "Admin dashboard": r"(admin|dashboard|manage|management|backoffice|back office)",
        "Analytics reports": r"(analytics|report|kpi|insight|metrics|tracking)",
    }
    for feature, pattern in matcher_map.items():
        if re.search(pattern, normalized):
            features.append(feature)
    if not features:
        features = ["Admin dashboard", "User authentication"]

    stack = "React + Supabase"
    if re.search(r"(landing page|portfolio|simple site|static|html css js)", normalized):
        stack = "HTML/CSS/JS"
    elif re.search(r"(next\.?js|nextjs)", normalized):
        stack = "Next.js + PostgreSQL"
    elif re.search(r"(node api|express|backend api|rest api)", normalized):
        stack = "Node API + React Frontend"

    target = "MVP in 1 month"
    if re.search(r"(today|asap|quick|fast|two weeks|2 weeks|prototype|beta)", normalized):
        target = "Beta in 2 weeks"
    elif re.search(r"(production|launch|public)", normalized):
        target = "Production in 2 months"
    elif re.search(r"(scale|scaling|enterprise|global|high traffic)", normalized):
        target = "Scale in 3+ months"

    return {
        "projectName": suggest_project_name_from_prompt(prompt),
        "template": template,
        "features": features,
        "stack": stack,
        "target": target,
        "owner": owner.strip() or "Founder",
        "summary": "AI produced a first draft and selected a launch path.",
        "nextSteps": [
            "Preview the generated draft and confirm the core workflow.",
            "Connect required providers only after feature proof.",
            "Generate scaffold and continue through services provisioning.",
        ],
    }


def normalize_ai_choice(value: Any, allowed: list[str], fallback: str) -> str:
    text = str(value or "").strip()
    if not text:
        return fallback
    for option in allowed:
        if text.lower() == option.lower():
            return option
    return fallback


def normalize_ai_features(value: Any, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return fallback
    result: list[str] = []
    for item in value:
        text = str(item or "").strip()
        if not text:
            continue
        for option in AI_FEATURE_OPTIONS:
            if text.lower() == option.lower() and option not in result:
                result.append(option)
                break
    return result or fallback


def normalize_ai_draft_payload(raw: dict[str, Any], prompt: str, owner: str) -> dict[str, Any]:
    fallback = infer_ai_draft_fallback(prompt, owner)
    return {
        "projectName": str(raw.get("projectName", "")).strip() or fallback["projectName"],
        "template": normalize_ai_choice(raw.get("template"), AI_TEMPLATE_OPTIONS, fallback["template"]),
        "features": normalize_ai_features(raw.get("features"), list(fallback["features"])),
        "stack": normalize_ai_choice(raw.get("stack"), AI_STACK_OPTIONS, fallback["stack"]),
        "target": normalize_ai_choice(raw.get("target"), AI_TARGET_OPTIONS, fallback["target"]),
        "owner": str(raw.get("owner", "")).strip() or fallback["owner"],
        "summary": str(raw.get("summary", "")).strip() or fallback["summary"],
        "nextSteps": raw.get("nextSteps", fallback["nextSteps"]) if isinstance(raw.get("nextSteps"), list) else fallback["nextSteps"],
    }


def extract_openai_content(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ""
    choices = payload.get("choices", [])
    if not isinstance(choices, list) or not choices:
        return ""
    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        return ""
    message = first_choice.get("message", {})
    if not isinstance(message, dict):
        return ""
    content = message.get("content", "")
    return str(content).strip()


def generate_ai_build_plan(*, prompt: str, owner: str) -> dict[str, Any]:
    fallback = infer_ai_draft_fallback(prompt, owner)
    api_key = env("OPENAI_API_KEY")
    model = env("OPENAI_MODEL", "gpt-4o-mini")

    if not api_key:
        return {
            "ok": True,
            "source": "fallback",
            "draft": fallback,
            "note": "OPENAI_API_KEY is not configured. Using local AI fallback.",
        }

    system_prompt = (
        "You are an app planning assistant for islaAPP. Return only valid JSON with keys: "
        "projectName, template, features, stack, target, owner, summary, nextSteps. "
        "Use only these templates: "
        + ", ".join(AI_TEMPLATE_OPTIONS)
        + ". Use only these features: "
        + ", ".join(AI_FEATURE_OPTIONS)
        + ". Use only these stacks: "
        + ", ".join(AI_STACK_OPTIONS)
        + ". Use only these targets: "
        + ", ".join(AI_TARGET_OPTIONS)
        + ". nextSteps must be an array of 3 short strings."
    )

    user_prompt = (
        f"Client request: {prompt}\n"
        f"Owner: {owner or 'Founder'}\n"
        "Generate best first draft plan."
    )

    response = provider_api_request(
        method="POST",
        url="https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        payload={
            "model": model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        },
        timeout=40,
    )

    if not response.get("ok"):
        error_payload = response.get("error", {})
        error_text = str(error_payload)
        return {
            "ok": True,
            "source": "fallback",
            "draft": fallback,
            "note": f"OpenAI request failed. Using fallback. Details: {error_text}",
        }

    content = extract_openai_content(response.get("data"))
    if not content:
        return {
            "ok": True,
            "source": "fallback",
            "draft": fallback,
            "note": "OpenAI returned empty content. Using fallback.",
        }

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return {
            "ok": True,
            "source": "fallback",
            "draft": fallback,
            "note": "OpenAI response was not valid JSON. Using fallback.",
        }

    if not isinstance(parsed, dict):
        return {
            "ok": True,
            "source": "fallback",
            "draft": fallback,
            "note": "OpenAI response shape invalid. Using fallback.",
        }

    draft = normalize_ai_draft_payload(parsed, prompt, owner)
    return {"ok": True, "source": "openai", "draft": draft}


def provision_service_request(request_id: str, options: dict[str, str]) -> dict[str, Any]:
    requests = list_service_requests()
    request_record = find_service_request(requests, request_id)

    if request_record is None:
        return {"ok": False, "error": "Request not found"}

    items = request_record.get("items", [])
    if not isinstance(items, list) or len(items) == 0:
        return {"ok": False, "error": "Request has no service items"}

    project_name = str(request_record.get("projectName", "island-project")).strip() or "island-project"
    domain_name = options.get("domainName") or project_name.replace(" ", "").lower() + ".com"
    region = options.get("region") or env("DEFAULT_REGION", "us-east-1")
    db_password = options.get("dbPassword") or env("SUPABASE_DB_PASS") or env("DEFAULT_DB_PASSWORD")
    retry_failed = bool(options.get("retryFailed"))

    existing_entries = request_record.get("provisioning", [])
    existing_map: dict[int, dict[str, Any]] = {}
    if isinstance(existing_entries, list):
        for entry in existing_entries:
            if not isinstance(entry, dict):
                continue
            idx = entry.get("itemIndex")
            if isinstance(idx, int):
                existing_map[idx] = entry

    target_indices = list(range(len(items)))
    if retry_failed:
        failed_indices = []
        for idx, entry in existing_map.items():
            result = entry.get("result")
            if isinstance(result, dict) and not result.get("ok", False):
                failed_indices.append(idx)
        if not failed_indices:
            return {"ok": False, "error": "No failed provisioning items available to retry"}
        target_indices = sorted(set(failed_indices))

    provisioning_results: list[dict[str, Any]] = []
    success_count = 0

    for idx in target_indices:
        item = items[idx]
        provider_id = str(item.get("providerId", "")).strip().lower()
        service_id = str(item.get("serviceId", "")).strip().lower()
        plan_id = str(item.get("planId", "")).strip().lower()

        try:
            if provider_id == "render" and service_id == "managed-web-hosting":
                result = provision_render_hosting(project_name=project_name, plan_id=plan_id)
            elif provider_id in {"dynadot", "namecheap", "cloudflare"} and service_id == "domain-registration":
                result = provision_dynadot_domain(domain_name=domain_name, plan_id=plan_id)
            elif provider_id == "supabase" and service_id == "managed-postgres":
                result = provision_supabase_project(project_name=project_name, plan_id=plan_id, region=region, db_password=db_password)
            elif provider_id == "neon" and service_id == "serverless-postgres":
                result = provision_neon_project(project_name=project_name, region=region)
            else:
                result = {"ok": False, "error": f"No provisioning adapter for {provider_id}/{service_id}"}
        except Exception as exc:  # noqa: BLE001
            result = {"ok": False, "error": f"Provisioning exception: {exc}"}

        entry = {
            "itemIndex": idx,
            "providerId": provider_id,
            "serviceId": service_id,
            "planId": plan_id,
            "result": result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        provisioning_results.append(entry)
        existing_map[idx] = entry
        if result.get("ok"):
            success_count += 1

    total_processed = len(provisioning_results)
    if total_processed == 0:
        return {"ok": False, "error": "No provisioning items processed"}

    finalized_entries = [existing_map[i] for i in sorted(existing_map.keys())]
    request_record["provisioning"] = finalized_entries

    has_all_items = len(existing_map) == len(items)
    if has_all_items:
        total_ok = 0
        for idx in range(len(items)):
            entry = existing_map.get(idx, {})
            result = entry.get("result", {}) if isinstance(entry, dict) else {}
            if isinstance(result, dict) and result.get("ok"):
                total_ok += 1
        if total_ok == len(items):
            next_status = "active"
        elif total_ok == 0:
            next_status = "provision_failed"
        else:
            next_status = "partially_active"
    else:
        next_status = "provisioning"

    apply_status(
        request_record,
        status=next_status,
        reason="retry failed provisioning" if retry_failed else "provisioning run",
    )
    write_service_requests(requests)

    return {
        "ok": True,
        "request": request_record,
        "summary": {"success": success_count, "failed": total_processed - success_count, "total": total_processed},
    }


def provider_api_request(
    *,
    method: str,
    url: str,
    headers: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
    timeout: int = 20,
) -> dict[str, Any]:
    body = None
    merged_headers = {"Content-Type": "application/json"}
    if headers:
        merged_headers.update(headers)
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")

    request = urlrequest.Request(url=url, method=method.upper(), headers=merged_headers, data=body)
    try:
        with urlrequest.urlopen(request, timeout=timeout) as response:  # noqa: S310 - deliberate trusted API call
            raw = response.read().decode("utf-8", errors="replace")
            status = int(response.status)
            parsed: Any
            try:
                parsed = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                parsed = {"raw": raw}
            return {"ok": 200 <= status < 300, "status": status, "data": parsed}
    except urlerror.HTTPError as exc:
        raw_error = exc.read().decode("utf-8", errors="replace")
        try:
            parsed_error = json.loads(raw_error) if raw_error else {}
        except json.JSONDecodeError:
            parsed_error = {"raw": raw_error}
        return {"ok": False, "status": int(exc.code), "error": parsed_error}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "status": 0, "error": str(exc)}


def provision_render_hosting(*, project_name: str, plan_id: str) -> dict[str, Any]:
    token = env("RENDER_API_KEY")
    repo = env("RENDER_SERVICE_REPO")
    branch = env("RENDER_SERVICE_BRANCH", "main")
    region = env("RENDER_SERVICE_REGION", "oregon")

    if not token or not repo:
        return {
            "ok": False,
            "error": "Render not configured. Required: RENDER_API_KEY, RENDER_SERVICE_REPO",
        }

    owner_id = resolve_render_owner_id(token)
    if not owner_id:
        return {
            "ok": False,
            "error": "Could not resolve Render owner. Set RENDER_OWNER_ID or ensure API key can access /v1/owners.",
        }

    plan_lookup = {"starter": "starter", "pro": "standard", "team": "pro"}
    payload = {
        "type": "web_service",
        "name": slugify(f"{project_name}-web")[:40],
        "ownerId": owner_id,
        "repo": repo,
        "branch": branch,
        "autoDeploy": "yes",
        "serviceDetails": {
            "env": "node",
            "plan": plan_lookup.get(plan_id, "starter"),
            "region": region,
            "buildCommand": env("RENDER_BUILD_COMMAND", "npm install"),
            "startCommand": env("RENDER_START_COMMAND", "npm start"),
        },
    }
    response = provider_api_request(
        method="POST",
        url="https://api.render.com/v1/services",
        headers={"Authorization": f"Bearer {token}"},
        payload=payload,
    )
    return normalize_provider_response(response, "render")


def resolve_render_owner_id(token: str) -> str:
    explicit = env("RENDER_OWNER_ID")
    if explicit:
        return explicit

    response = provider_api_request(
        method="GET",
        url="https://api.render.com/v1/owners",
        headers={"Authorization": f"Bearer {token}"},
    )
    if not response.get("ok"):
        return ""

    data = response.get("data")
    owners: list[dict[str, Any]] = []

    if isinstance(data, list):
        owners = [item for item in data if isinstance(item, dict)]
    elif isinstance(data, dict):
        if isinstance(data.get("items"), list):
            owners = [item for item in data.get("items", []) if isinstance(item, dict)]
        elif isinstance(data.get("data"), list):
            owners = [item for item in data.get("data", []) if isinstance(item, dict)]
        elif "id" in data:
            owners = [data]

    if not owners:
        return ""

    preferred = env("RENDER_OWNER_SLUG") or env("RENDER_OWNER_NAME")
    if preferred:
        preferred_lower = preferred.lower()
        for owner in owners:
            slug = str(owner.get("slug", "")).lower()
            name = str(owner.get("name", "")).lower()
            if preferred_lower in {slug, name}:
                return str(owner.get("id", ""))

    return str(owners[0].get("id", ""))


def parse_domain_name(domain_name: str) -> tuple[str, str] | None:
    cleaned = domain_name.strip().lower().rstrip(".")
    if cleaned.count(".") < 1:
        return None
    parts = cleaned.split(".")
    sld = parts[0]
    tld = ".".join(parts[1:])
    if not sld or not tld:
        return None
    if not re.match(r"^[a-z0-9-]+$", sld):
        return None
    if not re.match(r"^[a-z0-9.-]+$", tld):
        return None
    return sld, tld


def parse_bool_env(name: str, default: bool = False) -> bool:
    value = env(name)
    if not value:
        return default
    return value.lower() in {"1", "true", "yes", "y", "on"}


def dynadot_get_response(data: Any, root_key: str) -> dict[str, Any]:
    if not isinstance(data, dict):
        return {}
    payload = data.get(root_key, {})
    if isinstance(payload, dict):
        return payload
    return {}


def dynadot_first_result(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        if "SearchResult" in value:
            return dynadot_first_result(value.get("SearchResult"))
        return value
    if isinstance(value, list) and value:
        first = value[0]
        return first if isinstance(first, dict) else {}
    return {}


def dynadot_status_ok(payload: dict[str, Any]) -> bool:
    code = str(payload.get("ResponseCode", ""))
    status = str(payload.get("Status", "")).strip().lower()
    return code == "0" and status == "success"


def dynadot_error(payload: dict[str, Any], fallback: str) -> str:
    message = str(payload.get("Error", "")).strip()
    return message or fallback


def dynadot_search_domain(*, api_key: str, domain_name: str) -> dict[str, Any]:
    params = {
        "key": api_key,
        "command": "search",
        "domain0": domain_name,
        "show_price": "1",
        "currency": "USD",
    }
    response = provider_api_request(
        method="GET",
        url=f"https://api.dynadot.com/api3.json?{urlencode(params)}",
    )
    if not response.get("ok"):
        return {"ok": False, "error": response.get("error", "Dynadot search failed"), "status": response.get("status", 0)}

    payload = dynadot_get_response(response.get("data"), "SearchResponse")
    if not dynadot_status_ok(payload):
        return {"ok": False, "error": dynadot_error(payload, "Dynadot search rejected"), "status": response.get("status", 0)}

    first = dynadot_first_result(payload.get("SearchResults", {}))
    if not first:
        return {"ok": False, "error": "Dynadot returned no search result", "status": response.get("status", 0)}

    available_text = str(first.get("Available", "")).strip().lower()
    return {
        "ok": True,
        "status": response.get("status", 0),
        "domain": str(first.get("DomainName", domain_name)).strip().lower() or domain_name,
        "available": available_text in {"yes", "true", "1"},
        "price": str(first.get("Price", "")).strip(),
    }


def dynadot_register_domain(*, api_key: str, domain_name: str, years: int = 1) -> dict[str, Any]:
    params = {
        "key": api_key,
        "command": "register",
        "domain": domain_name,
        "duration": str(max(1, years)),
    }
    response = provider_api_request(
        method="GET",
        url=f"https://api.dynadot.com/api3.json?{urlencode(params)}",
    )
    if not response.get("ok"):
        return {"ok": False, "error": response.get("error", "Dynadot register failed"), "status": response.get("status", 0)}

    payload = dynadot_get_response(response.get("data"), "RegisterResponse")
    if not dynadot_status_ok(payload):
        return {"ok": False, "error": dynadot_error(payload, "Dynadot register rejected"), "status": response.get("status", 0)}

    return {"ok": True, "status": response.get("status", 0), "domain": domain_name}


def provision_dynadot_domain(*, domain_name: str, plan_id: str) -> dict[str, Any]:
    api_key = env("DYNADOT_API_KEY")
    auto_register = parse_bool_env("DYNADOT_AUTO_REGISTER", default=False)
    registration_years = int(env("DYNADOT_REGISTRATION_YEARS", "1") or "1")

    if not api_key:
        return {
            "ok": False,
            "provider": "dynadot",
            "error": "Dynadot not configured. Required: DYNADOT_API_KEY",
        }

    normalized_domain = domain_name.strip().lower()
    parsed_domain = parse_domain_name(normalized_domain)
    if not parsed_domain:
        return {"ok": False, "provider": "dynadot", "error": "Invalid domain. Example: mydomain.com"}

    search = dynadot_search_domain(api_key=api_key, domain_name=normalized_domain)
    if not search.get("ok"):
        return {
            "ok": False,
            "provider": "dynadot",
            "status": int(search.get("status", 0)),
            "error": search.get("error", "Dynadot search failed"),
        }

    if not bool(search.get("available", False)):
        return {
            "ok": False,
            "provider": "dynadot",
            "status": int(search.get("status", 0)),
            "error": "Domain is not available for registration.",
            "data": {"domain": search.get("domain", normalized_domain), "available": False},
        }

    if not auto_register:
        return {
            "ok": True,
            "provider": "dynadot",
            "status": int(search.get("status", 0)),
            "resourceId": str(search.get("domain", normalized_domain)),
            "data": {
                "domain": str(search.get("domain", normalized_domain)),
                "planId": plan_id,
                "available": True,
                "quotedPrice": str(search.get("price", "")),
                "message": "Domain is available. Set DYNADOT_AUTO_REGISTER=true to place live registration orders.",
            },
        }

    registered = dynadot_register_domain(api_key=api_key, domain_name=normalized_domain, years=registration_years)
    if not registered.get("ok"):
        return {
            "ok": False,
            "provider": "dynadot",
            "status": int(registered.get("status", 0)),
            "error": registered.get("error", "Dynadot registration failed"),
        }

    return {
        "ok": True,
        "provider": "dynadot",
        "status": int(registered.get("status", 0)),
        "resourceId": str(registered.get("domain", normalized_domain)),
        "data": {
            "domain": str(registered.get("domain", normalized_domain)),
            "planId": plan_id,
            "registered": True,
            "years": registration_years,
            "message": "Domain registration completed via Dynadot API.",
        },
    }


def provision_supabase_project(*, project_name: str, plan_id: str, region: str, db_password: str) -> dict[str, Any]:
    token = env("SUPABASE_ACCESS_TOKEN")
    org_id = env("SUPABASE_ORG_ID")
    if not token or not org_id:
        return {"ok": False, "error": "Supabase not configured. Required: SUPABASE_ACCESS_TOKEN, SUPABASE_ORG_ID"}
    if not db_password:
        return {"ok": False, "error": "Supabase requires dbPassword or SUPABASE_DB_PASS"}

    plan_lookup = {"free": "free", "pro": "pro", "team": "team"}
    payload = {
        "name": slugify(project_name)[:30],
        "organization_id": org_id,
        "plan": plan_lookup.get(plan_id, "free"),
        "region": region or env("SUPABASE_REGION", "us-east-1"),
        "db_pass": db_password,
    }
    response = provider_api_request(
        method="POST",
        url="https://api.supabase.com/v1/projects",
        headers={"Authorization": f"Bearer {token}"},
        payload=payload,
    )
    return normalize_provider_response(response, "supabase")


def provision_neon_project(*, project_name: str, region: str) -> dict[str, Any]:
    token = env("NEON_API_KEY")
    if not token:
        return {"ok": False, "error": "Neon not configured. Required: NEON_API_KEY"}

    payload: dict[str, Any] = {
        "project": {
            "name": slugify(project_name)[:40],
            "region_id": env("NEON_REGION_ID", region or "aws-us-east-2"),
            "pg_version": int(env("NEON_PG_VERSION", "16")),
        }
    }
    neon_org = env("NEON_ORG_ID")
    if neon_org:
        payload["project"]["org_id"] = neon_org

    response = provider_api_request(
        method="POST",
        url="https://console.neon.tech/api/v2/projects",
        headers={"Authorization": f"Bearer {token}"},
        payload=payload,
    )
    return normalize_provider_response(response, "neon")


def normalize_provider_response(response: dict[str, Any], provider: str) -> dict[str, Any]:
    if response.get("ok"):
        data = response.get("data", {})
        identifier = extract_resource_id(provider, data)
        return {"ok": True, "provider": provider, "status": response.get("status"), "resourceId": identifier, "data": data}

    error_payload = response.get("error", response.get("data", {}))
    return {
        "ok": False,
        "provider": provider,
        "status": response.get("status", 0),
        "error": error_payload,
    }


def extract_resource_id(provider: str, payload: Any) -> str:
    if not isinstance(payload, dict):
        return ""
    if provider == "dynadot":
        return str(payload.get("domain", payload.get("id", "")))
    if provider == "render":
        return str(payload.get("id", ""))
    if provider == "supabase":
        return str(payload.get("id", payload.get("ref", "")))
    if provider == "neon":
        project = payload.get("project", {})
        if isinstance(project, dict):
            return str(project.get("id", ""))
    return str(payload.get("id", ""))


def slugify(name: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
    return normalized or "new-project"


def unique_project_dir(base_slug: str) -> Path:
    PROJECTS_DIR.mkdir(exist_ok=True)
    candidate = PROJECTS_DIR / base_slug
    if not candidate.exists():
        return candidate

    suffix = 2
    while True:
        with_suffix = PROJECTS_DIR / f"{base_slug}-{suffix}"
        if not with_suffix.exists():
            return with_suffix
        suffix += 1


def create_project_scaffold(body: dict[str, Any]) -> dict[str, Any]:
    project_name = body["projectName"].strip()
    owner = body["owner"].strip()
    template = body["template"].strip()
    stack = body["stack"].strip()
    target = body["target"].strip()
    features = [item.strip() for item in body["features"]]

    project_dir = unique_project_dir(slugify(project_name))
    project_dir.mkdir(parents=True, exist_ok=False)

    context = {
        "project_name": project_name,
        "owner": owner,
        "template": template,
        "stack": stack,
        "target": target,
        "features": features,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    files = build_files_for_stack(context)
    files["project-brief.json"] = json.dumps(
        {
            "projectName": project_name,
            "owner": owner,
            "template": template,
            "stack": stack,
            "target": target,
            "features": features,
            "createdAt": context["created_at"],
        },
        indent=2,
    )

    write_files(project_dir, files)

    return {
        "ok": True,
        "projectDir": str(project_dir),
        "projectName": project_name,
        "stack": stack,
        "files": sorted(files.keys()),
    }


def build_files_for_stack(context: dict[str, Any]) -> dict[str, str]:
    stack = context["stack"]
    if stack == "React + Supabase":
        return build_react_supabase_files(context)
    if stack == "Next.js + PostgreSQL":
        return build_next_postgres_files(context)
    if stack == "Node API + React Frontend":
        return build_node_react_files(context)
    return build_static_files(context)


def build_readme(context: dict[str, Any], commands: list[str]) -> str:
    features = "\n".join(f"- {feature}" for feature in context["features"])
    command_lines = "\n".join(f"{idx}. {line}" for idx, line in enumerate(commands, start=1))
    return f"""# {context["project_name"]}

Owner: {context["owner"]}

Template: {context["template"]}
Stack: {context["stack"]}
Launch target: {context["target"]}

## Core Features
{features}

## Starter Commands
{command_lines}
"""


def build_static_files(context: dict[str, Any]) -> dict[str, str]:
    feature_items = render_features_for_html(context["features"], "        ")
    readme = build_readme(
        context,
        [
            "Open `index.html` in your browser for a static preview.",
            "Edit `app.js` for app behavior.",
            "Edit `styles.css` for UI changes.",
        ],
    )

    index_html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{escape_html(context["project_name"])} | Starter</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="app">
      <h1>{escape_html(context["project_name"])}</h1>
      <p class="subtitle">Template: {escape_html(context["template"])}</p>
      <section>
        <h2>Launch Target</h2>
        <p>{escape_html(context["target"])}</p>
      </section>
      <section>
        <h2>Feature Checklist</h2>
        <ul>
{feature_items}
        </ul>
      </section>
      <button id="pingButton">Test Starter Action</button>
      <p id="statusText" aria-live="polite"></p>
    </main>
    <script src="app.js"></script>
  </body>
</html>
"""

    styles_css = """* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #1f2436;
  background: linear-gradient(135deg, #f7f2e8, #ede2cf);
}

.app {
  width: min(760px, 92vw);
  margin: 3rem auto;
  padding: 1.25rem;
  border-radius: 1rem;
  border: 1px solid rgba(36, 79, 212, 0.2);
  background: #fffdf9;
}

h1 {
  margin: 0 0 0.45rem;
}

.subtitle {
  margin-top: 0;
  color: #3a4670;
}
"""

    app_js = """const pingButton = document.getElementById("pingButton");
const statusText = document.getElementById("statusText");

if (pingButton && statusText) {
  pingButton.addEventListener("click", () => {
    statusText.textContent = "Starter action works. Begin building your app logic here.";
  });
}
"""

    return {
        "README.md": readme,
        "index.html": index_html,
        "styles.css": styles_css,
        "app.js": app_js,
    }


def build_react_supabase_files(context: dict[str, Any]) -> dict[str, str]:
    feature_items = render_features_for_html(context["features"], "          ")
    readme = build_readme(
        context,
        [
            "Run `npm install`.",
            "Copy `.env.example` to `.env` and set Supabase keys.",
            "Run `npm run dev`.",
        ],
    )

    package_json = json.dumps(
        {
            "name": slugify(context["project_name"]),
            "private": True,
            "version": "0.1.0",
            "type": "module",
            "scripts": {"dev": "vite", "build": "vite build", "preview": "vite preview"},
            "dependencies": {"@supabase/supabase-js": "^2.50.0", "react": "^18.3.1", "react-dom": "^18.3.1"},
            "devDependencies": {"@vitejs/plugin-react": "^4.3.2", "vite": "^5.4.8"},
        },
        indent=2,
    )

    return {
        "README.md": readme,
        ".env.example": "VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n",
        "package.json": package_json,
        "vite.config.js": 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({ plugins: [react()] });\n',
        "index.html": """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>islaAPP React Starter</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
""",
        "src/main.jsx": 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App.jsx";\nimport "./App.css";\n\nReactDOM.createRoot(document.getElementById("root")).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n',
        "src/App.jsx": f"""export default function App() {{
  const features = {json.dumps(context["features"])};

  return (
    <main className="app">
      <h1>{escape_html(context["project_name"])}</h1>
      <p>Template: {escape_html(context["template"])}</p>
      <p>Launch target: {escape_html(context["target"])}</p>
      <h2>Core Features</h2>
      <ul>
{feature_items}
      </ul>
    </main>
  );
}}
""",
        "src/App.css": ".app { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 720px; }\n",
        "src/lib/supabase.js": 'import { createClient } from "@supabase/supabase-js";\n\nconst url = import.meta.env.VITE_SUPABASE_URL;\nconst anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;\n\nexport const supabase = createClient(url || "", anonKey || "");\n',
    }


def build_next_postgres_files(context: dict[str, Any]) -> dict[str, str]:
    feature_items = "\n".join(f"- {feature}" for feature in context["features"])
    readme = build_readme(
        context,
        [
            "Run `npm install`.",
            "Copy `.env.example` to `.env` and set DATABASE_URL.",
            "Run `npm run dev`.",
            "Run `npx prisma migrate dev --name init` after configuring DB.",
        ],
    )

    package_json = json.dumps(
        {
            "name": slugify(context["project_name"]),
            "private": True,
            "version": "0.1.0",
            "scripts": {"dev": "next dev", "build": "next build", "start": "next start"},
            "dependencies": {"next": "^14.2.14", "react": "^18.3.1", "react-dom": "^18.3.1", "@prisma/client": "^5.20.0"},
            "devDependencies": {"prisma": "^5.20.0"},
        },
        indent=2,
    )

    return {
        "README.md": readme,
        ".env.example": "DATABASE_URL=\"postgresql://USER:PASSWORD@HOST:5432/DB_NAME\"\n",
        "package.json": package_json,
        "app/layout.js": """import "./globals.css";

export const metadata = { title: "islaAPP Next Starter" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
""",
        "app/page.js": f"""export default function HomePage() {{
  return (
    <main>
      <h1>{escape_html(context["project_name"])}</h1>
      <p>Template: {escape_html(context["template"])}</p>
      <p>Launch target: {escape_html(context["target"])}</p>
      <pre>{escape_html(feature_items)}</pre>
    </main>
  );
}}
""",
        "app/globals.css": "body { font-family: system-ui, sans-serif; margin: 2rem; }\n",
        "prisma/schema.prisma": """generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ExampleItem {
  id        Int      @id @default(autoincrement())
  title     String
  createdAt DateTime @default(now())
}
""",
    }


def build_node_react_files(context: dict[str, Any]) -> dict[str, str]:
    feature_items = render_features_for_html(context["features"], "          ")
    readme = build_readme(
        context,
        [
            "In `api/`, run `npm install && npm run dev`.",
            "In `web/`, run `npm install && npm run dev`.",
            "Use `http://127.0.0.1:3001/api/health` to test API.",
        ],
    )

    api_package = json.dumps(
        {
            "name": f"{slugify(context['project_name'])}-api",
            "private": True,
            "version": "0.1.0",
            "type": "module",
            "scripts": {"dev": "node --watch server.js", "start": "node server.js"},
            "dependencies": {"cors": "^2.8.5", "express": "^4.21.0"},
        },
        indent=2,
    )

    web_package = json.dumps(
        {
            "name": f"{slugify(context['project_name'])}-web",
            "private": True,
            "version": "0.1.0",
            "type": "module",
            "scripts": {"dev": "vite", "build": "vite build", "preview": "vite preview"},
            "dependencies": {"react": "^18.3.1", "react-dom": "^18.3.1"},
            "devDependencies": {"@vitejs/plugin-react": "^4.3.2", "vite": "^5.4.8"},
        },
        indent=2,
    )

    return {
        "README.md": readme,
        "api/package.json": api_package,
        "api/server.js": """import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, status: "healthy" });
});

app.listen(3001, () => {
  console.log("API server running at http://127.0.0.1:3001");
});
""",
        "web/package.json": web_package,
        "web/vite.config.js": 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({ plugins: [react()] });\n',
        "web/index.html": """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Node + React Starter</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
""",
        "web/src/main.jsx": 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App.jsx";\nimport "./App.css";\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);\n',
        "web/src/App.jsx": f"""import {{ useState }} from "react";

export default function App() {{
  const [status, setStatus] = useState("Not checked");
  const features = {json.dumps(context["features"])};

  const checkApi = async () => {{
    try {{
      const response = await fetch("http://127.0.0.1:3001/api/health");
      const payload = await response.json();
      setStatus(payload.ok ? "API is healthy" : "API returned an issue");
    }} catch (_error) {{
      setStatus("API unavailable");
    }}
  }};

  return (
    <main className="app">
      <h1>{escape_html(context["project_name"])}</h1>
      <p>Template: {escape_html(context["template"])}</p>
      <ul>
{feature_items}
      </ul>
      <button onClick={{checkApi}}>Check API</button>
      <p>{{status}}</p>
    </main>
  );
}}
""",
        "web/src/App.css": ".app { margin: 2rem auto; max-width: 760px; font-family: system-ui, sans-serif; }\n",
    }


def write_files(base_dir: Path, files: dict[str, str]) -> None:
    for relative, content in files.items():
        destination = base_dir / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(content, encoding="utf-8")


def list_projects() -> list[dict[str, Any]]:
    PROJECTS_DIR.mkdir(exist_ok=True)
    results: list[dict[str, Any]] = []

    for child in PROJECTS_DIR.iterdir():
        if not child.is_dir():
            continue

        brief_path = child / "project-brief.json"
        brief: dict[str, Any] = {}
        if brief_path.exists():
            try:
                brief = json.loads(brief_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                brief = {}

        created = brief.get("createdAt")
        if not isinstance(created, str) or not created:
            created = datetime.fromtimestamp(child.stat().st_mtime, tz=timezone.utc).isoformat()

        results.append(
            {
                "slug": child.name,
                "path": str(child),
                "projectName": brief.get("projectName", child.name),
                "stack": brief.get("stack", "Unknown"),
                "owner": brief.get("owner", "Unknown"),
                "createdAt": created,
                "previewUrl": detect_preview_url(child),
            }
        )

    results.sort(key=lambda item: str(item.get("createdAt", "")), reverse=True)
    return results


def render_features_for_html(features: list[str], indent: str) -> str:
    return "\n".join(f"{indent}<li>{escape_html(feature)}</li>" for feature in features)


def detect_preview_url(project_dir: Path) -> str:
    if (project_dir / "index.html").exists():
        return f"/projects/{project_dir.name}/index.html"
    if (project_dir / "web" / "index.html").exists():
        return f"/projects/{project_dir.name}/web/index.html"
    return ""


def escape_html(raw: str) -> str:
    return (
        raw.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    display_host = "127.0.0.1" if HOST == "0.0.0.0" else HOST
    print(f"Serving islaAPP at http://{display_host}:{PORT}", flush=True)
    print(f"Project scaffolds will be created in: {PROJECTS_DIR}", flush=True)
    if IS_RENDER:
        print("Render mode detected: enforcing 0.0.0.0 bind and Render-compatible port.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
