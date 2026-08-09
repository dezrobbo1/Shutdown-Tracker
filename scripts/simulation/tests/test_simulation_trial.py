import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

MODULE_PATH = Path(__file__).resolve().parents[1] / "simulation_trial.py"
spec = importlib.util.spec_from_file_location("simulation_trial", MODULE_PATH)
simulation_trial = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(simulation_trial)

MspdiDocument = simulation_trial.MspdiDocument
SimulationError = simulation_trial.SimulationError
build_department_teams = simulation_trial.build_department_teams
run_trial = simulation_trial.run_trial

SYNTHETIC_MSPDI = """<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>Synthetic Simulation Fixture</Name>
  <ExtendedAttributes>
    <ExtendedAttribute>
      <FieldID>188744016</FieldID>
      <FieldName>Text30</FieldName>
      <Alias>Assigned Department</Alias>
    </ExtendedAttribute>
  </ExtendedAttributes>
  <Tasks>
    <Task>
      <UID>0</UID><ID>0</ID><Name>Project Summary</Name><Summary>1</Summary>
    </Task>
    <Task>
      <UID>10</UID><ID>1</ID><Name>Mechanical Task A</Name><Summary>0</Summary>
      <PercentComplete>0</PercentComplete>
      <ExtendedAttribute><FieldID>188744016</FieldID><Value>W4M1</Value></ExtendedAttribute>
    </Task>
    <Task>
      <UID>11</UID><ID>2</ID><Name>Mechanical Task B</Name><Summary>0</Summary>
      <PercentComplete>20</PercentComplete>
      <ExtendedAttribute><FieldID>188744016</FieldID><Value>W4M1</Value></ExtendedAttribute>
    </Task>
    <Task>
      <UID>20</UID><ID>3</ID><Name>Electrical Task</Name><Summary>0</Summary>
      <PercentComplete>0</PercentComplete>
      <ExtendedAttribute><FieldID>188744016</FieldID><Value>W4E1</Value></ExtendedAttribute>
    </Task>
    <Task>
      <UID>30</UID><ID>4</ID><Name>Unassigned Task</Name><Summary>0</Summary>
      <PercentComplete>0</PercentComplete>
    </Task>
  </Tasks>
</Project>
"""


class SimulationTrialTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.input_xml = self.root / "fixture.xml"
        self.input_xml.write_text(SYNTHETIC_MSPDI, encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def test_text30_assigned_department_builds_one_supervisor_and_max_two_field_users(self):
        doc = MspdiDocument(self.input_xml)
        teams = build_department_teams(doc, 2)

        self.assertEqual([team.department for team in teams], ["W4E1", "W4M1"])
        mechanical = next(team for team in teams if team.department == "W4M1")
        self.assertEqual(mechanical.supervisor_id, "W4M1-SUPERVISOR")
        self.assertEqual(mechanical.field_user_ids, ("W4M1-FIELD-1", "W4M1-FIELD-2"))
        self.assertEqual(mechanical.task_uids, ("10", "11"))

    def test_summary_task_cannot_receive_direct_progress(self):
        doc = MspdiDocument(self.input_xml)
        with self.assertRaisesRegex(SimulationError, "Summary task"):
            doc.apply_progress("0", 50, simulation_trial.datetime.now(simulation_trial.timezone.utc))

    def test_protected_schedule_mutation_fails_closed(self):
        doc = MspdiDocument(self.input_xml)
        task = doc.tasks_by_uid["10"]
        name = simulation_trial._child(task, "Name")
        self.assertIsNotNone(name)
        name.text = "Unauthorized rename"

        with self.assertRaisesRegex(SimulationError, "Protected MSPDI content changed"):
            doc.assert_invariants()

    def test_allowlisted_progress_change_preserves_protected_fingerprint(self):
        doc = MspdiDocument(self.input_xml)
        baseline = doc.protected_hash()
        doc.apply_progress("10", 25, simulation_trial.datetime.now(simulation_trial.timezone.utc))
        doc.assert_invariants()
        self.assertEqual(doc.protected_hash(), baseline)

    def test_seeded_trial_is_replayable_and_writes_every_shift(self):
        out_a = self.root / "run-a"
        out_b = self.root / "run-b"

        manifest_a = run_trial(self.input_xml, out_a, shifts=4, seed=42, max_field_users=2)
        manifest_b = run_trial(self.input_xml, out_b, shifts=4, seed=42, max_field_users=2)

        self.assertEqual(manifest_a["result"], "PASS")
        self.assertEqual(manifest_a["department_count"], 2)
        self.assertEqual(manifest_a["protected_xml_sha256"], manifest_b["protected_xml_sha256"])
        self.assertEqual((out_a / "simulation-ledger.jsonl").read_text(), (out_b / "simulation-ledger.jsonl").read_text())
        for shift in range(0, 5):
            self.assertTrue((out_a / f"shift-{shift:02d}.xml").exists())

        manifest_on_disk = json.loads((out_a / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest_on_disk["seed"], 42)
        self.assertEqual(manifest_on_disk["shifts"], 4)
        self.assertEqual(manifest_on_disk["authorized_xml_fields"], ["ActualFinish", "ActualStart", "PercentComplete"])

    def test_more_than_two_field_users_is_rejected(self):
        doc = MspdiDocument(self.input_xml)
        with self.assertRaisesRegex(SimulationError, "between 0 and 2"):
            build_department_teams(doc, 3)


if __name__ == "__main__":
    unittest.main()
