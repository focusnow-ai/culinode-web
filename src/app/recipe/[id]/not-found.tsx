import Link from "next/link";
import { BowlFood } from "@phosphor-icons/react/ssr";
import { StatusPage } from "@/components/StatusPage";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <StatusPage icon={BowlFood} title="Recipe unavailable" actions={<Link href="/" className="btn-primary">Back to Discover</Link>}>
      {t.states.notFound}
    </StatusPage>
  );
}
