from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents import licensing_agent, consent_agent

router = APIRouter()


class NegotiateRequest(BaseModel):
    seller_description: str
    seller_min_compensation_eth: float
    seller_preferred_duration_days: int
    seller_allowed_use_cases: list[str]
    buyer_use_case: str
    buyer_budget_eth: float
    buyer_requested_duration_days: int


class NegotiateResponse(BaseModel):
    status: str
    agreed_compensation_eth: float
    agreed_duration_days: int
    agreed_use_case: str
    agreed_restrictions: list[str]
    negotiation_rounds: int
    messages: list[dict] = []
    error: str


class RevokeRequest(BaseModel):
    license_token_id: int
    requester_address: str


class RevokeResponse(BaseModel):
    is_valid: bool
    validation_reason: str
    txn_payload: dict
    error: str


@router.post("/negotiate", response_model=NegotiateResponse)
async def negotiate_license(req: NegotiateRequest):
    result = licensing_agent.run(
        seller_description=req.seller_description,
        seller_min_compensation_eth=req.seller_min_compensation_eth,
        seller_preferred_duration_days=req.seller_preferred_duration_days,
        seller_allowed_use_cases=req.seller_allowed_use_cases,
        buyer_use_case=req.buyer_use_case,
        buyer_budget_eth=req.buyer_budget_eth,
        buyer_requested_duration_days=req.buyer_requested_duration_days
    )
    return NegotiateResponse(
        status=result["status"],
        agreed_compensation_eth=result.get("agreed_compensation_eth", 0.0),
        agreed_duration_days=result.get("agreed_duration_days", 0),
        agreed_use_case=result.get("agreed_use_case", ""),
        agreed_restrictions=result.get("agreed_restrictions", []),
        negotiation_rounds=result.get("round", 0),
        messages=result.get("messages", []),
        error=result.get("error", "")
    )


@router.post("/revoke", response_model=RevokeResponse)
async def revoke_license(req: RevokeRequest):
    result = consent_agent.run(
        license_token_id=req.license_token_id,
        requester_address=req.requester_address
    )
    return RevokeResponse(
        is_valid=result["is_valid_revocation"],
        validation_reason=result["validation_reason"],
        txn_payload=result.get("txn_payload", {}),
        error=result.get("error", "")
    )
