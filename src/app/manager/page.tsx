import { Suspense } from "react";
import { ManagerApp } from "./manager-app";

export default function ManagerPage() {
  return (
    <Suspense>
      <ManagerApp />
    </Suspense>
  );
}
