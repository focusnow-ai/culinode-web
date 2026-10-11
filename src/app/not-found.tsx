import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { StatusPage } from "@/components/StatusPage";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <StatusPage icon={MagnifyingGlass} title="Page not found" actions={<Link href="/" className="btn-primary">Home</Link>}>
      {t.states.notFound}
    </StatusPage>
  );
}
