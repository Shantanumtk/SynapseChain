"""
Valuation Agent — recommends optimal ETH listing price for a KnowledgeNFT.
LangGraph nodes: analyze → price → format
"""
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from typing import TypedDict
import json


class ValuationState(TypedDict):
    title: str
    description: str
    category: str          # e.g. "AI/ML", "Finance", "Science"
    quality_score: int     # 1-10 from Quality Agent
    suggested_price_eth: float
    price_reasoning: str
    price_range: dict      # {"min": float, "max": float}
    error: str


llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

SYSTEM_PROMPT = """You are a knowledge asset pricing expert for SynapseChain, a blockchain marketplace.

Given a knowledge asset's metadata and quality score, recommend an optimal ETH listing price.

Market context:
- Low quality assets (1-4): 0.001 - 0.01 ETH
- Medium quality assets (5-7): 0.01 - 0.1 ETH  
- High quality assets (8-10): 0.1 - 1.0 ETH
- Premium niche topics command 2-3x multiplier

Return a JSON object with:
- suggested_price_eth: float (recommended listing price)
- min_price_eth: float (floor price)
- max_price_eth: float (ceiling price)
- reasoning: string (2-3 sentences explaining the pricing)

Return ONLY valid JSON, no markdown fences."""


def price_node(state: ValuationState) -> ValuationState:
    try:
        prompt = f"""Asset Details:
Title: {state["title"]}
Description: {state["description"]}
Category: {state["category"]}
Quality Score: {state["quality_score"]}/10

Recommend a fair ETH listing price for this knowledge NFT."""

        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt)
        ])

        data = json.loads(response.content)

        return {
            **state,
            "suggested_price_eth": float(data["suggested_price_eth"]),
            "price_reasoning": data.get("reasoning", ""),
            "price_range": {
                "min": float(data["min_price_eth"]),
                "max": float(data["max_price_eth"])
            },
            "error": ""
        }
    except Exception as e:
        return {
            **state,
            "suggested_price_eth": 0.0,
            "price_reasoning": "",
            "price_range": {"min": 0.0, "max": 0.0},
            "error": str(e)
        }


def build_graph():
    g = StateGraph(ValuationState)
    g.add_node("price", price_node)
    g.set_entry_point("price")
    g.add_edge("price", END)
    return g.compile()


graph = build_graph()


def run(title: str, description: str, category: str, quality_score: int) -> dict:
    result = graph.invoke({
        "title": title,
        "description": description,
        "category": category,
        "quality_score": quality_score,
        "suggested_price_eth": 0.0,
        "price_reasoning": "",
        "price_range": {"min": 0.0, "max": 0.0},
        "error": ""
    })
    return result
