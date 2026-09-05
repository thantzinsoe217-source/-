export function formatKs(n) {
  return (n || 0).toLocaleString("en-US") + " Ks";
}

// ဒီနေ့ (today) ရဲ့ 00:00 startကို Date object အနေနဲ့ ပြန်ပေးသည် —
// Dashboard မှာ "ဒီနေ့" ဆိုတဲ့ query filter အတွက် သုံးရန်
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
