#!/usr/bin/env python3
"""Deterministic, fail-closed MSPDI simulation trial harness.

Development/test tooling only. AI agents must emit structured proposals; they
must never edit raw XML. Only deterministic code may apply allowlisted changes.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import random
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable
import xml.etree.ElementTree as ET

AUTHORIZED_FIELDS = {"PercentComplete", "ActualStart", "ActualFinish"}
TEXT30_NAME = "Text30"
ASSIGNED_DEPARTMENT_ALIAS = "Assigned Department"
DEFAULT_SHIFTS = 60
DEFAULT_MAX_FIELD_USERS = 2


class SimulationError(RuntimeError):
    pass


@dataclass(frozen=True)
class TaskRef:
    uid: str
    external_id: str | None
    name: str
    is_summary: bool
    department: str | None


@dataclass(frozen=True)
class DepartmentTeam:
    department: str
    supervisor_id: str
    field_user_ids: tuple[str, ...]
    task_uids: tuple[str, ...]


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _child(parent: ET.Element, name: str) -> ET.Element | None:
    return next((child for child in list(parent) if _local_name(child.tag) == name), None)


def _text(parent: ET.Element, name: str) -> str | None:
    element = _child(parent, name)
    if element is None or element.text is None:
        return None
    value = element.text.strip()
    return value or None


def _children(parent: ET.Element, name: str) -> Iterable[ET.Element]:
    return (child for child in list(parent) if _local_name(child.tag) == name)


def _parse_bool(value: str | None) -> bool:
    return value in {"1", "true", "True", "TRUE"}


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _protected_xml_bytes(root: ET.Element) -> bytes:
    """Canonicalize XML while excluding only authorized values on leaf tasks.

    Authorized elements are removed entirely from leaf-task clones so adding an
    initially absent ActualStart/ActualFinish does not create false structural
    drift. Summary-task values remain protected.
    """
    clone = copy.deepcopy(root)
    for task in clone.iter():
        if _local_name(task.tag) != "Task":
            continue
        if _parse_bool(_text(task, "Summary")):
            continue
        for child in list(task):
            if _local_name(child.tag) in AUTHORIZED_FIELDS:
                task.remove(child)
    return ET.tostring(clone, encoding="utf-8")


def _full_xml_bytes(root: ET.Element) -> bytes:
    return ET.tostring(copy.deepcopy(root), encoding="utf-8")


class MspdiDocument:
    def __init__(self, source: Path):
        self.source = source
        try:
            self.tree = ET.parse(source)
        except (ET.ParseError, OSError) as exc:
            raise SimulationError(f"Unable to parse MSPDI XML: {exc}") from exc
        self.root = self.tree.getroot()
        self.namespace = ""
        if self.root.tag.startswith("{"):
            self.namespace = self.root.tag[1:].split("}", 1)[0]
            ET.register_namespace("", self.namespace)
        self.assigned_department_field_id = self._find_assigned_department_field_id()
        self.value_guid_lookup = self._build_value_guid_lookup()
        self.tasks_by_uid = self._index_tasks()
        self.baseline_protected_hash = self.protected_hash()
        self.baseline_task_uids = tuple(sorted(self.tasks_by_uid, key=_uid_sort_key))

    def _find_assigned_department_field_id(self) -> str:
        matches: list[str] = []
        for ext in self.root.iter():
            if _local_name(ext.tag) != "ExtendedAttribute":
                continue
            field_id = _text(ext, "FieldID")
            if not field_id:
                continue
            if _text(ext, "FieldName") == TEXT30_NAME or _text(ext, "Alias") == ASSIGNED_DEPARTMENT_ALIAS:
                matches.append(field_id)
        unique = sorted(set(matches))
        if len(unique) != 1:
            raise SimulationError(
                "Expected exactly one Text30 / Assigned Department field definition; "
                f"found {len(unique)}: {unique}"
            )
        return unique[0]

    def _build_value_guid_lookup(self) -> dict[str, str]:
        lookup: dict[str, str] = {}
        for ext in self.root.iter():
            if _local_name(ext.tag) != "ExtendedAttribute":
                continue
            if _text(ext, "FieldID") != self.assigned_department_field_id:
                continue
            value_list = _child(ext, "ValueList")
            if value_list is None:
                continue
            for value in _children(value_list, "Value"):
                key = _text(value, "ValueGUID") or _text(value, "ID")
                label = _text(value, "Description") or _text(value, "Value")
                if key and label:
                    lookup[key] = label
        return lookup

    def _task_department(self, task: ET.Element) -> str | None:
        for ext in _children(task, "ExtendedAttribute"):
            if _text(ext, "FieldID") != self.assigned_department_field_id:
                continue
            direct = _text(ext, "Value") or _text(ext, "Description")
            if direct:
                return direct.strip()
            guid = _text(ext, "ValueGUID")
            if guid:
                return self.value_guid_lookup.get(guid)
        return None

    def _index_tasks(self) -> dict[str, ET.Element]:
        tasks: dict[str, ET.Element] = {}
        for node in self.root.iter():
            if _local_name(node.tag) != "Task":
                continue
            uid = _text(node, "UID")
            if not uid:
                continue
            if uid in tasks:
                raise SimulationError(f"Duplicate task UID in XML: {uid}")
            tasks[uid] = node
        if not tasks:
            raise SimulationError("No Project tasks with UID values were found.")
        return tasks

    def task_refs(self) -> list[TaskRef]:
        result: list[TaskRef] = []
        for uid, task in self.tasks_by_uid.items():
            result.append(TaskRef(
                uid=uid,
                external_id=_text(task, "ID"),
                name=_text(task, "Name") or f"Task {uid}",
                is_summary=_parse_bool(_text(task, "Summary")),
                department=self._task_department(task),
            ))
        return result

    def protected_hash(self) -> str:
        return _sha256(_protected_xml_bytes(self.root))

    def full_hash(self) -> str:
        return _sha256(_full_xml_bytes(self.root))

    def percent_complete(self, uid: str) -> int:
        task = self.tasks_by_uid[uid]
        raw = _text(task, "PercentComplete") or "0"
        try:
            numeric = float(raw)
        except ValueError as exc:
            raise SimulationError(f"Task {uid} has invalid PercentComplete value {raw!r}") from exc
        if not numeric.is_integer():
            raise SimulationError(f"Task {uid} has fractional PercentComplete value {raw!r}")
        value = int(numeric)
        if not 0 <= value <= 100:
            raise SimulationError(f"Task {uid} PercentComplete outside 0..100: {value}")
        return value

    def apply_progress(self, uid: str, new_percent: int, shift_time: datetime) -> dict[str, object]:
        if uid not in self.tasks_by_uid:
            raise SimulationError(f"Unknown task UID: {uid}")
        task = self.tasks_by_uid[uid]
        if _parse_bool(_text(task, "Summary")):
            raise SimulationError(f"Summary task {uid} cannot receive direct progress writes.")
        if not isinstance(new_percent, int) or not 0 <= new_percent <= 100:
            raise SimulationError(f"Invalid percent complete for task {uid}: {new_percent!r}")

        old_percent = self.percent_complete(uid)
        if new_percent < old_percent:
            raise SimulationError(
                f"Simulation does not permit percent-complete regression: task {uid} {old_percent}->{new_percent}"
            )

        changed: dict[str, object] = {}
        if new_percent != old_percent:
            self._set_task_value(task, "PercentComplete", str(new_percent))
            changed["PercentComplete"] = {"old": old_percent, "new": new_percent}

        if old_percent == 0 and new_percent > 0 and _text(task, "ActualStart") is None:
            value = _format_project_datetime(shift_time)
            self._set_task_value(task, "ActualStart", value)
            changed["ActualStart"] = {"old": None, "new": value}

        if new_percent == 100 and _text(task, "ActualFinish") is None:
            value = _format_project_datetime(shift_time)
            self._set_task_value(task, "ActualFinish", value)
            changed["ActualFinish"] = {"old": None, "new": value}

        return changed

    def _set_task_value(self, task: ET.Element, name: str, value: str) -> None:
        if name not in AUTHORIZED_FIELDS:
            raise SimulationError(f"Attempt to write non-authorized MSPDI field: {name}")
        node = _child(task, name)
        if node is None:
            tag = f"{{{self.namespace}}}{name}" if self.namespace else name
            node = ET.SubElement(task, tag)
        node.text = value

    def assert_invariants(self) -> None:
        current_uids = tuple(sorted(self._index_tasks(), key=_uid_sort_key))
        if current_uids != self.baseline_task_uids:
            raise SimulationError("Task UID set changed during simulation.")
        if self.protected_hash() != self.baseline_protected_hash:
            raise SimulationError(
                "Protected MSPDI content changed. Only leaf-task PercentComplete, ActualStart and ActualFinish may change."
            )

    def write(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self.tree.write(path, encoding="utf-8", xml_declaration=True)
        try:
            ET.parse(path)
        except ET.ParseError as exc:
            raise SimulationError(f"Generated XML failed reparse: {path}: {exc}") from exc


def _format_project_datetime(value: datetime) -> str:
    value = value.astimezone(timezone.utc).replace(microsecond=0)
    return value.isoformat().replace("+00:00", "Z")


def _uid_sort_key(uid: str) -> tuple[int, str]:
    try:
        return (0, f"{int(uid):020d}")
    except ValueError:
        return (1, uid)


def build_department_teams(doc: MspdiDocument, max_field_users: int) -> list[DepartmentTeam]:
    if max_field_users < 0 or max_field_users > 2:
        raise SimulationError("Prototype max_field_users must be between 0 and 2.")
    grouped: dict[str, list[str]] = {}
    for task in doc.task_refs():
        if task.is_summary or not task.department:
            continue
        grouped.setdefault(task.department, []).append(task.uid)

    teams: list[DepartmentTeam] = []
    for department in sorted(grouped):
        safe = re.sub(r"[^A-Za-z0-9_-]+", "-", department).strip("-") or "DEPT"
        teams.append(DepartmentTeam(
            department=department,
            supervisor_id=f"{safe}-SUPERVISOR",
            field_user_ids=tuple(f"{safe}-FIELD-{n}" for n in range(1, max_field_users + 1)),
            task_uids=tuple(sorted(grouped[department], key=_uid_sort_key)),
        ))
    return teams


def _choose_field_user(team: DepartmentTeam, uid: str) -> str:
    if not team.field_user_ids:
        return team.supervisor_id
    return team.field_user_ids[team.task_uids.index(uid) % len(team.field_user_ids)]


def _write_event(ledger, event: dict[str, object]) -> None:
    ledger.write(json.dumps(event, sort_keys=True) + "\n")


def run_trial(
    input_xml: Path,
    output_dir: Path,
    shifts: int = DEFAULT_SHIFTS,
    seed: int = 20260809,
    max_field_users: int = DEFAULT_MAX_FIELD_USERS,
) -> dict[str, object]:
    if shifts < 1:
        raise SimulationError("shifts must be at least 1")

    doc = MspdiDocument(input_xml)
    refs = doc.task_refs()
    teams = build_department_teams(doc, max_field_users)
    if not teams:
        raise SimulationError("No executable leaf tasks have Text30 / Assigned Department values.")

    output_dir.mkdir(parents=True, exist_ok=True)
    ledger_path = output_dir / "simulation-ledger.jsonl"
    manifest_path = output_dir / "manifest.json"
    (output_dir / "shift-00.xml").write_bytes(input_xml.read_bytes())

    rng = random.Random(seed)
    start = datetime(2026, 1, 1, 6, 0, tzinfo=timezone.utc)
    event_count = 0
    changed_task_events = 0

    with ledger_path.open("w", encoding="utf-8") as ledger:
        for shift in range(1, shifts + 1):
            shift_time = start + timedelta(hours=12 * (shift - 1))
            shift_changes = 0

            for team in teams:
                active = [uid for uid in team.task_uids if doc.percent_complete(uid) < 100]
                rng.shuffle(active)
                for uid in active[: min(3, len(active))]:
                    if rng.random() > 0.55:
                        continue
                    old = doc.percent_complete(uid)
                    proposed = min(100, old + rng.randint(5, 20))
                    captured_at = _format_project_datetime(shift_time)
                    field_user = _choose_field_user(team, uid)

                    _write_event(ledger, {
                        "shift": shift,
                        "captured_at": captured_at,
                        "event_type": "field_progress_proposed",
                        "department": team.department,
                        "actor_role": "field_user" if field_user != team.supervisor_id else "supervisor",
                        "actor_id": field_user,
                        "task_uid": uid,
                        "old_percent_complete": old,
                        "proposed_percent_complete": proposed,
                    })
                    event_count += 1

                    _write_event(ledger, {
                        "shift": shift,
                        "captured_at": captured_at,
                        "event_type": "supervisor_progress_accepted",
                        "department": team.department,
                        "actor_role": "supervisor",
                        "actor_id": team.supervisor_id,
                        "task_uid": uid,
                        "accepted_percent_complete": proposed,
                    })
                    event_count += 1

                    _write_event(ledger, {
                        "shift": shift,
                        "captured_at": captured_at,
                        "event_type": "planner_progress_approved",
                        "actor_role": "planner",
                        "actor_id": "SIM-PLANNER",
                        "task_uid": uid,
                        "approved_percent_complete": proposed,
                    })
                    event_count += 1

                    changed = doc.apply_progress(uid, proposed, shift_time)
                    if changed:
                        changed_task_events += 1
                        shift_changes += 1
                        _write_event(ledger, {
                            "shift": shift,
                            "captured_at": captured_at,
                            "event_type": "mspdi_allowlisted_patch_applied",
                            "task_uid": uid,
                            "fields": changed,
                        })
                        event_count += 1

            doc.assert_invariants()
            snapshot = output_dir / f"shift-{shift:02d}.xml"
            doc.write(snapshot)

            reloaded = MspdiDocument(snapshot)
            if reloaded.protected_hash() != doc.baseline_protected_hash:
                raise SimulationError(f"Shift {shift} protected XML fingerprint mismatch after reparse.")
            if tuple(sorted(reloaded.tasks_by_uid, key=_uid_sort_key)) != doc.baseline_task_uids:
                raise SimulationError(f"Shift {shift} task UID set mismatch after reparse.")

            _write_event(ledger, {
                "shift": shift,
                "captured_at": _format_project_datetime(shift_time),
                "event_type": "shift_integrity_passed",
                "changed_tasks": shift_changes,
                "protected_hash": doc.protected_hash(),
                "full_hash": doc.full_hash(),
                "snapshot": snapshot.name,
            })
            event_count += 1

    unassigned_leaf_count = sum(1 for task in refs if not task.is_summary and not task.department)
    manifest = {
        "input_file_name": input_xml.name,
        "input_sha256": _sha256(input_xml.read_bytes()),
        "seed": seed,
        "shifts": shifts,
        "max_field_users_per_supervisor": max_field_users,
        "assigned_department_field_id": doc.assigned_department_field_id,
        "department_count": len(teams),
        "unassigned_leaf_task_count": unassigned_leaf_count,
        "departments": [
            {
                "department": team.department,
                "supervisor_id": team.supervisor_id,
                "field_user_ids": list(team.field_user_ids),
                "leaf_task_count": len(team.task_uids),
            }
            for team in teams
        ],
        "authorized_xml_fields": sorted(AUTHORIZED_FIELDS),
        "protected_xml_sha256": doc.baseline_protected_hash,
        "events": event_count,
        "changed_task_events": changed_task_events,
        "result": "PASS",
        "warning": "PASS is not Microsoft Project recalculation or manual Project verification.",
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return manifest


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a deterministic MSPDI shutdown simulation trial.")
    parser.add_argument("input_xml", type=Path, help="Local MSPDI XML source. Do not commit real schedules.")
    parser.add_argument("--output-dir", type=Path, default=Path("simulation-runs/latest"))
    parser.add_argument("--shifts", type=int, default=DEFAULT_SHIFTS)
    parser.add_argument("--seed", type=int, default=20260809)
    parser.add_argument("--max-field-users", type=int, default=DEFAULT_MAX_FIELD_USERS)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        manifest = run_trial(
            args.input_xml,
            args.output_dir,
            shifts=args.shifts,
            seed=args.seed,
            max_field_users=args.max_field_users,
        )
    except SimulationError as exc:
        print(f"SIMULATION FAILED: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
