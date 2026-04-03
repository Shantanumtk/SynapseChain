"""
Bounty Agent — scans open bounties and matches them to knowledge providers.
LangGraph nodes: load_bounties → match → rank → format
"""
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from typing import TypedDict
import json


class BountyState(TypedDict):
    bounty_id: int
    bounty_description: str
    bounty_reward_eth: float
    available_assets: list[dict]   # [{id, title, description, quality_score}]
    matches: list[dict]            # ranked matches with scores
    best_match_id: int | None
    match_reasoning: str
    error: str


llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)

SYSTEM_PROMPT = """You are a knowledge matching agent for SynapseChain bounty board.

Given a bounty request and a list of available knowledge assets, find the best matches.

Return a JSON object with:
- matches: array of objects sorted by relevance (highest first), each with:
  - asset_id: int
  - relevance_score: float 0.0-1.0
  - reasoning: string (one sentence why this matches)
- best_match_id: int (asset_id of the top match, or null if none qualify)
- overall_reasoning: string (2-3 sentences summarizing the matching logic)

Only include assets with relevance_score >= 0.5. Return ONLY valid JSON."""


def match_node(state: BountyState) -> BountyState:
    try:
        if not state["available_assets"]:
            return {
                **state,
                "matches": [],
                "best_match_id": None,
                "match_reasoning": "No assets available to match",
                "error": ""
            }

        assets_text = "\n".join([
            f"- ID {a['id']}: {a['title']} (quality: {a.get('quality_score', 'N/A')}/10)\n  {a['description']}"
            for a in state["available_assets"]
        ])

        prompt = f"""Bounty #{state["bounty_id"]}:
{state["bounty_description"]}
Reward: {state["bounty_reward_eth"]} ETH

Available Knowledge Assets:
{assets_text}

Find the best matching assets for this bounty."""

        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt)
        ])

        data = json.loads(response.content)

        return {
            **state,
            "matches": data.get("matches", []),
            "best_match_id": data.get("best_match_id"),
            "match_reasoning": data.get("overall_reasoning", ""),
            "error": ""
        }
    except Exception as e:
        return {
            **state,
            "matches": [],
            "best_match_id": None,
            "match_reasoning": "",
            "error": str(e)
        }


def build_graph():
    g = StateGraph(BountyState)
    g.add_node("match", match_node)
    g.set_entry_point("match")
    g.add_edge("match", END)
    return g.compile()


graph = build_graph()


def run(
    bounty_id: int,
    bounty_description: str,
    bounty_reward_eth: float,
    available_assets: list
) -> dict:
    result = graph.invoke({
        "bounty_id": bounty_id,
        "bounty_description": bounty_description,
        "bounty_reward_eth": bounty_reward_eth,
        "available_assets": available_assets,
        "matches": [],
        "best_match_id": None,
        "match_reasoning": "",
        "error": ""
    })
    return result
