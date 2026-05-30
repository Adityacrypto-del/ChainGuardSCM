import random

# ── Constants ─────────────────────────────────────────────────
ALPHA_PRIOR = 1
BETA_PRIOR = 1
EWMA_ALPHA = 0.2

WARN_THRESHOLD = 0.6
QUARANTINE_THRESHOLD = 0.8
SLASH_THRESHOLD = 0.9

BAYESIAN_THRESHOLD = 0.7

# ── Miner classes (from your Code 1) ─────────────────────────

class HonestMiner:
    def __init__(self, miner_id):
        self.miner_id = miner_id
        self.type = "honest"
        self.hash_power = random.uniform(0.8, 1.2)
        self.blocks_mined = 0

    def attempt_mine(self, difficulty):
        for attempts in range(1, 1001):
            if random.random() < (self.hash_power / difficulty):
                self.blocks_mined += 1
                return True, attempts
        return False, 1000


class MaliciousMiner:
    def __init__(self, miner_id):
        self.miner_id = miner_id
        self.type = "malicious"
        self.hash_power = random.uniform(0.1, 0.3)
        self.blocks_mined = 0

    def attempt_mine(self, difficulty):
        for attempts in range(1, 1001):
            if random.random() < (self.hash_power / difficulty):
                self.blocks_mined += 1
                return True, attempts
        return False, 1000


# ── Reputation engine ─────────────────────────────────────────

class NodeReputation:
    def __init__(self, node_id):
        self.node_id = node_id
        self.successes = ALPHA_PRIOR
        self.failures = BETA_PRIOR
        self.reputation = 0.5
        self.status = "active"
        self.history = []

    def update(self, observed_honest):
        if observed_honest:
            self.successes += 1
        else:
            self.failures += 1

        posterior = self.successes / (self.successes + self.failures)

        if self.history:
            self.reputation = EWMA_ALPHA * posterior + (1 - EWMA_ALPHA) * self.reputation
        else:
            self.reputation = posterior

        self.history.append(self.reputation)
        self._apply_policy()

    def _apply_policy(self):
        if self.reputation <= (1 - SLASH_THRESHOLD):
            self.status = "slashed"
        elif self.reputation <= (1 - QUARANTINE_THRESHOLD):
            self.status = "quarantined"
        elif self.reputation <= (1 - WARN_THRESHOLD):
            self.status = "warned"
        else:
            self.status = "active"


# ── Global reputation store ───────────────────────────────────
# In production this would be a DB — for research this in-memory
# store persists for the lifetime of the bench process

_node_reputations = {}


def _get_or_create(node_id):
    if node_id not in _node_reputations:
        _node_reputations[node_id] = NodeReputation(node_id)
    return _node_reputations[node_id]


def get_reputation(node_id):
    node = _get_or_create(node_id)
    return {
        "node_id": node_id,
        "score": round(node.reputation, 3),
        "status": node.status,
        "successes": node.successes,
        "failures": node.failures,
    }


def record_honest_behaviour(node_id):
    node = _get_or_create(node_id)
    node.update(observed_honest=True)


def record_malicious_behaviour(node_id):
    node = _get_or_create(node_id)
    node.update(observed_honest=False)


def update_all_reputations():
    """Called by scheduler every hour — runs detection on all known nodes."""
    import frappe
    for node_id, node in _node_reputations.items():
        # Simulate detection signal (in real system, pull from blockchain events)
        mal_prob = random.uniform(0.0, 0.3) if "honest" in node_id else random.uniform(0.1, 0.8)
        observed_honest = 0 if mal_prob >= BAYESIAN_THRESHOLD else 1
        node.update(observed_honest)
        frappe.logger().info(
            f"ChainGuard reputation update: {node_id} → {node.reputation:.3f} ({node.status})"
        )


# ── Frappe API endpoints ──────────────────────────────────────

import frappe

@frappe.whitelist()
def get_all_reputations():
    return [
        {
            "node_id": nid,
            "score": round(n.reputation, 3),
            "status": n.status,
            "successes": n.successes,
            "failures": n.failures,
        }
        for nid, n in _node_reputations.items()
    ]


@frappe.whitelist()
def flag_node(node_id):
    """Manually flag a node as malicious."""
    record_malicious_behaviour(node_id)
    return get_reputation(node_id)


@frappe.whitelist()
def trust_node(node_id):
    """Manually mark a node as honest."""
    record_honest_behaviour(node_id)
    return get_reputation(node_id)