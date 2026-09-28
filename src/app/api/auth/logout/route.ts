import { jsonOk } from "@/lib/api";
import { logout } from "@/services/auth";

export async function POST() {
  await logout();
  return jsonOk({ success: true });
}
