from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents import bounty_agent

router = APIRouter()


class MatchRequest(BaseModel):
    bounty_id: int
    bounty_description: str
    bounty_reward_eth: float
    available_assets: list[dict]


class MatchResponse(BaseModel):
    best_match_id: int | None
    matches: list[dict]
    match_reasoning: str
    error: str


@router.post("/match", response_model=MatchResponse)
async def match_bounty(req: MatchRequest):
    result = bounty_agent.run(
        bounty_id=req.bounty_id,
        bounty_description=req.bounty_description,
        bounty_reward_eth=req.bounty_reward_eth,
        available_assets=req.available_assets
    )
    if result["error"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return MatchResponse(
        best_match_id=result["best_match_id"],
        matches=result["matches"],
        match_reasoning=result["match_reasoning"],
        error=""
    )
