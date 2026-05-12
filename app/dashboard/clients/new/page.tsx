import { redirect } from "next/navigation";

export default function ClientsNewPage() {
  redirect("/dashboard/users/new");
}
