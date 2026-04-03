"""
Consent Agent — processes license revocation requests.
Reads on-chain license state, validates the revocation is legitimate,
returns the transaction payload for MetaMask to sign.

LangGraph nodes: validate → build_txn → log
"""
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from typing import TypedDict
import json
from core.web3_client import get_contract, get_w3


class ConsentState(TypedDict):
    license_token_id: int
    requester_address: str       # who is asking to revoke
    # Populated from chain
    license_data: dict
    is_valid_revocation: bool
    validation_reason: str
    # Txn payload returned to frontend for MetaMask
    txn_payload: dict
    error: str


llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)


def validate_node(state: ConsentState) -> ConsentState:
    """Read license from chain and validate revocation is legitimate."""
    try:
        contract = get_contract("DataLicense")
        license_data = contract.functions.licenses(state["license_token_id"]).call()

        # license_data tuple: (dataOwner, aiBuyer, useCase, duration, compensation, createdAt, status)
        data = {
            "dataOwner":    license_data[0],
            "aiBuyer":      license_data[1],
            "useCase":      license_data[2],
            "duration":     license_data[3],
            "compensation": license_data[4],
            "createdAt":    license_data[5],
            "status":       license_data[6]   # 0=Active, 1=Revoked, 2=Expired
        }

        w3 = get_w3()
        requester = w3.to_checksum_address(state["requester_address"])
        owner     = w3.to_checksum_address(data["dataOwner"])

        if data["status"] != 0:
            return {
                **state,
                "license_data": data,
                "is_valid_revocation": False,
                "validation_reason": "License is not active (already revoked or expired)",
                "txn_payload": {}
            }

        if requester.lower() != owner.lower():
            return {
                **state,
                "license_data": data,
                "is_valid_revocation": False,
                "validation_reason": "Requester is not the data owner",
                "txn_payload": {}
            }

        return {
            **state,
            "license_data": data,
            "is_valid_revocation": True,
            "validation_reason": "Revocation is valid — requester is the data owner and license is active",
            "error": ""
        }
    except Exception as e:
        return {**state, "is_valid_revocation": False, "validation_reason": "", "error": str(e)}


def build_txn_node(state: ConsentState) -> ConsentState:
    """Build the transaction payload for MetaMask."""
    if not state["is_valid_revocation"]:
        return state
    try:
        contract = get_contract("DataLicense")
        txn = contract.functions.revokeLicense(
            state["license_token_id"]
        ).build_transaction({
            "from": state["requester_address"],
            "gas": 100000,
            "nonce": get_w3().eth.get_transaction_count(state["requester_address"])
        })
        # Strip non-serializable fields, frontend (MetaMask) fills chainId/gasPrice
        payload = {
            "to":    txn["to"],
            "data":  txn["data"],
            "gas":   hex(txn["gas"]),
            "from":  txn["from"],
            "nonce": hex(txn["nonce"])
        }
        return {**state, "txn_payload": payload, "error": ""}
    except Exception as e:
        return {**state, "txn_payload": {}, "error": str(e)}


def build_graph():
    g = StateGraph(ConsentState)
    g.add_node("validate", validate_node)
    g.add_node("build_txn", build_txn_node)

    g.set_entry_point("validate")
    g.add_edge("validate", "build_txn")
    g.add_edge("build_txn", END)

    return g.compile()


graph = build_graph()


def run(license_token_id: int, requester_address: str) -> dict:
    result = graph.invoke({
        "license_token_id": license_token_id,
        "requester_address": requester_address,
        "license_data": {},
        "is_valid_revocation": False,
        "validation_reason": "",
        "txn_payload": {},
        "error": ""
    })
    return result
