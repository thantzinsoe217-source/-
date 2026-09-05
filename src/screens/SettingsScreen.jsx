import { useState, useEffect } from "react";
import { Webhook, Loader2, CheckCircle2 } from "lucide-react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function SettingsScreen({ setToast }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Firestore ထဲက /settings/webhook document ကို screen ဖွင့်တာနဲ့ တစ်ခါ ဖတ်ပါတယ်
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "webhook"));
        if (snap.exists()) setUrl(snap.data().url || "");
      } catch (err) {
        setToast({ error: "Settings ဖတ်လို့မရပါ" });
      } finally {
        setLoading(false);
      }
    })();
  }, [setToast]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "webhook"), { url: url.trim() });
      setToast({ message: "Webhook URL ကို သိမ်းပြီးပါပြီ" });
    } catch (err) {
      setToast({ error: "သိမ်းလို့မရပါ — ထပ်ကြိုးစားကြည့်ပါ" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-orange-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Webhook className="w-5 h-5 text-orange-600" />
          <h2 className="text-base font-bold text-stone-800">n8n Webhook</h2>
        </div>
        <p className="text-sm text-stone-400 mb-4">
          အရောင်းအသစ်တိုင်းကို ဒီ URL ဆီကို အလိုအလျောက် ပို့ပေးပါမည်။
        </p>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-n8n.domain/webhook/..."
            className="w-full h-12 px-4 rounded-xl border border-stone-200 text-stone-800 focus:outline-none focus:border-orange-400"
          />
          <button
            type="submit"
            disabled={saving}
            className={`h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition
              ${saving ? "bg-stone-300 cursor-not-allowed" : "bg-orange-600 active:bg-orange-700"}`}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            သိမ်းမည်
          </button>
        </form>
      </div>
    </div>
  );
}