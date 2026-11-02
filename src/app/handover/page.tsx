import { Suspense } from "react";
import { HandoverView } from "@/components/readers";

export default function Page() {
  return (
    <Suspense>
      <HandoverView />
    </Suspense>
  );
}
