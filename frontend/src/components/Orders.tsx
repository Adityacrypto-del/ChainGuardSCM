import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ShoppingCart, ChevronDown, ChevronUp, Hash } from "lucide-react";
import { api, type Order, type Product, type Supplier } from "../lib/api";

interface Props { orders: Order[]; products: Product[]; suppliers: Supplier[]; onRefresh: () => void }

const STATUS_FLOW = ["draft","approved","dispatched","in_transit","received","cancelled"];
const STATUS_COLOR: Record<string,string> = {
  draft:"#71717a", approved:"#06b6d4", dispatched:"#a78bfa",
  in_transit:"#f59e0b", received:"#22c55e", cancelled:"#ef4444",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "#71717a";
  return (
    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border"
      style={{ borderColor:color+"33", background:color+"11", color }}>
      {status.replace(/_/g," ")}
    </span>
  );
}

export default function Orders({ orders, products, suppliers, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [suppId, setSuppId]     = useState("");
  const [items, setItems]       = useState([{ product_id:"", qty:1, unit_price:0 }]);
  const [notes, setNotes]       = useState("");
  const [busy, setBusy]         = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const submit = async () => {
    if (!suppId || items.some(i => !i.product_id)) return;
    setBusy(true);
    try {
      await api.createOrder({ supplier_id:suppId, items, notes });
      onRefresh(); setShowForm(false); setSuppId(""); setItems([{product_id:"",qty:1,unit_price:0}]); setNotes("");
    } finally { setBusy(false); }
  };

  const advance = async (id: string, current: string) => {
    const idx = STATUS_FLOW.indexOf(current);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    await api.updateOrderStatus(id, STATUS_FLOW[idx + 1]);
    onRefresh();
  };

  const productName = (pid: string) => products.find(p => p.id === pid)?.name ?? pid;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" /> Purchase Orders
          </h2>
          <p className="text-[11px] text-muted mt-0.5">{orders.length} orders</p>
        </div>
        <motion.button whileTap={{ scale:0.96 }} onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
          <Plus className="w-3.5 h-3.5" /> New Order
        </motion.button>
      </motion.div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity:0, y:-10, scale:0.98 }}
            animate={{ opacity:1, y:0,   scale:1   }}
            exit={{    opacity:0, y:-10, scale:0.98 }}
            transition={{ duration:0.2 }}
            className="card border border-primary/30 bg-primary/5 flex flex-col gap-4"
          >
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">Create Purchase Order</h3>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-muted uppercase">Supplier</label>
              <select value={suppId} onChange={e => setSuppId(e.target.value)} className="input text-xs py-1.5 max-w-xs">
                <option value="">— select —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono text-muted uppercase">Line Items</label>
              <AnimatePresence>
                {items.map((item, i) => (
                  <motion.div key={i}
                    initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                    exit={{ opacity:0, x:-8 }} transition={{ duration:0.15 }}
                    className="grid grid-cols-3 gap-2"
                  >
                    <select value={item.product_id} onChange={e => setItems(arr => arr.map((a,j)=>j===i?{...a,product_id:e.target.value}:a))}
                      className="input text-xs py-1.5">
                      <option value="">— product —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={item.qty} min={1}
                      onChange={e => setItems(arr => arr.map((a,j)=>j===i?{...a,qty:+e.target.value}:a))}
                      className="input text-xs py-1.5" />
                    <input type="number" placeholder="Unit price" value={item.unit_price} min={0} step={0.01}
                      onChange={e => setItems(arr => arr.map((a,j)=>j===i?{...a,unit_price:+e.target.value}:a))}
                      className="input text-xs py-1.5" />
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={() => setItems(arr => [...arr, {product_id:"",qty:1,unit_price:0}])}
                className="text-xs text-primary font-mono hover:underline text-left w-fit">+ add line</button>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-muted uppercase">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className="input text-xs py-1.5" />
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale:0.96 }} onClick={submit} disabled={busy} className="btn btn-primary btn-sm">
                {busy ? "Creating…" : "Create Order"}
              </motion.button>
              <motion.button whileTap={{ scale:0.96 }} onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orders list */}
      {orders.length === 0 ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="card text-center py-12">
          <ShoppingCart className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-muted">No orders yet.</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o, i) => (
            <motion.div key={o.id}
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              transition={{ delay: i * 0.05, duration:0.2 }}
              className="card flex flex-col gap-0 hover:border-border2 transition-colors"
            >
              <div className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => setExpanded(e => e === o.id ? null : o.id)}>
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[9px] text-muted font-mono uppercase mb-0.5">Order ID</div>
                    <div className="font-mono text-primary text-[11px]">{o.id}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-muted font-mono uppercase mb-0.5">Supplier</div>
                    <div className="text-white text-xs truncate">{o.supplier_name}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-muted font-mono uppercase mb-0.5">Total</div>
                    <div className="text-white text-xs font-mono">${o.total.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-muted font-mono uppercase mb-0.5">Status</div>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
                <motion.div animate={{ rotate: expanded === o.id ? 180 : 0 }} transition={{ duration:0.2 }}>
                  <ChevronDown className="w-4 h-4 text-muted" />
                </motion.div>
              </div>

              <AnimatePresence>
                {expanded === o.id && (
                  <motion.div
                    initial={{ opacity:0, height:0 }}
                    animate={{ opacity:1, height:"auto" }}
                    exit={{    opacity:0, height:0    }}
                    transition={{ duration:0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4">
                      <div>
                        <div className="text-[9px] font-mono text-muted uppercase mb-2">Line Items</div>
                        <div className="flex flex-col gap-1">
                          {o.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-xs font-mono">
                              <span className="text-zinc-300">{productName(item.product_id)}</span>
                              <span className="text-muted">
                                {item.qty} × ${item.unit_price} = <span className="text-white">${(item.qty*item.unit_price).toFixed(2)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-mono text-muted uppercase mb-2">Status History</div>
                        <div className="flex flex-wrap gap-1.5">
                          {o.history.map((h, i) => (
                            <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-md border"
                              style={{ borderColor:(STATUS_COLOR[h.status]??"#71717a")+"33", background:(STATUS_COLOR[h.status]??"#71717a")+"11", color:STATUS_COLOR[h.status]??"#71717a" }}>
                              {h.status} · {new Date(h.ts*1000).toLocaleTimeString()}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="hash-chip"><Hash className="w-2.5 h-2.5" />{o.blockchain_tx?.slice(0,16)}…</span>
                        {!["received","cancelled"].includes(o.status) && (
                          <motion.button whileTap={{ scale:0.96 }} onClick={() => advance(o.id, o.status)}
                            className="btn btn-primary btn-sm">
                            Advance → {STATUS_FLOW[STATUS_FLOW.indexOf(o.status)+1]}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
