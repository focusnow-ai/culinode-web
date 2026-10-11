import Link from "next/link";
import { tr } from "@/lib/i18n";

export default function NotFound() {
  return (
    <div className="card flex flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">Tarif erişilemiyor</h1>
      <p>{tr.states.notFound}</p>
      <Link href="/" className="btn-primary">Keşfete dön</Link>
    </div>
  );
}
