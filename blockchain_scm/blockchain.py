import frappe
import hashlib
import json
import time
import random

# ── Blockchain core ───────────────────────────────────────────

class Block:
    def __init__(self, index, transactions, previous_hash, difficulty=2):
        self.index = index
        self.timestamp = time.time()
        self.transactions = transactions
        self.previous_hash = previous_hash
        self.difficulty = difficulty
        self.nonce = 0
        self.hash = self.mine_block()

    def compute_hash(self):
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": self.transactions,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()

    def mine_block(self):
        target = "0" * self.difficulty
        while True:
            hash_val = self.compute_hash()
            if hash_val.startswith(target):
                return hash_val
            self.nonce += 1


class Blockchain:
    def __init__(self):
        self.chain = []
        self.difficulty = 2
        self._create_genesis_block()

    def _create_genesis_block(self):
        genesis = Block(0, [{"type": "genesis", "data": "ChainGuard SCM"}], "0", self.difficulty)
        self.chain.append(genesis)

    def add_block(self, transactions):
        previous_hash = self.chain[-1].hash
        block = Block(len(self.chain), transactions, previous_hash, self.difficulty)
        self.chain.append(block)
        return block.hash

    def is_valid(self):
        for i in range(1, len(self.chain)):
            curr = self.chain[i]
            prev = self.chain[i - 1]
            if curr.hash != curr.compute_hash():
                return False
            if curr.previous_hash != prev.hash:
                return False
        return True


# Global blockchain instance
_blockchain = Blockchain()


# ── ERPNext hooks ─────────────────────────────────────────────

def _get_reputation(node_id):
    """Check node reputation before allowing transaction."""
    try:
        from blockchain_scm.reputation import get_reputation
        return get_reputation(node_id)
    except Exception:
        return {"score": 1.0, "status": "active"}


def _record_event(event_type, doc, extra=None):
    node_id = frappe.session.user
    rep = _get_reputation(node_id)

    if rep["status"] in ["quarantined", "slashed"]:
        frappe.throw(
            f"⛔ Transaction blocked — node '{node_id}' is {rep['status']} "
            f"by ChainGuard malicious node detection (reputation: {rep['score']:.2f})"
        )

    payload = {
        "event_type": event_type,
        "doc_name": doc.name,
        "submitted_by": node_id,
        "node_reputation": rep["score"],
        "node_status": rep["status"],
        "timestamp": time.time(),
    }
    if extra:
        payload.update(extra)

    tx_hash = _blockchain.add_block([payload])

    # Save tx hash back to ERPNext document
    try:
        frappe.db.set_value(doc.doctype, doc.name, "custom_blockchain_tx", tx_hash)
        frappe.db.commit()
    except Exception:
        pass

    frappe.msgprint(
        f"✅ ChainGuard: Recorded on blockchain<br>"
        f"TX: <code>{tx_hash[:20]}...</code><br>"
        f"Node reputation: {rep['score']:.2f} ({rep['status']})",
        alert=True
    )
    return tx_hash


def record_delivery_on_chain(doc, method):
    _record_event("delivery_note", doc, {
        "customer": doc.customer,
        "items": [{"item": i.item_code, "qty": i.qty} for i in doc.items],
        "posting_date": str(doc.posting_date),
    })


def record_purchase_on_chain(doc, method):
    _record_event("purchase_order", doc, {
        "supplier": doc.supplier,
        "items": [{"item": i.item_code, "qty": i.qty} for i in doc.items],
        "grand_total": float(doc.grand_total),
    })


def record_stock_movement(doc, method):
    _record_event("stock_entry", doc, {
        "entry_type": doc.stock_entry_type,
        "items": [{"item": i.item_code, "qty": i.qty} for i in doc.items],
    })


def record_receipt_on_chain(doc, method):
    _record_event("purchase_receipt", doc, {
        "supplier": doc.supplier,
        "items": [{"item": i.item_code, "qty": i.qty} for i in doc.items],
    })


# ── API endpoints (callable from browser/Postman) ─────────────

@frappe.whitelist()
def get_chain_status():
    return {
        "total_blocks": len(_blockchain.chain),
        "is_valid": _blockchain.is_valid(),
        "difficulty": _blockchain.difficulty,
        "latest_hash": _blockchain.chain[-1].hash if _blockchain.chain else None,
    }


@frappe.whitelist()
def get_chain():
    return [
        {
            "index": b.index,
            "hash": b.hash,
            "previous_hash": b.previous_hash,
            "transactions": b.transactions,
            "nonce": b.nonce,
            "timestamp": b.timestamp,
        }
        for b in _blockchain.chain
    ]