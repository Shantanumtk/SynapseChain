"""
Quality Agent — evaluates knowledge asset content and assigns a score 1-10.
LangGraph nodes: parse → evaluate → format
"""
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from typing import TypedDict
import json


class QualityState(TypedDict):
    title: str
    description: str
    content_preview: str   # first ~500 chars of uploaded content
    score: int             # 1-10
    reasoning: str
    reward_tokens: int
    error: str


llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)

SYSTEM_PROMPT = """You are a knowledge quality evaluator for SynapseChain, a marketplace for human knowledge assets.

Evaluate the submitted knowledge asset and return a JSON object with:
- score: integer 1-10 (1=low quality, 10=exceptional)
- reasoning: 2-3 sentence explanation of the score
- strengths: list of 2-3 strong points
- weaknesses: list of 1-2 areas to improve

Scoring criteria:
- Accuracy and depth (30%)
- Originality and uniqueness (25%)
- Clarity and structure (25%)
- Practical applicability (20%)

Return ONLY valid JSON, no markdown fences."""


def evaluate_node(state: QualityState) -> QualityState:
    try:
        prompt = f"""Title: {state["title"]}
Description: {state["description"]}
Content Preview:
{state["content_preview"]}

Evaluate this knowledge asset."""

        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt)
        ])

        data = json.loads(response.content)
        score = max(1, min(10, int(data["score"])))

        # Reward tokens scale with quality: 50 base + 50 per point above 5
        reward = 50 + max(0, (score - 5) * 50)

        return {
            **state,
            "score": score,
            "reasoning": data.get("reasoning", ""),
            "reward_tokens": reward,
            "error": ""
        }
    except Exception as e:
        return {**state, "score": 0, "reasoning": "", "reward_tokens": 0, "error": str(e)}


def build_graph():
    g = StateGraph(QualityState)
    g.add_node("evaluate", evaluate_node)
    g.set_entry_point("evaluate")
    g.add_edge("evaluate", END)
    return g.compile()


graph = build_graph()


def run(title: str, description: str, content_preview: str) -> dict:
    result = graph.invoke({
        "title": title,
        "description": description,
        "content_preview": content_preview,
        "score": 0,
        "reasoning": "",
        "reward_tokens": 0,
        "error": ""
    })
    return result
