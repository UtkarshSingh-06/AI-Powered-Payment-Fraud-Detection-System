from typing import Dict, Any
import networkx as nx


def graph_risk_score(payload: Dict[str, Any]) -> Dict[str, Any]:
    g = nx.Graph()
    tx_node = f"tx:{payload['transactionId']}"
    g.add_node(tx_node, kind="transaction")

    for key in ["userId", "deviceId", "merchantName", "beneficiaryId", "ipAddress"]:
        value = payload.get(key, "unknown")
        node = f"{key}:{value}"
        g.add_node(node, kind=key)
        g.add_edge(tx_node, node)

    for edge in payload.get("historicalEdges", []):
        left = f"{edge.get('leftType', 'unknown')}:{edge.get('leftId', 'unknown')}"
        right = f"{edge.get('rightType', 'unknown')}:{edge.get('rightId', 'unknown')}"
        g.add_node(left)
        g.add_node(right)
        g.add_edge(left, right)

    components = nx.number_connected_components(g)
    density = nx.density(g) if g.number_of_nodes() > 1 else 0.0
    shared_entity_count = max(0, len(list(g.neighbors(tx_node))) - 2)
    risk = min(100.0, round((shared_entity_count * 12) + (density * 30) + (components < 2) * 10, 2))

    return {
        "transactionId": payload["transactionId"],
        "graphRiskScore": risk,
        "connectedComponents": components,
        "nodeCount": g.number_of_nodes(),
        "edgeCount": g.number_of_edges(),
    }
