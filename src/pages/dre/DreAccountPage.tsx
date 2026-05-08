import type { User } from "@supabase/supabase-js";

import { DreLayout } from "@/components/dre/dre-layout";
import { ProductSubscriptionPanel } from "@/components/platform/product-subscription-panel";
import { DRE_PRODUCT_KEY } from "@/lib/dre-calculations";

export default function DreAccountPage() {
  return <DreLayout>{(user) => <DreAccountContent user={user} />}</DreLayout>;
}

function DreAccountContent({ user }: { user: User }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Minha Conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Estrutura preparada para assinatura e futura integracao Stripe.</p>
      </div>

      <ProductSubscriptionPanel userId={user.id} productSlug={DRE_PRODUCT_KEY} />
    </div>
  );
}
