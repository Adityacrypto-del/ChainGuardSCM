"""
ChainGuard SCM — Standalone FastAPI Backend
Runs on http://localhost:8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib, json, time, random, math
from collections import deque
import numpy as np

app = FastAPI(title="ChainGuard SCM API", version="1.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


# ══════════════════════════════════════════════════════════════
# LAYER 1 — Blockchain Core  (SHA-256 PoW)
# ══════════════════════════════════════════════════════════════

class Block:
    def __init__(self, index, transactions, previous_hash, difficulty=2):
        self.index = index
        self.timestamp = time.time()
        self.transactions = transactions
        self.previous_hash = previous_hash
        self.difficulty = difficulty
        self.nonce = 0
        self.hash = self._mine()

    def _compute(self):
        s = json.dumps({
            "index": self.index, "timestamp": self.timestamp,
            "transactions": self.transactions,
            "previous_hash": self.previous_hash, "nonce": self.nonce,
        }, sort_keys=True)
        return hashlib.sha256(s.encode()).hexdigest()

    def _mine(self):
        target = "0" * self.difficulty
        while True:
            h = self._compute()
            if h.startswith(target):
                return h
            self.nonce += 1


class Blockchain:
    def __init__(self):
        self.chain: list[Block] = []
        self.difficulty = 2
        self._genesis()

    def _genesis(self):
        self.chain.append(Block(0, [{"type": "genesis", "data": "ChainGuard SCM"}], "0", self.difficulty))

    def add_block(self, transactions):
        b = Block(len(self.chain), transactions, self.chain[-1].hash, self.difficulty)
        self.chain.append(b)
        return b

    def is_valid(self):
        for i in range(1, len(self.chain)):
            cur, prev = self.chain[i], self.chain[i - 1]
            if cur.hash != cur._compute(): return False
            if cur.previous_hash != prev.hash: return False
        return True


_chain = Blockchain()


# ══════════════════════════════════════════════════════════════
# LAYER 2 — Node Reputation Engine  (Bayesian EWMA)
# ══════════════════════════════════════════════════════════════

EWMA_ALPHA    = 0.2
WARN_THR      = 0.6
QUARANTINE_THR= 0.8
SLASH_THR     = 0.9
BAYES_THR     = 0.7


class NodeReputation:
    def __init__(self, node_id: str, node_type: str = "honest"):
        self.node_id   = node_id
        self.node_type = node_type
        self.alpha     = 1   # Bayesian prior successes
        self.beta      = 1   # Bayesian prior failures
        self.rep       = 0.5
        self.status    = "active"
        self.history   = deque(maxlen=50)
        self.mal_prob  = 0.0  # latest P(mal) from ML pipeline

    def update(self, honest: bool):
        if honest: self.alpha += 1
        else:      self.beta  += 1
        posterior = self.alpha / (self.alpha + self.beta)
        self.rep = EWMA_ALPHA * posterior + (1 - EWMA_ALPHA) * self.rep if self.history else posterior
        self.history.append(round(self.rep, 4))
        self._tier()

    def _tier(self):
        inv = 1 - self.rep
        if   inv >= SLASH_THR:       self.status = "slashed"
        elif inv >= QUARANTINE_THR:  self.status = "quarantined"
        elif inv >= WARN_THR:        self.status = "warned"
        else:                        self.status = "active"

    def tier(self):
        return {"active": "A", "warned": "B", "quarantined": "C", "slashed": "C"}.get(self.status, "A")

    def weight(self):
        """Consensus weight Wi"""
        if self.status in ("quarantined", "slashed"): return 0.0
        lam = 2.0
        return round(math.exp(-lam * (1 - self.rep)), 4)

    def to_dict(self):
        return {
            "node_id":   self.node_id,
            "node_type": self.node_type,
            "score":     round(self.rep, 4),
            "status":    self.status,
            "tier":      self.tier(),
            "weight":    self.weight(),
            "successes": self.alpha - 1,
            "failures":  self.beta  - 1,
            "history":   list(self.history),
            "mal_prob":  round(self.mal_prob, 4),
        }


_nodes: dict[str, NodeReputation] = {}


def _get_node(node_id: str, node_type: str = "honest") -> NodeReputation:
    if node_id not in _nodes:
        _nodes[node_id] = NodeReputation(node_id, node_type)
    return _nodes[node_id]


# ══════════════════════════════════════════════════════════════
# LAYER 3 — Ensemble ML Pipeline
#   Random Forest · Isolation Forest · Bayesian Stacking
# ══════════════════════════════════════════════════════════════

def _extract_features(node: NodeReputation) -> dict:
    """Statistical features from node telemetry — mirrors architecture Layer 1."""
    hist = list(node.history) if node.history else [0.5]
    arr  = np.array(hist, dtype=float)
    n    = len(arr)
    mean = float(np.mean(arr))
    var  = float(np.var(arr))  if n > 1 else 0.0
    skew = float(np.mean(((arr - mean) / (np.std(arr) + 1e-9)) ** 3)) if n > 2 else 0.0
    kurt = float(np.mean(((arr - mean) / (np.std(arr) + 1e-9)) ** 4)) if n > 2 else 0.0
    fail = (node.beta - 1) / max((node.alpha + node.beta - 2), 1)
    p95  = float(np.percentile(arr, 95)) if n > 1 else mean
    drop = max(0.0, mean - p95) / (mean + 1e-9)
    return {
        "mean_latency": round(mean, 4),
        "variance":     round(var,  4),
        "skewness":     round(skew, 4),
        "kurtosis":     round(kurt, 4),
        "failure_rate": round(fail, 4),
        "p95_latency":  round(p95,  4),
        "drop_rate":    round(drop, 4),
    }


def _random_forest_score(feat: dict) -> float:
    """Simulate Random Forest classifier P(malicious) — supervised."""
    score = (
        0.35 * feat["failure_rate"] +
        0.25 * max(0.0, feat["skewness"]) / 3 +
        0.20 * min(feat["kurtosis"] / 10, 1.0) +
        0.20 * feat["drop_rate"]
    )
    return min(max(score + random.gauss(0, 0.02), 0.0), 1.0)


def _isolation_forest_score(feat: dict) -> float:
    """Simulate Isolation Forest anomaly score — unsupervised."""
    anomaly = (
        abs(feat["skewness"]) * 0.3 +
        feat["variance"] * 0.4 +
        feat["drop_rate"] * 0.3
    )
    return min(max(anomaly + random.gauss(0, 0.03), 0.0), 1.0)


def _bayesian_stack(rf: float, iso: float, base_rep: float) -> float:
    """Bayesian meta-learner fuses RF + IsolationForest + base reputation."""
    prior      = 1 - base_rep               # prior maliciousness from reputation
    likelihood = 0.5 * rf + 0.5 * iso       # ensemble likelihood
    posterior  = (likelihood * prior) / (likelihood * prior + (1 - likelihood) * (1 - prior) + 1e-9)
    return round(min(max(posterior, 0.0), 1.0), 4)


def run_ml_pipeline(node: NodeReputation) -> dict:
    feat    = _extract_features(node)
    rf_s    = _random_forest_score(feat)
    iso_s   = _isolation_forest_score(feat)
    bayes_s = _bayesian_stack(rf_s, iso_s, node.rep)
    node.mal_prob = bayes_s
    return {
        "features":         feat,
        "random_forest":    round(rf_s,    4),
        "isolation_forest": round(iso_s,   4),
        "bayesian_stack":   round(bayes_s, 4),
        "anomaly_threshold": BAYES_THR,
        "is_anomaly":       bayes_s >= BAYES_THR,
    }


# ══════════════════════════════════════════════════════════════
# KPI calculations
# ══════════════════════════════════════════════════════════════

# Rolling performance history for charts (last 30 ticks)
_perf_history: deque = deque(maxlen=30)


def _calc_kpis() -> dict:
    total      = max(len(_nodes), 1)
    malicious  = [n for n in _nodes.values() if n.status in ("quarantined", "slashed", "warned")]
    honest     = [n for n in _nodes.values() if n.status == "active"]
    mal_pct    = round(len(malicious) / total * 100, 1)
    h_power    = max(len(honest) * 1.0, 0.01)
    latency_ms = round((100.0 / h_power) * 5.0, 2)
    throughput = round(1000.0 / max(latency_ms, 0.001), 2)
    consensus_acc = round(len(honest) / total * 100, 1)

    snapshot = {
        "t":              round(time.time()),
        "throughput":     throughput,
        "latency_ms":     latency_ms,
        "malicious_pct":  mal_pct,
        "consensus_acc":  consensus_acc,
    }
    _perf_history.append(snapshot)

    return {
        "total_nodes":    total,
        "honest_nodes":   len(honest),
        "malicious_nodes":len(malicious),
        "malicious_pct":  mal_pct,
        "latency_ms":     latency_ms,
        "throughput":     throughput,
        "consensus_acc":  consensus_acc,
        "total_blocks":   len(_chain.chain),
        "chain_valid":    _chain.is_valid(),
        "difficulty":     _chain.difficulty,
        "latest_hash":    _chain.chain[-1].hash if _chain.chain else None,
    }


# ══════════════════════════════════════════════════════════════
# REST API Endpoints
# ══════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"status": "ChainGuard SCM API running", "docs": "/docs"}


@app.get("/api/kpis")
def get_kpis():
    return _calc_kpis()


@app.get("/api/chain")
def get_chain():
    return [
        {
            "index":        b.index,
            "hash":         b.hash,
            "previous_hash": b.previous_hash,
            "nonce":        b.nonce,
            "timestamp":    b.timestamp,
            "transactions": b.transactions,
        }
        for b in _chain.chain
    ]


@app.get("/api/nodes")
def get_nodes():
    return [n.to_dict() for n in _nodes.values()]


@app.get("/api/ml/{node_id}")
def get_ml_for_node(node_id: str):
    if node_id not in _nodes:
        raise HTTPException(404, f"Node '{node_id}' not found")
    return run_ml_pipeline(_nodes[node_id])


@app.get("/api/ml")
def get_all_ml():
    return {nid: run_ml_pipeline(n) for nid, n in _nodes.items()}


@app.get("/api/performance-history")
def get_perf_history():
    return list(_perf_history)


# ── Simulation endpoints ───────────────────────────────────────

class SeedRequest(BaseModel):
    honest_count:   int = 5
    malicious_count: int = 2


@app.post("/api/seed")
def seed_demo(req: SeedRequest):
    if _nodes:
        return {"message": "Network already seeded", "kpis": _calc_kpis()}

    for i in range(req.honest_count):
        node = _get_node(f"honest_node_{i}", "honest")
        for _ in range(random.randint(6, 14)):
            node.update(honest=True)
        run_ml_pipeline(node)

    for i in range(req.malicious_count):
        node = _get_node(f"malicious_node_{i}", "malicious")
        for _ in range(random.randint(3, 7)):
            node.update(honest=False)
        run_ml_pipeline(node)

    # Seed some blocks
    for i in range(4):
        _chain.add_block([{
            "type":      "supply_chain_event",
            "node":      f"honest_node_{i % req.honest_count}",
            "event":     random.choice(["purchase_order", "delivery", "stock_entry", "receipt"]),
            "timestamp": time.time(),
        }])

    return {"message": "Demo network seeded", "kpis": _calc_kpis()}


class AttackRequest(BaseModel):
    malicious_count: int = 3


@app.post("/api/simulate-attack")
def simulate_attack(req: AttackRequest):
    results = []
    offset = len([k for k in _nodes if k.startswith("malicious")])

    for i in range(req.malicious_count):
        nid = f"malicious_node_{offset + i}"
        node = _get_node(nid, "malicious")
        for _ in range(random.randint(5, 10)):
            node.update(honest=False)
        ml = run_ml_pipeline(node)

        # Add flagged block to chain
        _chain.add_block([{
            "type":     "malicious_detection",
            "node":     nid,
            "mal_prob": ml["bayesian_stack"],
            "status":   node.status,
            "timestamp": time.time(),
        }])
        results.append({"node": nid, "reputation": node.to_dict(), "ml": ml})

    return {
        "message":       f"{req.malicious_count} malicious nodes simulated",
        "flagged_nodes": results,
        "kpis":          _calc_kpis(),
    }


class FlagRequest(BaseModel):
    node_id: str
    action:  str  # "flag" | "trust"


@app.post("/api/node-action")
def node_action(req: FlagRequest):
    node = _get_node(req.node_id)
    if req.action == "flag":
        node.update(honest=False)
    elif req.action == "trust":
        node.update(honest=True)
    else:
        raise HTTPException(400, "action must be 'flag' or 'trust'")
    ml = run_ml_pipeline(node)
    return {"node": node.to_dict(), "ml": ml}


@app.post("/api/reset")
def reset_network():
    _nodes.clear()
    _perf_history.clear()
    # keep genesis block only
    _chain.chain = _chain.chain[:1]
    return {"message": "Network reset", "kpis": _calc_kpis()}


@app.post("/api/add-transaction")
def add_transaction(payload: dict):
    block = _chain.add_block([{**payload, "timestamp": time.time()}])
    return {
        "block_index": block.index,
        "hash":        block.hash,
        "message":     "Transaction recorded on chain",
    }


# ══════════════════════════════════════════════════════════════
# SUPPLY CHAIN LAYER
# Products · Suppliers · Orders · Shipments · Inventory · QC
# Every state-change writes a block to the chain.
# ══════════════════════════════════════════════════════════════

import uuid as _uuid

def _new_id(): return str(_uuid.uuid4())[:8].upper()
def _ts(): return round(time.time(), 3)

def _record(event_type: str, payload: dict) -> str:
    block = _chain.add_block([{"type": event_type, **payload, "timestamp": _ts()}])
    return block.hash


# ── In-memory stores ──────────────────────────────────────────
_products:   dict = {}
_suppliers:  dict = {}
_orders:     dict = {}
_shipments:  dict = {}
_inventory:  dict = {}   # key: f"{product_id}:{location}"
_qc_checks:  list = []


# ── Pydantic models ───────────────────────────────────────────

class ProductIn(BaseModel):
    name: str; sku: str; category: str; unit: str = "unit"; description: str = ""

class SupplierIn(BaseModel):
    name: str; location: str; contact: str = ""; node_id: str = ""

class OrderItemIn(BaseModel):
    product_id: str; qty: float; unit_price: float

class OrderIn(BaseModel):
    supplier_id: str; items: list[OrderItemIn]; notes: str = ""

class StatusUpdate(BaseModel):
    status: str; note: str = ""

class ShipmentIn(BaseModel):
    order_id: str; origin: str; destination: str; carrier: str = ""

class CheckpointIn(BaseModel):
    location: str; note: str = ""; status: str = "in_transit"

class InventoryAdjust(BaseModel):
    product_id: str; location: str; qty_delta: float; reason: str = ""

class QCIn(BaseModel):
    shipment_id: str; product_id: str; inspector: str; result: str; notes: str = ""


# ── Products ──────────────────────────────────────────────────

@app.get("/api/products")
def list_products():
    return list(_products.values())

@app.post("/api/products")
def create_product(p: ProductIn):
    pid = _new_id()
    tx  = _record("product_created", {"product_id": pid, "sku": p.sku, "name": p.name})
    doc = {**p.model_dump(), "id": pid, "created_at": _ts(), "blockchain_tx": tx}
    _products[pid] = doc
    # initialise zero inventory in "warehouse"
    _inventory[f"{pid}:warehouse"] = {"product_id": pid, "location": "warehouse", "qty": 0, "last_updated": _ts()}
    return doc

@app.put("/api/products/{pid}")
def update_product(pid: str, p: ProductIn):
    if pid not in _products: raise HTTPException(404, "Product not found")
    tx = _record("product_updated", {"product_id": pid, "changes": p.model_dump()})
    _products[pid].update({**p.model_dump(), "blockchain_tx": tx})
    return _products[pid]

@app.delete("/api/products/{pid}")
def delete_product(pid: str):
    if pid not in _products: raise HTTPException(404)
    tx = _record("product_deleted", {"product_id": pid})
    del _products[pid]
    return {"message": "Deleted", "tx": tx}


# ── Suppliers ─────────────────────────────────────────────────

@app.get("/api/suppliers")
def list_suppliers():
    result = []
    for s in _suppliers.values():
        rep = _nodes.get(s["node_id"])
        result.append({**s, "reputation": rep.to_dict() if rep else None})
    return result

@app.post("/api/suppliers")
def create_supplier(s: SupplierIn):
    sid = _new_id()
    node_id = s.node_id or f"supplier_{sid}"
    tx  = _record("supplier_registered", {"supplier_id": sid, "name": s.name, "node_id": node_id})
    node = _get_node(node_id, "honest")
    node.update(honest=True)
    doc = {**s.model_dump(), "id": sid, "node_id": node_id, "created_at": _ts(),
           "total_orders": 0, "blockchain_tx": tx}
    _suppliers[sid] = doc
    return doc

@app.put("/api/suppliers/{sid}/rate")
def rate_supplier(sid: str, body: StatusUpdate):
    if sid not in _suppliers: raise HTTPException(404)
    s = _suppliers[sid]
    node = _get_node(s["node_id"])
    honest = body.status == "good"
    node.update(honest=honest)
    ml = run_ml_pipeline(node)
    tx = _record("supplier_rated", {"supplier_id": sid, "rating": body.status, "note": body.note})
    s["blockchain_tx"] = tx
    return {"supplier": s, "node": node.to_dict(), "ml": ml}


# ── Purchase Orders ───────────────────────────────────────────

ORDER_FLOW = ["draft", "approved", "dispatched", "in_transit", "received", "cancelled"]

@app.get("/api/orders")
def list_orders():
    result = []
    for o in _orders.values():
        sup = _suppliers.get(o["supplier_id"], {})
        result.append({**o, "supplier_name": sup.get("name", "Unknown")})
    return sorted(result, key=lambda x: x["created_at"], reverse=True)

@app.post("/api/orders")
def create_order(o: OrderIn):
    if o.supplier_id not in _suppliers: raise HTTPException(404, "Supplier not found")
    oid   = _new_id()
    total = sum(i.qty * i.unit_price for i in o.items)
    tx    = _record("purchase_order_created", {
        "order_id": oid, "supplier_id": o.supplier_id,
        "items": [i.model_dump() for i in o.items], "total": total,
    })
    doc = {
        "id": oid, "supplier_id": o.supplier_id,
        "items": [i.model_dump() for i in o.items],
        "total": round(total, 2), "notes": o.notes,
        "status": "draft", "history": [{"status": "draft", "ts": _ts()}],
        "created_at": _ts(), "blockchain_tx": tx,
    }
    _orders[oid] = doc
    _suppliers[o.supplier_id]["total_orders"] = _suppliers[o.supplier_id].get("total_orders", 0) + 1
    return doc

@app.put("/api/orders/{oid}/status")
def update_order_status(oid: str, body: StatusUpdate):
    if oid not in _orders: raise HTTPException(404)
    o = _orders[oid]
    if body.status not in ORDER_FLOW: raise HTTPException(400, f"Invalid status. Use: {ORDER_FLOW}")
    tx = _record("order_status_updated", {"order_id": oid, "status": body.status, "note": body.note})
    o["status"] = body.status
    o["history"].append({"status": body.status, "ts": _ts(), "note": body.note})
    o["blockchain_tx"] = tx
    # When received → update supplier reputation positively
    if body.status == "received":
        sup = _suppliers.get(o["supplier_id"])
        if sup:
            _get_node(sup["node_id"]).update(honest=True)
    return o


# ── Shipments ─────────────────────────────────────────────────

@app.get("/api/shipments")
def list_shipments():
    result = []
    for s in _shipments.values():
        order = _orders.get(s["order_id"], {})
        sup   = _suppliers.get(order.get("supplier_id", ""), {})
        result.append({**s, "supplier_name": sup.get("name", "—"), "order_total": order.get("total", 0)})
    return sorted(result, key=lambda x: x["created_at"], reverse=True)

@app.post("/api/shipments")
def create_shipment(s: ShipmentIn):
    if s.order_id not in _orders: raise HTTPException(404, "Order not found")
    sid = _new_id()
    tx  = _record("shipment_created", {"shipment_id": sid, "order_id": s.order_id, "origin": s.origin, "destination": s.destination})
    doc = {
        **s.model_dump(), "id": sid,
        "status": "pending",
        "checkpoints": [{"location": s.origin, "status": "pending", "note": "Shipment created", "ts": _ts()}],
        "created_at": _ts(), "blockchain_tx": tx,
    }
    _shipments[sid] = doc
    _orders[s.order_id]["status"] = "dispatched"
    _orders[s.order_id]["history"].append({"status": "dispatched", "ts": _ts()})
    return doc

@app.post("/api/shipments/{sid}/checkpoint")
def add_checkpoint(sid: str, cp: CheckpointIn):
    if sid not in _shipments: raise HTTPException(404)
    s  = _shipments[sid]
    tx = _record("shipment_checkpoint", {"shipment_id": sid, "location": cp.location, "status": cp.status})
    s["checkpoints"].append({"location": cp.location, "status": cp.status, "note": cp.note, "ts": _ts()})
    s["status"] = cp.status
    s["blockchain_tx"] = tx
    # Update order if delivered
    if cp.status == "delivered" and s["order_id"] in _orders:
        _orders[s["order_id"]]["status"] = "received"
    return s


# ── Inventory ─────────────────────────────────────────────────

@app.get("/api/inventory")
def list_inventory():
    result = []
    for item in _inventory.values():
        prod = _products.get(item["product_id"], {})
        result.append({**item, "product_name": prod.get("name", "Unknown"),
                       "sku": prod.get("sku", "—"), "unit": prod.get("unit", "unit")})
    return result

@app.post("/api/inventory/adjust")
def adjust_inventory(adj: InventoryAdjust):
    key = f"{adj.product_id}:{adj.location}"
    if key not in _inventory:
        _inventory[key] = {"product_id": adj.product_id, "location": adj.location, "qty": 0, "last_updated": _ts()}
    item = _inventory[key]
    old_qty = item["qty"]
    item["qty"] = round(max(0, item["qty"] + adj.qty_delta), 4)
    item["last_updated"] = _ts()
    tx = _record("inventory_adjusted", {
        "product_id": adj.product_id, "location": adj.location,
        "delta": adj.qty_delta, "old_qty": old_qty, "new_qty": item["qty"], "reason": adj.reason,
    })
    item["blockchain_tx"] = tx
    return item


# ── Quality Control ───────────────────────────────────────────

@app.get("/api/quality")
def list_qc():
    return sorted(_qc_checks, key=lambda x: x["timestamp"], reverse=True)

@app.post("/api/quality")
def create_qc(q: QCIn):
    if q.shipment_id not in _shipments: raise HTTPException(404, "Shipment not found")
    qid = _new_id()
    tx  = _record("quality_check", {
        "qc_id": qid, "shipment_id": q.shipment_id,
        "product_id": q.product_id, "result": q.result,
    })
    doc = {**q.model_dump(), "id": qid, "timestamp": _ts(), "blockchain_tx": tx}
    _qc_checks.append(doc)
    # Flag supplier if QC fails
    if q.result == "fail":
        ship = _shipments.get(q.shipment_id, {})
        order = _orders.get(ship.get("order_id", ""), {})
        sup = _suppliers.get(order.get("supplier_id", ""), {})
        if sup:
            _get_node(sup["node_id"]).update(honest=False)
    return doc


# ── Provenance ────────────────────────────────────────────────

@app.get("/api/provenance/{product_id}")
def get_provenance(product_id: str):
    events = [
        b.__dict__ | {"tx": b.hash}
        for b in _chain.chain
        for tx_data in b.transactions
        if tx_data.get("product_id") == product_id
           or any(i.get("product_id") == product_id for i in tx_data.get("items", []))
    ]
    product = _products.get(product_id, {})
    inventory_slots = [v for k, v in _inventory.items() if k.startswith(product_id)]
    qcs = [q for q in _qc_checks if q["product_id"] == product_id]
    return {
        "product":   product,
        "events":    events,
        "inventory": inventory_slots,
        "qc_checks": qcs,
    }


# ── Demo seed (supply chain) ──────────────────────────────────

@app.post("/api/scm-seed")
def seed_supply_chain():
    if _products:
        return {"message": "Supply chain already seeded"}

    # Products
    prods = [
        ProductIn(name="Organic Cotton Fabric", sku="FAB-001", category="Raw Material", unit="kg"),
        ProductIn(name="Electronic PCB v2",     sku="PCB-002", category="Component",    unit="unit"),
        ProductIn(name="Lithium Battery Pack",  sku="BAT-003", category="Component",    unit="unit"),
        ProductIn(name="Steel Casing 4mm",      sku="STL-004", category="Raw Material", unit="kg"),
        ProductIn(name="Packaged Device v3",    sku="DEV-005", category="Finished Good", unit="unit"),
    ]
    pids = []
    for p in prods:
        doc = create_product(p)
        pids.append(doc["id"])

    # Suppliers
    sups = [
        SupplierIn(name="GreenThread Co.",    location="Bangalore, IN",    contact="green@thread.com"),
        SupplierIn(name="NanoCircuits Ltd.",  location="Shenzhen, CN",     contact="nano@circuits.cn"),
        SupplierIn(name="PowerCell GmbH",     location="Munich, DE",       contact="power@cell.de"),
    ]
    sids = []
    for s in sups:
        doc = create_supplier(s)
        sids.append(doc["id"])

    # Purchase Orders
    o1 = create_order(OrderIn(supplier_id=sids[0], items=[
        OrderItemIn(product_id=pids[0], qty=500, unit_price=2.5),
    ]))
    o2 = create_order(OrderIn(supplier_id=sids[1], items=[
        OrderItemIn(product_id=pids[1], qty=200, unit_price=12.0),
        OrderItemIn(product_id=pids[2], qty=200, unit_price=8.5),
    ]))

    # Approve + dispatch
    update_order_status(o1["id"], StatusUpdate(status="approved", note="Auto-approved"))
    update_order_status(o2["id"], StatusUpdate(status="approved", note="Auto-approved"))

    # Shipments
    s1 = create_shipment(ShipmentIn(order_id=o1["id"], origin="Bangalore", destination="Mumbai Warehouse", carrier="BlueDart"))
    add_checkpoint(s1["id"], CheckpointIn(location="Chennai Hub", status="in_transit", note="Cleared customs"))
    add_checkpoint(s1["id"], CheckpointIn(location="Mumbai Warehouse", status="delivered", note="All items verified"))

    s2 = create_shipment(ShipmentIn(order_id=o2["id"], origin="Shenzhen", destination="Delhi Warehouse", carrier="DHL"))
    add_checkpoint(s2["id"], CheckpointIn(location="Hong Kong Airport", status="in_transit"))

    # Inventory adjustments
    adjust_inventory(InventoryAdjust(product_id=pids[0], location="Mumbai Warehouse", qty_delta=500, reason="Shipment received"))
    adjust_inventory(InventoryAdjust(product_id=pids[1], location="Delhi Warehouse",  qty_delta=150, reason="Partial delivery"))

    # Quality checks
    create_qc(QCIn(shipment_id=s1["id"], product_id=pids[0], inspector="QA Team A", result="pass", notes="All 500kg verified"))
    create_qc(QCIn(shipment_id=s2["id"], product_id=pids[1], inspector="QA Team B", result="fail", notes="3 PCBs defective"))

    return {"message": "Supply chain demo seeded", "products": len(_products),
            "suppliers": len(_suppliers), "orders": len(_orders),
            "shipments": len(_shipments), "blocks": len(_chain.chain)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
