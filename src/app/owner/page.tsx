import { Suspense } from "react";
import { OwnerView } from "@/components/readers";

export default function Page() {
  return (
    <Suspense>
      <OwnerView />
    </Suspense>
  );
}
