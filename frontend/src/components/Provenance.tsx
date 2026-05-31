import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, GitBranch, CheckCircle, XCircle, Hash, Package } from "lucide-react";
import { api, type Provenance as ProvenanceData, type Product } from "../lib/api";

interface Props { products: Product[] }

const TX_COLOR: Record<string, string> = {
  product_created:    "#22c55e",
  product_updated:    "#6366f1",
  product_deleted:    "#ef4444",
  quality_check:      "#f59e0b",
  shipment_checkpoint:"#a78bfa",
  inventory_adjusted: "#06b6d4",
};

export default function Provenance({ products }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [data, setData]             = useState<ProvenanceData | null>(null);
  const [loading, setLoading]       = useState(false);

  const lookup = async () => {
    if (!selectedId) return;
    setLoading(true);
    setData(null);
    try { setData(await api.provenance(selectedId)); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" /> Product Provenance
        </h2>
        <p className="text-[11px] text-muted mt-0.5">Trace any product's complete blockchain history</p>
      </motion.div>

      {/* Search panel */}
      <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}
        className="card flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] font-mono text-muted uppercase">Select Product</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="input py-2 text-sm">
            <option value="">— choose a product to trace —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <motion.button whileTap={{ scale:0.96 }} onClick={lookup} disabled={!selectedId || loading}
            className="btn btn-primary w-full sm:w-auto">
            <Search className="w-4 h-4" />
            {loading ? "Tracing…" : "Trace"}
          </motion.button>
        </div>
      </motion.div>

      {/* Loading state */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="card flex items-center justify-center py-12 gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted">Scanning blockchain…</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {data && !loading && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="flex flex-col gap-5">
            {/* Product banner */}
            <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
              className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-base">{data.product.name}</div>
                <div className="text-[11px] text-muted font-mono">{data.product.sku} · {data.product.category} · {data.product.unit}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] text-muted font-mono uppercase">Chain events</div>
                <div className="text-3xl font-bold text-primary">{data.events.length}</div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Timeline */}
              <div className="lg:col-span-2 card flex flex-col gap-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white">Blockchain Event Timeline</h3>
                {data.events.length === 0 ? (
                  <p className="text-muted text-sm py-4 text-center">No blockchain events recorded yet.</p>
                ) : (
                  <div className="flex flex-col">
                    {data.events.map((ev, i) => {
                      const tx = ev.transactions?.[0] ?? {};
                      const type = tx.type ?? "event";
                      const color = TX_COLOR[type] ?? "#06b6d4";
                      return (
                        <motion.div key={i}
                          initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                          transition={{ delay: i * 0.05, duration:0.2 }}
                          className="flex gap-3"
                        >
                          <div className="flex flex-col items-center">
                            <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                              transition={{ delay: i*0.05+0.1, type:"spring", stiffness:300 }}
                              className="w-2.5 h-2.5 rounded-full border-2 mt-1 flex-shrink-0"
                              style={{ borderColor:color, background:color+"33", boxShadow:`0 0 6px ${color}44` }} />
                            {i < data.events.length-1 && <div className="w-px flex-1 bg-border mt-1 mb-0.5 min-h-[16px]" />}
                          </div>
                          <div className="pb-4 flex flex-col gap-0.5 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold capitalize" style={{ color }}>
                                {type.replace(/_/g," ")}
                              </span>
                              {tx.timestamp && (
                                <span className="text-[9px] text-muted font-mono flex-shrink-0">
                                  {new Date(tx.timestamp*1000).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <span className="hash-chip w-fit">
                              <Hash className="w-2.5 h-2.5" />{String(ev.tx ?? ev.hash ?? "").slice(0,20)}…
                            </span>
                            {tx.location && <div className="text-[10px] text-muted mt-0.5">📍 {tx.location}</div>}
                            {tx.result && (
                              <div className="flex items-center gap-1 text-[10px] mt-0.5">
                                {tx.result === "pass"
                                  ? <><CheckCircle className="w-3 h-3 text-success" /><span className="text-success font-medium">QC Passed</span></>
                                  : <><XCircle className="w-3 h-3 text-danger" /><span className="text-danger font-medium">QC Failed</span></>}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sidebar — inventory + QC */}
              <div className="flex flex-col gap-4">
                <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
                  className="card flex flex-col gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-white">Current Inventory</h3>
                  {data.inventory.length === 0 ? (
                    <p className="text-muted text-xs text-center py-3">No stock recorded.</p>
                  ) : data.inventory.map((inv, i) => (
                    <motion.div key={i} initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }}
                      transition={{ delay:i*0.06 }}
                      className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                      <span className="text-[11px] text-muted font-mono">{inv.location}</span>
                      <motion.span key={inv.qty} initial={{ scale:1.15 }} animate={{ scale:1 }}
                        className={`text-sm font-bold font-mono ${inv.qty===0?"text-danger":inv.qty<10?"text-warning":"text-success"}`}>
                        {inv.qty} <span className="text-xs font-normal text-muted">{inv.unit}</span>
                      </motion.span>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
                  className="card flex flex-col gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-white">Quality Checks</h3>
                  {data.qc_checks.length === 0 ? (
                    <p className="text-muted text-xs text-center py-3">No QC checks recorded.</p>
                  ) : data.qc_checks.map((qc, i) => (
                    <motion.div key={i} initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }}
                      transition={{ delay:i*0.06 }}
                      className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted">{qc.inspector}</span>
                        <span className={`flex items-center gap-1 text-[11px] font-semibold ${qc.result==="pass"?"text-success":"text-danger"}`}>
                          {qc.result==="pass" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {qc.result.toUpperCase()}
                        </span>
                      </div>
                      {qc.notes && <div className="text-[10px] text-muted italic">{qc.notes}</div>}
                      <span className="hash-chip w-fit"><Hash className="w-2.5 h-2.5" />{qc.blockchain_tx?.slice(0,12)}…</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
