class SourceMismatchError(ValueError):
    pass


def parse_president_ea20(payload, expected_source=None):
    raise NotImplementedError("EA20 presidential parsing is not implemented")
"""Translate the TSE EA20 presidential payload into a stable domain shape."""

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Literal


Source = Literal["simulated", "official"]


class SourceMismatchError(ValueError):
    """Raised when payload provenance conflicts with the requested dataset."""


@dataclass(frozen=True)
class PresidentialCandidate:
    candidate_id: str
    ballot_number: str
    name: str
    party: str | None
    votes: int
    voting_percent: Decimal
    official_order: int


@dataclass(frozen=True)
class PresidentialResult:
    source: Source
    election_id: str
    office_code: str
    territory_type: str
    territory_code: str
    turn: str
    generated_at: str
    totalization_state: str | None
    totalization_final: bool
    candidates: tuple[PresidentialCandidate, ...]


def _required_text(value: Any, field: str) -> str:
    if value is None or str(value).strip() == "":
        raise ValueError(f"Missing required EA20 field: {field}")
    return str(value)


def _integer(value: Any, field: str) -> int:
    try:
        return int(_required_text(value, field))
    except (TypeError, ValueError) as error:
        raise ValueError(f"Invalid integer in EA20 field: {field}") from error


def _percent(value: Any) -> Decimal:
    try:
        # TSE numeric-percent strings use a comma decimal separator in EA20 JSON.
        return Decimal(_required_text(value, "cand.pvapn").replace(",", "."))
    except InvalidOperation as error:
        raise ValueError("Invalid decimal in EA20 field: cand.pvapn") from error


def parse_president_ea20(
    payload: dict[str, Any], *, expected_source: Source | None = None
) -> PresidentialResult:
    """Parse the national presidential EA20; preserve origin and TSE metrics."""
    if not isinstance(payload, dict):
        raise ValueError("EA20 payload must be a JSON object")

    flag = payload.get("f")
    if flag not in ("s", "o"):
        raise ValueError("EA20 field f must be 's' (simulated) or 'o' (official)")
    source: Source = "simulated" if flag == "s" else "official"
    if expected_source is not None and source != expected_source:
        raise SourceMismatchError(
            f"Expected {expected_source} EA20 data, received {source}"
        )

    if payload.get("tpabr") != "br":
        raise ValueError("Presidential national EA20 must have tpabr='br'")
    if payload.get("cdabr") != "br":
        raise ValueError("Presidential national EA20 must have cdabr='br'")

    offices = [
        office
        for office in payload.get("carg", [])
        if str(office.get("cd", "")).zfill(4) == "0001"
    ]
    if len(offices) != 1:
        raise ValueError("EA20 must contain exactly one presidential office (0001)")

    candidates: list[PresidentialCandidate] = []
    for aggregate in offices[0].get("agr", []):
        for party in aggregate.get("par", []):
            for candidate in party.get("cand", []):
                candidates.append(
                    PresidentialCandidate(
                        candidate_id=_required_text(candidate.get("sqcand"), "cand.sqcand"),
                        ballot_number=_required_text(candidate.get("n"), "cand.n"),
                        name=_required_text(candidate.get("nmu") or candidate.get("nm"), "cand.nmu/nm"),
                        party=party.get("sg"),
                        votes=_integer(candidate.get("vap"), "cand.vap"),
                        voting_percent=_percent(candidate.get("pvapn")),
                        official_order=_integer(candidate.get("seq"), "cand.seq"),
                    )
                )

    candidates.sort(key=lambda candidate: -candidate.votes)
    generated_at = " ".join(
        part for part in (payload.get("dg"), payload.get("hg")) if part
    )
    return PresidentialResult(
        source=source,
        election_id=_required_text(payload.get("ele"), "ele"),
        office_code="0001",
        territory_type="br",
        territory_code="br",
        turn=_required_text(payload.get("t"), "t"),
        generated_at=generated_at,
        totalization_state=payload.get("and"),
        totalization_final=payload.get("tf") == "f",
        candidates=tuple(candidates),
    )
