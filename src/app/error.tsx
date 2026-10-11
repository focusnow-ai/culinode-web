"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-start gap-3 border-danger">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p>The page could not be loaded. Check your connection and try again.</p>
      <button type="button" className="btn-primary" onClick={reset}>Try again</button>
    </div>
  );
}
