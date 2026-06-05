import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clapperboard } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge, Card } from "@/components/ui/primitives";
import { PromoPlayer } from "@/components/promo/promo-player";

export const metadata: Metadata = {
  title: "Intro — VitalChain in 10 seconds",
  description:
    "An animated overview of VitalChain: pharma supply-chain intelligence across track & trace, cold chain, quality/NSQ, QMS, warehouse, inventory and compliance.",
  alternates: { canonical: "/intro" },
};

export default function IntroPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="VitalChain in 10 seconds"
        subtitle="An animated tour of the platform — rendered live with Remotion"
        icon={<Clapperboard size={22} />}
      >
        <Badge tone="brand" pulse>
          Motion
        </Badge>
      </PageHeader>

      <Card className="p-3 sm:p-4">
        <PromoPlayer />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          Every frame is generated in React — no video file, fully responsive, and it inherits the
          app&apos;s type and color system.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand)]/12 px-4 py-2.5 text-sm font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)]/20"
        >
          Enter the command center <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
