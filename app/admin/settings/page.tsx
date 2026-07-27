import { getSystemSettings } from "@/app/actions/admin-settings";
import AdminSettingsClient from "@/app/components/admin/AdminSettingsClient";

export default async function AdminSettingsPage() {
  const result = await getSystemSettings();
  const settings = result.success ? result.data : {};

  return <AdminSettingsClient initialSettings={settings} />;
}