import { Suspense } from "react";
import { InsurerView } from "@/components/readers";

export default function Page() {
  return (
    <Suspense>
      <InsurerView />
    </Suspense>
  );
}
