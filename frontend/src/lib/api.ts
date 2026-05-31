const BASE = "/api";

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

const post = (path: string, body: object) =>
  req(path, { method: "POST", body: JSON.stringify(body) });
const put = (path: string, body: object) =>
  req(path, { method: "PUT", body: JSON.stringify(body) });
const del = (path: string) => req(path, { method: "DELETE" });

export const api = {
  // Blockchain / nodes
  kpis:        ()                              => req<KPIs>("/kpis"),
  chain:       ()                              => req<Block[]>("/chain"),
  nodes:       ()                              => req<Node[]>("/nodes"),
  allMl:       ()                              => req<Record<string, MLResult>>("/ml"),
  perfHistory: ()                              => req<PerfSnap[]>("/performance-history"),
  seed:        (honest=5, malicious=2)         => post("/seed", {honest_count:honest, malicious_count:malicious}),
  attack:      (count=3)                       => post("/simulate-attack", {malicious_count:count}),
  nodeAction:  (node_id:string, action:string) => post("/node-action", {node_id,action}),
  reset:       ()                              => post("/reset", {}),
  addTx:       (payload: object)               => post("/add-transaction", payload),

  // Supply chain
  products:    ()                              => req<Product[]>("/products"),
  createProduct: (p: Omit<Product,"id"|"created_at"|"blockchain_tx">) => post("/products", p),
  updateProduct: (id:string, p: Partial<Product>) => put(`/products/${id}`, p),
  deleteProduct: (id:string) => del(`/products/${id}`),

  suppliers:   ()                              => req<Supplier[]>("/suppliers"),
  createSupplier: (s: {name:string; location:string; contact:string; node_id?:string}) => post("/suppliers", s),
  rateSupplier:(id:string, status:string, note="") => put(`/suppliers/${id}/rate`, {status,note}),

  orders:      ()                              => req<Order[]>("/orders"),
  createOrder: (o: { supplier_id:string; items:{product_id:string;qty:number;unit_price:number}[]; notes?:string }) => post("/orders", o),
  updateOrderStatus: (id:string, status:string, note="") => put(`/orders/${id}/status`, {status,note}),

  shipments:   ()                              => req<Shipment[]>("/shipments"),
  createShipment: (s:{order_id:string;origin:string;destination:string;carrier?:string}) => post("/shipments", s),
  addCheckpoint:(id:string, cp:{location:string;note?:string;status:string}) => post(`/shipments/${id}/checkpoint`, cp),

  inventory:   ()                              => req<InventoryItem[]>("/inventory"),
  adjustInventory: (a:{product_id:string;location:string;qty_delta:number;reason?:string}) => post("/inventory/adjust", a),

  quality:     ()                              => req<QCCheck[]>("/quality"),
  createQC:    (q:{shipment_id:string;product_id:string;inspector:string;result:string;notes?:string}) => post("/quality", q),

  provenance:  (product_id:string)             => req<Provenance>(`/provenance/${product_id}`),

  scmSeed:     ()                              => post("/scm-seed", {}),
};

// ── Types ─────────────────────────────────────────────────────

export interface KPIs {
  total_nodes:number; honest_nodes:number; malicious_nodes:number;
  malicious_pct:number; latency_ms:number; throughput:number;
  consensus_acc:number; total_blocks:number; chain_valid:boolean;
  difficulty:number; latest_hash:string|null;
}
export interface Block {
  index:number; hash:string; previous_hash:string;
  nonce:number; timestamp:number; transactions:any[];
}
export interface Node {
  node_id:string; node_type:string; score:number; status:string;
  tier:string; weight:number; successes:number; failures:number;
  history:number[]; mal_prob:number;
}
export interface MLResult {
  features:{mean_latency:number;variance:number;skewness:number;kurtosis:number;failure_rate:number;p95_latency:number;drop_rate:number};
  random_forest:number; isolation_forest:number; bayesian_stack:number;
  anomaly_threshold:number; is_anomaly:boolean;
}
export interface PerfSnap {
  t:number; throughput:number; latency_ms:number; malicious_pct:number; consensus_acc:number;
}
export interface Product {
  id:string; name:string; sku:string; category:string; unit:string;
  description:string; created_at:number; blockchain_tx:string;
}
export interface Supplier {
  id:string; name:string; location:string; contact:string; node_id:string;
  total_orders:number; created_at:number; blockchain_tx:string;
  reputation: Node | null;
}
export interface OrderItem { product_id:string; qty:number; unit_price:number }
export interface Order {
  id:string; supplier_id:string; supplier_name:string; items:OrderItem[];
  total:number; notes:string; status:string;
  history:{status:string;ts:number;note?:string}[];
  created_at:number; blockchain_tx:string;
}
export interface Shipment {
  id:string; order_id:string; supplier_name:string; order_total:number;
  origin:string; destination:string; carrier:string; status:string;
  checkpoints:{location:string;status:string;note:string;ts:number}[];
  created_at:number; blockchain_tx:string;
}
export interface InventoryItem {
  product_id:string; product_name:string; sku:string; unit:string;
  location:string; qty:number; last_updated:number; blockchain_tx?:string;
}
export interface QCCheck {
  id:string; shipment_id:string; product_id:string;
  inspector:string; result:string; notes:string;
  timestamp:number; blockchain_tx:string;
}
export interface Provenance {
  product:Product; events:any[]; inventory:InventoryItem[]; qc_checks:QCCheck[];
}
