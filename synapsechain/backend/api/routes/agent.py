from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
async def agent_status():
    return {
        "agents": {
            "quality":   "ready",
            "valuation": "ready",
            "licensing": "ready",
            "bounty":    "ready",
            "consent":   "ready"
        }
    }
