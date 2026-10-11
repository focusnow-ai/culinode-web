import Link from "next/link";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <div className="card flex flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">Recipe unavailable</h1>
      <p>{t.states.notFound}</p>
      <Link href="/" className="btn-primary">Back to Discover</Link>
    </div>
  );
}
