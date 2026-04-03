from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentBaseState(TypedDict):
    task: str
    result: dict
    error: str
