import { Suspense } from "react";
import { StaffApp } from "./staff-app";

export default function StaffPage() {
  return (
    <Suspense>
      <StaffApp />
    </Suspense>
  );
}
