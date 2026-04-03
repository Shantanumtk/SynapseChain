from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import nft, license, bounty, agent

app = FastAPI(title="SynapseChain API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nft.router,     prefix="/nft",     tags=["NFT"])
app.include_router(license.router, prefix="/license", tags=["License"])
app.include_router(bounty.router,  prefix="/bounty",  tags=["Bounty"])
app.include_router(agent.router,   prefix="/agent",   tags=["Agent"])


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
