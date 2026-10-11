// İlk UI dili Türkçe; metinler tek sözlükte, yerelleştirmeye hazır.
import type { Unit } from "./api/client";

export const tr = {
  appName: "Culinode",
  tagline: "Şefin özel tarif defteri",
  nav: {
    discover: "Keşfet",
    notebook: "Defterim",
    favorites: "Favoriler",
    notifications: "Bildirimler",
    account: "Hesap",
    signIn: "Giriş yap",
    signOut: "Çıkış",
    moderation: "Moderasyon",
  },
  states: {
    loading: "Yükleniyor…",
    empty: "Henüz bir şey yok.",
    error: "Bir sorun oluştu.",
    retry: "Tekrar dene",
    unauthorized: "Bu sayfa için giriş yapmalısınız.",
    forbidden: "Bu içeriğe erişim yetkiniz yok.",
    notFound: "Aradığınız içerik bulunamadı veya yayından kaldırıldı.",
    offline: "Bağlantı yok. Değişiklikler kaydedilmedi.",
  },
  recipe: {
    title: "Tarif adı",
    description: "Açıklama",
    yield: "Porsiyon / çıktı",
    prep: "Hazırlık (dk)",
    cook: "Pişirme (dk)",
    ingredients: "Malzemeler",
    steps: "Yapılışı",
    tags: "Etiketler",
    privateNote: "Özel not (yalnız siz görürsünüz)",
    cover: "Kapak fotoğrafı",
    toTaste: "gerektiği kadar",
    addIngredient: "Malzeme ekle",
    addStep: "Adım ekle",
    save: "Kaydet",
    saving: "Kaydediliyor…",
    saved: "Kaydedildi",
    unsaved: "Kaydedilmedi",
    delete: "Sil",
    minutes: "dk",
    copiedFrom: "Kaynak",
  },
  publish: {
    publish: "Yayınla",
    update: "Yayını güncelle",
    unpublish: "Yayından kaldır",
    published: "Yayında",
    unpublished: "Özel",
    copyAllowed: "Okuyucular deftere kopyalayabilsin",
    draftNewer: "Taslakta yayınlanmamış değişiklikler var.",
    copyNotRepublishable: "Kopyalanan tarifler yeniden yayınlanamaz.",
  },
  conflict: {
    title: "Tarif başka bir yerde değişti",
    body: "Sunucudaki sürüm sizin düzenlemenizden farklı. Hiçbir sürüm silinmedi.",
    useRemote: "Sunucudaki sürümü kullan",
    keepLocalAsNew: "Benim sürümümü yeni tarif olarak sakla",
    overwrite: "Benim sürümümle üzerine yaz",
  },
} as const;

export const unitLabels: Record<Unit, string> = {
  g: "g",
  kg: "kg",
  mg: "mg",
  ml: "ml",
  l: "l",
  tsp: "çay kaşığı",
  tbsp: "yemek kaşığı",
  cup: "su bardağı",
  piece: "adet",
  pinch: "tutam",
  slice: "dilim",
  clove: "diş",
  bunch: "demet",
  can: "kutu",
  pack: "paket",
  cm: "cm",
  serving: "servis",
  portion: "porsiyon",
  other: "",
};

export function formatQuantity(q: { amount?: number | null; unit?: Unit | null; toTaste: boolean }): string {
  if (q.toTaste && (q.amount == null)) return tr.recipe.toTaste;
  const amount = q.amount == null ? "" : new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(q.amount);
  const unit = q.unit ? unitLabels[q.unit] : "";
  return [amount, unit, q.toTaste ? `(${tr.recipe.toTaste})` : ""].filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(iso));
}

export function problemMessage(code: string | undefined, fallback?: string): string {
  switch (code) {
    case "network":
      return tr.states.offline;
    case "unauthenticated":
      return "Oturumunuzun süresi doldu. Lütfen yeniden giriş yapın.";
    case "forbidden":
      return tr.states.forbidden;
    case "not-found":
      return tr.states.notFound;
    case "revision-conflict":
      return tr.conflict.title;
    case "rate-limited":
      return "Çok fazla istek gönderildi; biraz sonra tekrar deneyin.";
    case "not-publishable":
      return "Tarif yayın için eksik.";
    case "media-not-ready":
      return "Fotoğraf henüz işlenmedi; biraz sonra tekrar deneyin.";
    case "copy-not-allowed":
      return "Yazar bu tarifin kopyalanmasına izin vermiyor.";
    case "blocked":
      return "Bu kullanıcıyla etkileşim kuramazsınız.";
    case "account-restricted":
      return "Hesabınız public etkileşim için kısıtlandı.";
    case "account-deleting":
      return "Hesap silme işlemi sürüyor.";
    case "recent-login-required":
      return "Bu işlem için yeniden giriş yapmanız gerekiyor.";
    default:
      return fallback ?? tr.states.error;
  }
}
