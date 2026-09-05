import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

// Firestore ထဲက /settings/webhook document ကနေ webhook URL ကို ဖတ်ပြီး
// အဲဒီ URL ဆီကို sale data ကို client-side ကနေ တိုက်ရိုက် POST ပို့ပါတယ်
// (Firebase Spark အခမဲ့ plan မှာ Cloud Functions မသုံးလို့ပါ)။
//
// URL ကို setup မလုပ်ရသေးရင် ဘာမှမလုပ်ဘဲ ပြန်ထွက်ပါတယ်။
// ဒီ function ဟာ ဘယ်တော့မှ error throw မလုပ်ပါ — network error/timeout/
// webhook ဘက်က error ဖြစ်ရင်တောင် POS ရဲ့ checkout flow ကို လုံးဝ မထိခိုက်စေရန်
// error အားလုံးကို ဒီထဲမှာပဲ catch/log လုပ်ထားပါတယ်။
export async function notifySaleWebhook(saleData) {
  try {
    const settingsSnap = await getDoc(doc(db, "settings", "webhook"));
    const url = settingsSnap.exists() ? settingsSnap.data().url : null;
    if (!url) return; // webhook ကို setup မလုပ်ရသေးရင် ဘာမှမလုပ်ပါ

    // n8n ရဲ့ response ကို ကြာကြာစောင့်နေရင်း POS UI ကို freeze မဖြစ်စေရန်
    // 8 စက္ကန့် timeout တစ်ခု ထည့်ထားပါတယ်
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleData),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      console.warn(`Webhook က HTTP ${res.status} ပြန်ခဲ့ပါတယ်`);
    }
  } catch (err) {
    // network error, timeout, CORS error, URL မှား စတာတွေ အားလုံးကို
    // ဒီမှာပဲ swallow လုပ်ပြီး console ထဲမှာသာ မှတ်တမ်းတင်ပါတယ်
    console.warn("Webhook ပို့လို့မရပါ:", err.message || err);
  }
}