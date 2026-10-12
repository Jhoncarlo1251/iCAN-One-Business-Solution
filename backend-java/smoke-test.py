#!/usr/bin/env python3
"""Smoke-test a deployed iCAN Java API using only Python's standard library."""
import json, os, sys, urllib.request, urllib.error, uuid
BASE = os.environ.get("ICAN_API_URL", "http://localhost:4000").rstrip("/")
def request(path, method="GET", payload=None, token=None):
    data = None if payload is None else json.dumps(payload).encode()
    headers = {"Accept": "application/json"}
    if data is not None: headers["Content-Type"] = "application/json"
    if token: headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            raw = res.read()
            return res.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"{method} {path} returned HTTP {e.code}: {body[:500]}") from e
def main():
    status, data = request("/api/health")
    assert status == 200 and data.get("ok"), "API health failed"
    print("PASS API health")
    status, data = request("/api/health/db")
    assert status == 200 and data.get("database") == "postgresql", "PostgreSQL health failed"
    print("PASS PostgreSQL health")
    email = "ican-smoke-" + uuid.uuid4().hex[:12] + "@example.test"
    status, reg = request("/api/auth/register", "POST", {"name":"iCAN Smoke Test", "workspaceName":"Smoke Test " + uuid.uuid4().hex[:8], "email":email, "password":"Smoke-Test-" + uuid.uuid4().hex[:18]})
    token, workspace = reg.get("accessToken"), reg.get("workspace", {}).get("id")
    assert status in (200, 201) and token and workspace, "registration did not return accessToken/workspace"
    print("PASS registration and token issuance")
    status, me = request("/api/auth/me", token=token)
    assert status == 200 and me.get("user"), "authenticated /me failed"
    print("PASS JWT-authenticated /me")
    status, products = request("/api/products?workspaceId=" + workspace, token=token)
    assert status == 200 and "products" in products, "workspace-scoped products failed"
    print("PASS workspace-scoped products API")
    print("\nSMOKE TEST PASSED: API + PostgreSQL + JWT + authenticated endpoint.")
    print("Temporary test account:", email, "Use staging only; remove test data if desired.")
if __name__ == "__main__":
    try: main()
    except Exception as e:
        print("SMOKE TEST FAILED:", e, file=sys.stderr); sys.exit(1)
