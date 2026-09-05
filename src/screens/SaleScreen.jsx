import { useState } from "react";
import { Plus, Minus, ShoppingCart, Trash2, Loader2 } from "lucide-react";
import { db } from "../firebase";
import { doc, collection, runTransaction, serverTimestamp } from "firebase/firestore";
import { formatKs } from "../lib/format";
import { notifySaleWebhook } from "../lib/webhook";

export default function SaleScreen({ products, cart, setCart, setToast }) {
  const [checkingOut, setCheckingOut] = useState(false);

  const addToCart = (product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          unit: product.unit,
          price: product.price,
          // Dashboard ရဲ့ "အမြတ်" တွက်ချက်မှုအတွက် ဝယ်ဈေးကို ဒီအချိန်မှာပဲ ကူးမှတ်ထားသည်
          // (နောက်ပိုင်း ဝယ်ဈေး ပြောင်းလဲသွားလည်း ဒီအရောင်းအတွက် မှန်ကန်နေဆဲ ဖြစ်စေရန်)
          costPrice: product.costPrice || 0,
          qty: 1,
        },
      ];
    });
  };

  const changeQty = (id, delta) => {
    setCart((prev) => {
      const product = products.find((p) => p.id === id);
      return prev
        .map((i) => {
          if (i.id !== id) return i;
          const nextQty = i.qty + delta;
          if (product && nextQty > product.stock) return i;
          return { ...i, qty: nextQty };
        })
        .filter((i) => i.qty > 0);
    });
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0);

  // Checkout ကို Firestore transaction နဲ့ လုပ်ပါတယ် — stock လျော့ချခြင်းနဲ့
  // sale record မှတ်တမ်းတင်ခြင်းကို တစ်ပြိုင်နက်တည်း၊ atomically လုပ်ဆောင်ပါတယ်။
  const handleCheckout = async () => {
    if (cart.length === 0 || checkingOut) return;
    setCheckingOut(true);
    try {
      // saleRef ကို transaction အပြင်ဘက်မှာ ကြိုတည်ဆောက်ထားတာက transaction
      // အောင်မြင်ပြီးနောက် webhook ပို့ဖို့ id ကို ပြန်သုံးနိုင်အောင်ဖြစ်ပါတယ်
      const saleRef = doc(collection(db, "sales"));
      const saleItems = cart.map(({ id, name, unit, price, costPrice, qty }) => ({
        id,
        name,
        unit,
        price,
        costPrice,
        qty,
      }));

      await runTransaction(db, async (transaction) => {
        const productRefs = cart.map((item) => doc(db, "products", String(item.id)));
        const snaps = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

        snaps.forEach((snap, idx) => {
          const item = cart[idx];
          if (!snap.exists()) {
            throw new Error(`${item.name} ကို database ထဲမှာ ရှာမတွေ့ပါ`);
          }
          if (snap.data().stock < item.qty) {
            throw new Error(`${item.name} လက်ကျန်ပစ္စည်း မလုံလောက်ပါ`);
          }
        });

        snaps.forEach((snap, idx) => {
          const item = cart[idx];
          transaction.update(productRefs[idx], { stock: snap.data().stock - item.qty });
        });

        transaction.set(saleRef, {
          items: saleItems,
          total,
          itemCount,
          createdAt: serverTimestamp(),
        });
      });

      setToast({ total });
      setCart([]);

      // Sale ကို Firestore ထဲ အောင်မြင်စွာ ရေးပြီးမှသာ webhook ကို ပို့ပါတယ်။
      // notifySaleWebhook() ကိုယ်တိုင်က error အားလုံးကို ကိုယ့်ဟာကိုယ် catch
      // လုပ်ထားလို့ ဒီနေရာမှာ await/try မလိုပါဘူး — webhook မအောင်မြင်လည်း
      // checkout ပြီးပြီဖြစ်တဲ့ POS flow ကို ဘယ်လိုမှ မထိခိုက်ပါ
      notifySaleWebhook({
        id: saleRef.id,
        items: saleItems,
        total,
        itemCount,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setToast({ error: err.message || "ငွေရှင်းမှု မအောင်မြင်ပါ" });
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row min-h-0">
      {/* Product list */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <h2 className="text-sm font-semibold text-stone-500 mb-3">ကုန်ပစ္စည်းများ</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product) => {
            const outOfStock = product.stock <= 0;
            const lowStock = product.stock > 0 && product.stock <= 10;
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={outOfStock}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center transition
                  ${outOfStock
                    ? "bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed"
                    : "bg-white border-orange-100 shadow-sm active:scale-95 active:bg-orange-50"}
                `}
              >
                <span className="text-4xl">{product.emoji}</span>
                <span className="text-base font-semibold text-stone-800">{product.name}</span>
                <span className="text-orange-600 font-bold text-lg">{formatKs(product.price)}</span>
                <span className="text-xs text-stone-400">တစ်{product.unit}</span>
                <span
                  className={`mt-1 text-xs font-medium px-2 py-0.5 rounded-full
                    ${outOfStock
                      ? "bg-stone-200 text-stone-500"
                      : lowStock
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"}
                  `}
                >
                  {outOfStock ? "ကုန်ပြီ" : `ကျန် ${product.stock}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart panel */}
      <div className="h-[42vh] md:h-auto md:w-[380px] shrink-0 bg-white border-t-4 md:border-t-0 md:border-l border-orange-100 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-orange-50 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-bold text-stone-800">Cart {itemCount > 0 && `(${itemCount})`}</h2>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1 text-xs text-stone-400 active:text-red-500 px-2 py-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ရှင်းမည်
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-stone-300 px-6 text-center">
              <ShoppingCart className="w-10 h-10" />
              <p className="text-sm text-stone-400">ပစ္စည်းရွေးချယ်ရန် Product ကို နှိပ်ပါ</p>
            </div>
          ) : (
            <ul className="divide-y divide-orange-50">
              {cart.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 truncate">{item.name}</p>
                    <p className="text-sm text-stone-400">{formatKs(item.price)} × {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => changeQty(item.id, -1)}
                      className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center active:bg-orange-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-bold text-stone-800">{item.qty}</span>
                    <button
                      onClick={() => changeQty(item.id, 1)}
                      className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center active:bg-orange-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="w-20 text-right font-bold text-stone-800 shrink-0">
                    {formatKs(item.price * item.qty)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-orange-100 p-4 bg-orange-50/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-stone-500 font-medium">စုစုပေါင်း</span>
            <span className="text-2xl font-extrabold text-stone-800">{formatKs(total)}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || checkingOut}
            className={`w-full h-14 rounded-2xl text-lg font-bold text-white transition flex items-center justify-center gap-2
              ${cart.length === 0 || checkingOut
                ? "bg-stone-300 cursor-not-allowed"
                : "bg-orange-600 active:bg-orange-700"}
            `}
          >
            {checkingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {checkingOut ? "ငွေရှင်းနေသည်..." : "Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}