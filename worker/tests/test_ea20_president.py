import json
import unittest
from pathlib import Path

from missioncut_tse.ea20_president import SourceMismatchError, parse_president_ea20


FIXTURE = Path(__file__).parent / "fixtures" / "tse-simulated" / "ea20-president-br.json"


class PresidentEa20ParserTests(unittest.TestCase):
    def setUp(self):
        self.payload = json.loads(FIXTURE.read_text(encoding="utf-8"))

    def test_maps_simulated_brazilian_presidential_result_and_candidates(self):
        result = parse_president_ea20(self.payload)

        self.assertEqual(result.source, "simulated")
        self.assertEqual(result.election_id, "21270")
        self.assertEqual(result.office_code, "0001")
        self.assertEqual(result.territory_type, "br")
        self.assertEqual(result.turn, "1")
        self.assertEqual(result.generated_at, "29/09/2026 16:29:12")
        self.assertEqual(len(result.candidates), 13)
        self.assertEqual(result.candidates[0].candidate_id, "41592406")
        self.assertEqual(result.candidates[0].votes, 10503573)
        self.assertEqual(
            [candidate.votes for candidate in result.candidates],
            sorted((candidate.votes for candidate in result.candidates), reverse=True),
        )
        first_fixture_candidate = next(
            candidate for candidate in result.candidates if candidate.candidate_id == "41592502"
        )
        self.assertEqual(first_fixture_candidate.name, "CANDIDATO 9995")
        self.assertEqual(str(first_fixture_candidate.voting_percent), "7.527528669")

    def test_rejects_simulated_payload_when_official_data_is_expected(self):
        with self.assertRaises(SourceMismatchError):
            parse_president_ea20(self.payload, expected_source="official")

    def test_rejects_unknown_source_flag(self):
        self.payload["f"] = "x"

        with self.assertRaises(ValueError):
            parse_president_ea20(self.payload)

    def test_rejects_non_brazil_or_non_presidential_ea20(self):
        self.payload["tpabr"] = "uf"

        with self.assertRaises(ValueError):
            parse_president_ea20(self.payload)


if __name__ == "__main__":
    unittest.main()
