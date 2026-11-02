import { redirect } from "next/navigation";

// The prototype opens straight on Sam's night; the other views are under "Other personas".
export default function Home() {
  redirect("/manager");
}
