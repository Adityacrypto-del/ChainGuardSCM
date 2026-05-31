# ChainGuard SCM

Blockchain-secured supply chain management with malicious node detection, ensemble ML threat analysis, and real-time consensus monitoring.

## Architecture

```
ChainGuardSCM/
├── backend/              # FastAPI Python server (port 8000)
│   ├── main.py           # Blockchain + reputation + ML + SCM + REST API
│   └── requirements.txt
├── frontend/             # React + TypeScript + Tailwind + Framer Motion (port 5173)
│   └── src/
│       ├── App.tsx
│       ├── lib/api.ts
│       └── components/   # 13 views
└── blockchain_scm/       # Original Frappe app (legacy, requires ERPNext)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | SHA-256 PoW, in-memory chain |
| Reputation Engine | Bayesian EWMA, node stratification (Tier A/B/C) |
| ML Pipeline | Random Forest + Isolation Forest + Bayesian Stacking → P(mal) |
| Backend | Python 3.11, FastAPI, uvicorn |
| Frontend | React 18, TypeScript, Vite, TailwindCSS v3, Framer Motion, Recharts |

## Running Locally

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 3. Seed demo data

Once both servers are running, open http://localhost:5173, click **"Seed Demo Data"** in the sidebar, or hit the API directly:

```bash
curl -X POST http://localhost:8000/api/seed        # blockchain nodes
curl -X POST http://localhost:8000/api/scm-seed    # products, suppliers, orders, shipments
```

## API Reference

### Blockchain
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/kpis` | Live network KPIs |
| GET | `/api/chain` | Full blockchain |
| GET | `/api/nodes` | All node reputations |
| GET | `/api/ml` | ML pipeline scores for all nodes |
| GET | `/api/performance-history` | Rolling performance snapshots |
| POST | `/api/seed` | Seed demo blockchain network |
| POST | `/api/simulate-attack` | Inject malicious nodes |
| POST | `/api/node-action` | Flag or trust a node |
| POST | `/api/reset` | Reset all node reputations |

### Supply Chain
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/products` | Product catalog |
| PUT/DELETE | `/api/products/{id}` | Update or delete product |
| GET/POST | `/api/suppliers` | Supplier management |
| PUT | `/api/suppliers/{id}/rate` | Rate supplier (affects blockchain node) |
| GET/POST | `/api/orders` | Purchase orders |
| PUT | `/api/orders/{id}/status` | Advance order status |
| GET/POST | `/api/shipments` | Shipment tracking |
| POST | `/api/shipments/{id}/checkpoint` | Add shipment checkpoint |
| GET | `/api/inventory` | Current stock levels |
| POST | `/api/inventory/adjust` | Stock in / stock out |
| GET/POST | `/api/quality` | QC inspections |
| GET | `/api/provenance/{product_id}` | Full blockchain trace for a product |
| POST | `/api/scm-seed` | Seed demo supply chain data |

## Dashboard Views

| View | Description |
|---|---|
| Overview | Live KPI cards, node table, audit trail, SCM summary |
| ML Pipeline | Ensemble model visualization + per-node P(mal) scores |
| Network Nodes | Full node stratification (Tier A/B/C), trust/flag controls |
| Audit Trail | Block explorer with transaction types |
| Performance | TPS, latency, attack resilience, consensus accuracy charts |
| Simulation | Inject attacks, seed network, reset |
| Products | CRUD product catalog |
| Suppliers | Supplier cards with live reputation scores |
| Orders | Purchase orders with line items and status flow |
| Shipments | Shipment tracking with checkpoint timeline |
| Inventory | Stock levels by location, adjust in/out |
| Quality Control | Log inspections, pass/fail auto-flags supplier node |
| Provenance | Trace any product's complete blockchain event history |

## Blockchain + Supply Chain Integration

Every supply chain state change writes a block to the SHA-256 PoW chain. If a QC check **fails**, it calls `node.update(honest=False)` on the supplier's blockchain node — degrading their Bayesian reputation and potentially pushing them Tier A → Tier B → Tier C (slashed, consensus weight = 0).

## Note on data persistence

All data is in-memory. Restarting the backend clears it — re-seed with the buttons above.

## License

MIT
