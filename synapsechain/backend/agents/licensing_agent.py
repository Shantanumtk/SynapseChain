"""
Licensing Agent — multi-turn LLM negotiation for AI data licensing deals.

Flow:
  1. Seller posts data listing with min price + preferred terms
  2. AI buyer submits a request with their use case + budget
  3. Agent negotiates back and forth (up to MAX_ROUNDS rounds)
  4. Returns agreed terms or failure reason

LangGraph nodes: init → negotiate → check_agreement → finalize
"""
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from typing import TypedDict, Annotated
import json
import operator


MAX_ROUNDS = 6


class LicensingState(TypedDict):
    # Seller side
    seller_description: str
    seller_min_compensation_eth: float
    seller_preferred_duration_days: int
    seller_allowed_use_cases: list[str]

    # Buyer side
    buyer_use_case: str
    buyer_budget_eth: float
    buyer_requested_duration_days: int

    # Negotiation
    messages: list[dict]           # conversation history
    round: int
    status: str                    # "negotiating" | "agreed" | "failed"

    # Final agreed terms (populated when status == "agreed")
    agreed_compensation_eth: float
    agreed_duration_days: int
    agreed_use_case: str
    agreed_restrictions: list[str]

    error: str


llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.4)

NEGOTIATOR_SYSTEM = """You are an AI licensing negotiator for SynapseChain. Your goal is to reach agreement quickly.

Rules:
- Seller minimum compensation must be met or exceeded
- Find middle ground on duration (split the difference)
- Reach agreement within 2-3 rounds — be decisive
- If buyer budget >= seller minimum, ALWAYS reach agreement

When terms are agreed (aim for round 1-2), respond with:
<AGREEMENT>
{
  "agreed_compensation_eth": 0.025,
  "agreed_duration_days": 135,
  "agreed_use_case": "model training for NLP tasks only",
  "agreed_restrictions": ["no resale", "no sublicensing", "anonymized data only"]
}
</AGREEMENT>

Only use <FAILED> if buyer budget is strictly less than seller minimum compensation.
Otherwise always find a way to agree."""


def init_node(state: LicensingState) -> LicensingState:
    """Build the opening negotiation message."""
    opening = f"""New licensing negotiation initiated.

SELLER TERMS:
- Description: {state["seller_description"]}
- Minimum compensation: {state["seller_min_compensation_eth"]} ETH
- Preferred duration: {state["seller_preferred_duration_days"]} days
- Allowed use cases: {", ".join(state["seller_allowed_use_cases"])}

BUYER REQUEST:
- Use case: {state["buyer_use_case"]}
- Budget: {state["buyer_budget_eth"]} ETH
- Requested duration: {state["buyer_requested_duration_days"]} days

Begin negotiating. Start with an initial proposal from the buyer's perspective."""

    messages = [{"role": "user", "content": opening}]
    response = llm.invoke([
        SystemMessage(content=NEGOTIATOR_SYSTEM),
        HumanMessage(content=opening)
    ])
    messages.append({"role": "assistant", "content": response.content})

    return {
        **state,
        "messages": messages,
        "round": 1,
        "status": "negotiating",
        "error": ""
    }


def negotiate_node(state: LicensingState) -> LicensingState:
    """Run one round of negotiation."""
    try:
        # Build langchain message history
        lc_messages = [SystemMessage(content=NEGOTIATOR_SYSTEM)]
        for m in state["messages"]:
            if m["role"] == "user":
                lc_messages.append(HumanMessage(content=m["content"]))
            else:
                lc_messages.append(AIMessage(content=m["content"]))

        # Push negotiation forward
        continuation = f"Round {state['round'] + 1}: Continue negotiating. Try to reach an agreement or make a counter-proposal."
        lc_messages.append(HumanMessage(content=continuation))

        response = llm.invoke(lc_messages)
        content = response.content

        new_messages = state["messages"] + [
            {"role": "user", "content": continuation},
            {"role": "assistant", "content": content}
        ]

        return {
            **state,
            "messages": new_messages,
            "round": state["round"] + 1,
            "error": ""
        }
    except Exception as e:
        return {**state, "error": str(e), "status": "failed"}


def check_agreement_node(state: LicensingState) -> LicensingState:
    """Parse last message for AGREEMENT or FAILED markers, or infer from context."""
    last = state["messages"][-1]["content"]

    if "<AGREEMENT>" in last:
        try:
            raw = last.split("<AGREEMENT>")[1].split("</AGREEMENT>")[0].strip()
            data = json.loads(raw)
            return {
                **state,
                "status": "agreed",
                "agreed_compensation_eth": float(data["agreed_compensation_eth"]),
                "agreed_duration_days": int(data["agreed_duration_days"]),
                "agreed_use_case": data["agreed_use_case"],
                "agreed_restrictions": data.get("agreed_restrictions", [])
            }
        except Exception as e:
            return {**state, "error": f"Failed to parse agreement: {e}", "status": "failed"}

    if "<FAILED>" in last:
        reason = last.split("<FAILED>")[1].split("</FAILED>")[0].strip()
        return {**state, "status": "failed", "error": reason}

    # Auto-agree if buyer budget >= seller minimum (force agreement)
    buyer_budget = state["buyer_budget_eth"]
    seller_min   = state["seller_min_compensation_eth"]
    if buyer_budget >= seller_min and state["round"] >= 1:
        comp     = max(seller_min, min(buyer_budget, seller_min * 1.2))
        duration = (state["seller_preferred_duration_days"] + state["buyer_requested_duration_days"]) // 2
        return {
            **state,
            "status": "agreed",
            "agreed_compensation_eth": round(comp, 4),
            "agreed_duration_days": duration,
            "agreed_use_case": state["buyer_use_case"],
            "agreed_restrictions": ["no resale", "no sublicensing", "anonymized data only"]
        }

    if state["round"] >= MAX_ROUNDS:
        return {**state, "status": "failed", "error": "Max negotiation rounds reached without agreement"}

    return state


def should_continue(state: LicensingState) -> str:
    if state["status"] == "agreed":
        return "done"
    if state["status"] == "failed":
        return "done"
    if state["round"] >= MAX_ROUNDS:
        return "done"
    return "negotiate"


def build_graph():
    g = StateGraph(LicensingState)
    g.add_node("init", init_node)
    g.add_node("negotiate", negotiate_node)
    g.add_node("check", check_agreement_node)

    g.set_entry_point("init")
    g.add_edge("init", "check")
    g.add_conditional_edges("check", should_continue, {
        "negotiate": "negotiate",
        "done": END
    })
    g.add_edge("negotiate", "check")

    return g.compile()


graph = build_graph()


def run(
    seller_description: str,
    seller_min_compensation_eth: float,
    seller_preferred_duration_days: int,
    seller_allowed_use_cases: list,
    buyer_use_case: str,
    buyer_budget_eth: float,
    buyer_requested_duration_days: int
) -> dict:
    result = graph.invoke({
        "seller_description": seller_description,
        "seller_min_compensation_eth": seller_min_compensation_eth,
        "seller_preferred_duration_days": seller_preferred_duration_days,
        "seller_allowed_use_cases": seller_allowed_use_cases,
        "buyer_use_case": buyer_use_case,
        "buyer_budget_eth": buyer_budget_eth,
        "buyer_requested_duration_days": buyer_requested_duration_days,
        "messages": [],
        "round": 0,
        "status": "negotiating",
        "agreed_compensation_eth": 0.0,
        "agreed_duration_days": 0,
        "agreed_use_case": "",
        "agreed_restrictions": [],
        "error": ""
    })
    return result
