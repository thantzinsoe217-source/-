import { useState } from "react";
import { Check, ArrowLeft, Loader2, PackagePlus } from "lucide-react";
import { db } from "../firebase";
import { doc, collection, writeBatch, serverTimestamp } from "firebase/firestore";
import { formatKs } from "../lib/format";

// 3-tap flow: (1) ပစ္စည်းရွေးမည် (2) ဆက်လုပ်မည် (3) အတည်ပြုပြီး ပစ္စည်းသွင်းမည်
export default function StockScreen({ products, setToast }) {
  const [phase, setPhase] = useState("select"); // "select" | "form"
  const [selectedIds, setSelectedIds] = useState([]);
  const [entries, setEntries] = useState({}); // { [id]: { qty, cost } }
  const [saving, setSaving] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Tap 2 — ရွေးထားတဲ့ ပစ္စည်းတွေအတွက် qty/ဝယ်ဈေး ဖြည့်ဖို့ formကို ဖွင့်သည်
  const goToForm = () => {
    if (selectedIds.length === 0) return;
    setEntries((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        if (!next[id]) {
          const product = products.find((p) => p.id === id);
          next[id] = { qty: "", cost: product?.costPrice ? String(product.costPrice) : "" };
        }
      });
      return next;
    });
    setPhase("form");
  };

  const updateEntry = (id, field, value) => {
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const totalCost = selectedIds.reduce((sum, id) => {
    const e = entries[id];
    return sum + (Number(e?.qty) || 0) * (Number(e?.cost) || 0);
  }, 0);

  // Tap 3 — အတည်ပြုပြီး stock + costPrice ကို Firestore batch နဲ့ တစ်ပြိုင်နက်တည်း update လုပ်ပြီး
  // stockIns collection ထဲမှာ ဒီနေ့ဝယ်ငွေ မှတ်တမ်းတင်ထားသည် (Dashboard အတွက်)
  const handleConfirm = async () => {
    const validIds = selectedIds.filter((id) => Number(entries[id]?.qty) > 0);
    if (validIds.length === 0) {
      setToast({ error: "အနည်းဆုံး ပစ္စည်းတစ်ခုအတွက် အရေအတွက် ထည့်ပါ" });
      return;
    }
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const items = [];
      validIds.forEach((id) => {
        const product = products.find((p) => p.id === id);
        const qty = Number(entries[id].qty);
        const cost = Number(entries[id].cost) || 0;
        const ref = doc(db, "products", String(id));
        batch.update(ref, {
          stock: (product.stock || 0) + qty,
          costPrice: cost || product.costPrice || 0,
        });
        items.push({ id, name: product.name, qty, costPrice: cost });
      });
      const stockInRef = doc(collection(db, "stockIns"));
      batch.set(stockInRef, {
        items,
        totalCost: items.reduce((s, i) => s + i.qty * i.costPrice, 0),
        createdAt: serverTimestamp(),
      });
      await batch.commit();

      setToast({ message: `ပစ္စည်း ${validIds.length} မျိုး သွင်းပြီးပါပြီ` });
      setSelectedIds([]);
      setEntries({});
      setPhase("select");
    } catch (err) {
      setToast({ error: err.message || "မသွင်းနိုင်ပါ" });
    } finally {
      setSaving(false);
    }
  };

  if (phase === "form") {
    return (
      <div className="h-full flex flex-col min-h-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-orange-100 shrink-0 bg-white">
          <button
            onClick={() => setPhase("select")}
            className="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 active:bg-stone-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-stone-800">အရေအတွက်နှင့် ဝယ်ဈေး ဖြည့်ပါ</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {selectedIds.map((id) => {
            const product = products.find((p) => p.id === id);
            if (!product) return null;
            const e = entries[id] || {};
            return (
              <div key={id} className="bg-white rounded-2xl border border-orange-100 p-3 flex items-center gap-3">
                <span className="text-2xl">{product.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-800 truncate">{product.name}</p>
                  <p className="text-xs text-stone-400">လက်ရှိကျန် {product.stock} {product.unit}</p>
                </div>
                <div className="w-20">
                  <label className="text-[10px] text-stone-400">အရေအတွက်</label>
                  <input
                    type="number"
                    value={e.qty}
                    onChange={(ev) => updateEntry(id, "qty", ev.target.value)}
                    className="w-full h-10 rounded-lg border border-stone-200 px-2 text-center focus:outline-none focus:border-orange-400"
                    placeholder="0"
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] text-stone-400">ဝယ်ဈေး (Ks)</label>
                  <input
                    type="number"
                    value={e.cost}
                    onChange={(ev) => updateEntry(id, "cost", ev.target.value)}
                    className="w-full h-10 rounded-lg border border-stone-200 px-2 text-center focus:outline-none focus:border-orange-400"
                    placeholder="0"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-orange-100 p-4 bg-orange-50/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-stone-500 font-medium">စုစုပေါင်းဝယ်ဈေး</span>
            <span className="text-xl font-extrabold text-stone-800">{formatKs(totalCost)}</span>
          </div>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full h-14 rounded-2xl text-lg font-bold text-white bg-orange-600 active:bg-orange-700 disabled:bg-stone-300 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            အတည်ပြုပြီး ပစ္စည်းသွင်းမည်
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <h2 className="text-sm font-semibold text-stone-500 mb-3">ပစ္စည်းသွင်းရန် ရွေးပါ (တစ်ခုထက်ပို ရွေးနိုင်သည်)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product) => {
            const isSelected = selectedIds.includes(product.id);
            return (
              <button
                key={product.id}
                onClick={() => toggleSelect(product.id)}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center transition
                  ${isSelected
                    ? "bg-orange-50 border-orange-500 ring-2 ring-orange-500"
                    : "bg-white border-orange-100 shadow-sm active:bg-orange-50"}
                `}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <span className="text-4xl">{product.emoji}</span>
                <span className="text-base font-semibold text-stone-800">{product.name}</span>
                <span className="text-xs text-stone-400">ကျန် {product.stock} {product.unit}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="shrink-0 border-t border-orange-100 p-4 bg-white">
          <button
            onClick={goToForm}
            className="w-full h-14 rounded-2xl text-lg font-bold text-white bg-orange-600 active:bg-orange-700 flex items-center justify-center gap-2"
          >
            <PackagePlus className="w-5 h-5" />
            {selectedIds.length} မျိုး ရွေးထား — ဆက်လုပ်မည်
          </button>
        </div>
      )}
    </div>
  );
}
