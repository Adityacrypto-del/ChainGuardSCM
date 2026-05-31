import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Warehouse, ArrowUpCircle, ArrowDownCircle, Hash } from "lucide-react";
import { api, type InventoryItem, type Product } from "../lib/api";

interface Props { inventory: InventoryItem[]; products: Product[]; onRefresh: () => void }

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show:   (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.2 } }),
};

export default function Inventory({ inventory, products, onRefresh }: Props) {
  const [form, setForm] = useState({ product_id:"", location:"warehouse", qty_delta:0, reason:"" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState<{ text:string; type:"success"|"danger" } | null>(null);

  const submit = async (sign: 1 | -1) => {
    if (!form.product_id || form.qty_delta === 0) return;
    setBusy(true);
    try {
      await api.adjustInventory({ ...form, qty_delta: Math.abs(form.qty_delta) * sign });
      setMsg({ text: sign > 0 ? `+${form.qty_delta} units added` : `-${form.qty_delta} units removed`, type: sign > 0 ? "success" : "danger" });
      onRefresh();
      setTimeout(() => setMsg(null), 3000);
    } finally { setBusy(false); }
  };

  const byLocation = inventory.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    (acc[item.location] = acc[item.location] ?? []).push(item);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-primary" /> Inventory
          </h2>
          <p className="text-[11px] text-muted mt-0.5">
            {inventory.length} stock lines · {Object.keys(byLocation).length} locations
          </p>
        </div>
      </motion.div>

      {/* Adjustment panel */}
      <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}
        className="card border border-warning/20 bg-warning/5 flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-warning">Stock Adjustment</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-muted uppercase">Product</label>
            <select value={form.product_id} onChange={e => setForm(p => ({...p, product_id:e.target.value}))}
              className="input text-xs py-1.5">
              <option value="">— select —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-muted uppercase">Location</label>
            <input value={form.location} onChange={e => setForm(p => ({...p, location:e.target.value}))} className="input text-xs py-1.5" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-muted uppercase">Quantity</label>
            <input type="number" value={form.qty_delta} min={0}
              onChange={e => setForm(p => ({...p, qty_delta:+e.target.value}))} className="input text-xs py-1.5" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-muted uppercase">Reason</label>
            <input value={form.reason} onChange={e => setForm(p => ({...p, reason:e.target.value}))}
              placeholder="e.g. received shipment" className="input text-xs py-1.5" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale:0.96 }} onClick={() => submit(1)} disabled={busy} className="btn btn-success btn-sm">
            <ArrowUpCircle className="w-3.5 h-3.5" /> Stock In
          </motion.button>
          <motion.button whileTap={{ scale:0.96 }} onClick={() => submit(-1)} disabled={busy} className="btn btn-danger btn-sm">
            <ArrowDownCircle className="w-3.5 h-3.5" /> Stock Out
          </motion.button>
          <AnimatePresence>
            {msg && (
              <motion.span initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
                className={`text-xs font-mono ${msg.type === "success" ? "text-success" : "text-danger"}`}>
                {msg.text}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* By location */}
      {inventory.length === 0 ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="card text-center py-12">
          <Warehouse className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-muted">No inventory yet. Seed the supply chain or adjust stock manually.</p>
        </motion.div>
      ) : (
        Object.entries(byLocation).map(([loc, items], gi) => (
          <motion.div key={loc} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            transition={{ delay: gi * 0.06, duration:0.2 }} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Warehouse className="w-3.5 h-3.5 text-muted" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">{loc}</span>
              <span className="text-[10px] text-muted font-mono">{items.length} SKUs</span>
            </div>
            <div className="card overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th><th>SKU</th><th className="text-right">Qty</th>
                    <th>Unit</th><th>Last Updated</th><th>TX</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <motion.tr key={`${item.product_id}:${item.location}`}
                      custom={i} variants={rowVariants} initial="hidden" animate="show"
                      whileHover={{ backgroundColor:"rgba(255,255,255,0.02)" }}>
                      <td className="font-medium text-white">{item.product_name}</td>
                      <td className="font-mono text-[11px] text-primary">{item.sku}</td>
                      <td className="text-right">
                        <motion.span
                          key={item.qty}
                          initial={{ scale:1.2, opacity:0.5 }} animate={{ scale:1, opacity:1 }}
                          className={`font-mono font-bold ${item.qty === 0 ? "text-danger" : item.qty < 10 ? "text-warning" : "text-success"}`}>
                          {item.qty}
                        </motion.span>
                      </td>
                      <td className="text-[11px] text-muted font-mono">{item.unit}</td>
                      <td className="text-[11px] text-muted font-mono">{new Date(item.last_updated*1000).toLocaleString()}</td>
                      <td>
                        {item.blockchain_tx && <span className="hash-chip"><Hash className="w-2.5 h-2.5" />{item.blockchain_tx.slice(0,10)}…</span>}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
