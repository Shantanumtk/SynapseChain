from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents import quality_agent, valuation_agent
from core.web3_client import get_contract, get_w3
from core.config import settings
from web3 import Web3

router = APIRouter()


class EvaluateRequest(BaseModel):
    title: str
    description: str
    content_preview: str
    category: str


class EvaluateResponse(BaseModel):
    score: int
    reasoning: str
    reward_tokens: int
    suggested_price_eth: float
    price_reasoning: str
    price_range: dict


class MintRequest(BaseModel):
    to: str
    token_uri: str
    content_hash: str
    quality_score: int = 0


class MintResponse(BaseModel):
    token_id: int
    tx_hash: str
    error: str


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_knowledge(req: EvaluateRequest):
    quality = quality_agent.run(
        title=req.title,
        description=req.description,
        content_preview=req.content_preview
    )
    if quality["error"]:
        raise HTTPException(status_code=500, detail=f"Quality agent error: {quality['error']}")

    valuation = valuation_agent.run(
        title=req.title,
        description=req.description,
        category=req.category,
        quality_score=quality["score"]
    )
    if valuation["error"]:
        raise HTTPException(status_code=500, detail=f"Valuation agent error: {valuation['error']}")

    return EvaluateResponse(
        score=quality["score"],
        reasoning=quality["reasoning"],
        reward_tokens=quality["reward_tokens"],
        suggested_price_eth=valuation["suggested_price_eth"],
        price_reasoning=valuation["price_reasoning"],
        price_range=valuation["price_range"]
    )


@router.post("/mint", response_model=MintResponse)
async def mint_nft(req: MintRequest):
    """
    Mint a KnowledgeNFT using the deployer account (which owns Marketplace).
    Called by frontend after user confirms — returns tokenId + txHash.
    Frontend then calls Marketplace.list() via MetaMask.
    """
    try:
        w3 = get_w3()
        deployer = w3.eth.account.from_key(settings.deployer_private_key)
        contract = get_contract("KnowledgeNFT")

        tx = contract.functions.mint(
            Web3.to_checksum_address(req.to),
            req.token_uri,
            req.content_hash
        ).build_transaction({
            "from":  deployer.address,
            "nonce": w3.eth.get_transaction_count(deployer.address),
            "gas":   300000,
        })

        signed = w3.eth.account.sign_transaction(tx, settings.deployer_private_key)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

        # Get tokenId from totalSupply (most reliable)
        try:
            nft = get_contract("KnowledgeNFT")
            token_id = nft.functions.totalSupply().call()
        except Exception:
            token_id = 1

        if req.quality_score > 0:
            try:
                score_tx = contract.functions.setQualityScore(
                    token_id, req.quality_score
                ).build_transaction({
                    "from":  deployer.address,
                    "nonce": w3.eth.get_transaction_count(deployer.address),
                    "gas":   100000,
                })
                signed_score = w3.eth.account.sign_transaction(score_tx, settings.deployer_private_key)
                w3.eth.send_raw_transaction(signed_score.rawTransaction)
                print("Quality score set:", req.quality_score)
            except Exception as se:
                print("Score set failed:", se)

        return MintResponse(
            token_id=token_id,
            tx_hash=tx_hash.hex(),
            error=""
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
