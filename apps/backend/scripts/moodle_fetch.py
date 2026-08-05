#!/usr/bin/env python3
"""Cliente Moodle para Nisky — REST con impersonación TLS (curl_cffi) para
saltar Cloudflare. Invoa Bun como subprocess; habla JSON por stdout.

Uso:
  moodle_fetch.py token   --url <base> --username <u> --password <p>
      -> {"ok": true, "token": "..."} | {"ok": false, "error": "..."}
  moodle_fetch.py events  --url <base> --token <t> [--days-past N] [--days-ahead N]
      -> {"ok": true, "count": N, "events": [...]}
"""

import argparse
import json
import re
import sys
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from curl_cffi import requests

PREFIX_RE = re.compile(r"^(Vencimiento de|Se cierra|Se abre|Inicio de)\s+", re.IGNORECASE)
KIND_MAP = {
    "mod_assign": "assignment",
    "mod_quiz": "quiz",
    "mod_forum": "forum",
    "mod_url": "resource",
    "mod_page": "resource",
    "mod_resource": "resource",
    "mod_folder": "resource",
    "mod_book": "resource",
}

SERVICE_DEFAULT = "moodle_mobile_app"


def clean_title(name):
    return PREFIX_RE.sub("", name or "").strip() or name


def kind_of(component):
    return KIND_MAP.get(component, "other")


def normalize_event(ev: dict) -> dict:
    course = ev.get("course") or {}
    action = ev.get("action") or {}
    icon = ev.get("icon") or {}
    url = ev.get("url") or ""
    cmid = None
    m = re.search(r"/mod/[a-z_]+/view\.php\?id=(\d+)", url)
    if m:
        cmid = int(m.group(1))
    instance = ev.get("instance")
    component = ev.get("component")
    due_ts = ev.get("timesort") or ev.get("timestart")
    course_id = course.get("id")
    event_type = ev.get("eventtype") or ev.get("normalisedeventtype")
    raw_name = ev.get("name") or ""
    due_utc = datetime.fromtimestamp(due_ts, tz=ZoneInfo("UTC")).isoformat() if due_ts else None
    return {
        "task_key": f"{course_id}:{instance}:{event_type}" if course_id and instance else f"event:{ev.get('id')}",
        "moodle_event_id": ev.get("id"),
        "name": raw_name,
        "title": ev.get("activityname") or clean_title(raw_name),
        "kind": kind_of(component),
        "component": component,
        "event_type": event_type,
        "course_id": course_id,
        "course": course.get("fullname"),
        "course_short": course.get("shortname"),
        "cmid": cmid or instance,
        "instance": instance,
        "due_utc": due_utc,
        "url": url,
        "viewurl": ev.get("viewurl"),
        "actionable": bool(action.get("actionable")) if action else None,
        "action_name": action.get("name"),
        "overdue": bool(ev.get("overdue")),
        "icon_purpose": icon.get("purpose"),
    }


WSDL_SERVICE_URL = "/webservice/rest/server.php"
LOGIN_TOKEN_PATH = "/login/token.php"


def _get(base, path, params, impersonate="chrome"):
    headers = {
        "Accept": "application/json",
        "Accept-Language": "es-DO,es;q=0.9,en;q=0.8",
        "Referer": base + "/",
    }
    resp = requests.get(base + path, impersonate=impersonate, headers=headers, params=params, timeout=40)
    if resp.status_code != 200:
        raise ValueError(f"HTTP {resp.status_code} desde el servidor Moodle")
    try:
        return resp.json()
    except Exception:
        raise ValueError(f"No se recibió JSON (probablemente Cloudflare). Exp: {resp.text[:120]!r}")


def request_token(base, username, password, service=SERVICE_DEFAULT):
    params = {"username": username, "password": password, "service": service}
    data = _get(base, LOGIN_TOKEN_PATH, params)
    if isinstance(data, dict) and data.get("token"):
        return data["token"]
    message = (data or {}).get("error") or (data or {}).get("message") if isinstance(data, dict) else "respuesta inesperada"
    raise ValueError(f"Moodle rechazó credenciales o el servicio '{service}' está deshabilitado ({message})")


def fetch_events(base, token, days_past=14, days_ahead=365, limit=50):
    now = int(time.time())
    params = {
        "wstoken": token,
        "wsfunction": "core_calendar_get_action_events_by_timesort",
        "moodlewsrestformat": "json",
        "timesortfrom": now - days_past * 86400,
        "timesortto": now + days_ahead * 86400,
        "limitnum": min(max(1, limit), 50),
    }
    data = _get(base, "/webservice/rest/server.php", params)
    if isinstance(data, dict) and ("exception" in data or "errorcode" in data):
        raise ValueError(f"Moodle ws Error: {data.get('errorcode')} — {data.get('message') or data.get('error')}")
    events = (data or {}).get("events") or []
    return [normalize_event(ev) for ev in events]


def cmd_token(args):
    token = request_token(args.url, args.username, args.password, args.service)
    print(json.dumps({"ok": True, "token": token}, ensure_ascii=False))


def cmd_events(args):
    events = fetch_events(args.url, args.token, args.days_past, args.days_ahead)
    print(json.dumps({"ok": True, "count": len(events), "events": events}, ensure_ascii=False))


def main():
    ap = argparse.ArgumentParser(prog="moodle_fetch")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_token = sub.add_parser("token")
    p_token.add_argument("--url", required=True)
    p_token.add_argument("--username", required=True)
    p_token.add_argument("--password", required=True)
    p_token.add_argument("--service", default=SERVICE_DEFAULT)

    p_events = sub.add_parser("events")
    p_events.add_argument("--url", required=True)
    p_events.add_argument("--token", required=True, help="Token del web service de Moodle")
    p_events.add_argument("--days-past", type=int, default=14)
    p_events.add_argument("--days-ahead", type=int, default=365)

    args = ap.parse_args()
    try:
        if args.cmd == "token":
            cmd_token(args)
        elif args.cmd == "events":
            cmd_events(args)
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)[:300]}, ensure_ascii=False))
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())