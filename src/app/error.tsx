"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-start gap-3 border-danger">
      <h1 className="text-2xl font-bold">Bir sorun oluştu</h1>
      <p>Sayfa yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.</p>
      <button type="button" className="btn-primary" onClick={reset}>Tekrar dene</button>
    </div>
  );
}
