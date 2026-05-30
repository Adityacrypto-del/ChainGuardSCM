import frappe
from blockchain_scm.blockchain import get_chain_status, get_chain, _blockchain
from blockchain_scm.reputation import get_all_reputations, flag_node, trust_node
import time
import random

# ── KPI calculations ──────────────────────────────────────────

def calculate_kpis():
    """
    Calculate throughput and latency from the live blockchain.
    Mirrors the formulas from Code 1 (PoWNetwork simulation).
    """
    reputations = get_all_reputations()

    total_nodes = max(len(reputations), 1)
    malicious_nodes = [r for r in reputations if r["status"] in ["quarantined", "slashed", "warned"]]
    honest_nodes = [r for r in reputations if r["status"] == "active"]

    malicious_count = len(malicious_nodes)
    honest_count = max(len(honest_nodes), 1)
    malicious_pct = round((malicious_count / total_nodes) * 100, 1)

    # Formula from Code 1:
    # honest_hash_power = sum of honest miners hash power (avg 1.0)
    # latency_ms = (difficulty / honest_hash_power) * 5.0
    # throughput = 1000 / latency_ms

    difficulty = 100.0
    honest_hash_power = honest_count * 1.0
    latency_ms = round((difficulty / max(honest_hash_power, 0.01)) * 5.0, 2)
    throughput = round(1000.0 / max(latency_ms, 0.001), 2)

    chain_status = get_chain_status()

    return {
        "total_nodes": total_nodes,
        "honest_nodes": honest_count,
        "malicious_nodes": malicious_count,
        "malicious_pct": malicious_pct,
        "latency_ms": latency_ms,
        "throughput": throughput,
        "total_blocks": chain_status["total_blocks"],
        "chain_valid": chain_status["is_valid"],
        "difficulty": chain_status["difficulty"],
        "latest_hash": chain_status["latest_hash"],
    }


# ── Whitelisted API endpoints ─────────────────────────────────

@frappe.whitelist()
def get_kpis():
    """Main dashboard KPI endpoint."""
    return calculate_kpis()


@frappe.whitelist()
def get_blockchain():
    """Return full blockchain for audit trail view."""
    return get_chain()


@frappe.whitelist()
def get_node_reputations():
    """Return all node reputation scores."""
    return get_all_reputations()


@frappe.whitelist()
def simulate_malicious_attack(malicious_count=2):
    """
    Simulate malicious nodes joining — for research demo.
    Shows throughput/latency degradation live.
    """
    malicious_count = int(malicious_count)
    results = []

    for i in range(malicious_count):
        node_id = f"malicious_node_{i}"
        # Flag these nodes multiple times to push them into quarantine
        from blockchain_scm.reputation import record_malicious_behaviour
        for _ in range(5):
            record_malicious_behaviour(node_id)

        from blockchain_scm.reputation import get_reputation
        results.append(get_reputation(node_id))

    kpis = calculate_kpis()

    return {
        "message": f"{malicious_count} malicious nodes simulated",
        "flagged_nodes": results,
        "network_kpis": kpis,
    }


@frappe.whitelist()
def seed_demo_network():
    """Seed a small demo network and blockchain history for the dashboard."""
    from blockchain_scm.reputation import record_honest_behaviour, record_malicious_behaviour, get_all_reputations

    if len(get_all_reputations()) > 0:
        return {
            "message": "Demo network already initialized.",
            "network_kpis": calculate_kpis(),
        }

    for i in range(5):
        record_honest_behaviour(f"honest_node_{i}")
    for i in range(2):
        record_malicious_behaviour(f"malicious_node_{i}")

    # Add a few sample blocks to the chain for the audit trail.
    for i in range(3):
        _blockchain.add_block([
            {
                "type": "demo_transaction",
                "node": f"honest_node_{i % 5}",
                "message": f"Demo supply chain event #{i + 1}",
                "timestamp": time.time(),
            }
        ])

    return {
        "message": "Demo network seeded successfully.",
        "network_kpis": calculate_kpis(),
    }


@frappe.whitelist()
def reset_simulation():
    """Reset all node reputations — for fresh demo."""
    from blockchain_scm import reputation
    reputation._node_reputations.clear()
    return {"message": "All node reputations reset", "kpis": calculate_kpis()}