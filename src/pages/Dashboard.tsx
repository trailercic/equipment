import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Nav from "@/components/Nav";
import AddVehicleForm from "@/components/AddVehicleForm";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_ORDER,
  DESTINATION_LABELS,
  type Vehicle,
  type VehicleStatus,
} from "@/lib/types";

export default function Dashboard() {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | VehicleStatus>("");
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const canAdd = profile?.role === "MAINTENANCE" || profile?.role === "ADMIN";
  const canChangeStatus = profile?.role === "FLEET" || profile?.role === "ADMIN";
  const canArchive = profile?.role === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter) query = query.eq("status", statusFilter);
    query = showArchived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null);

    const { data, error } = await query;
    if (!error && data) {
      setVehicles(data as Vehicle[]);
    }
    setLoading(false);
  }, [statusFilter, showArchived]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("dashboard-vehicles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = vehicles.filter((v) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      v.plate.toLowerCase().includes(needle) ||
      v.reason.toLowerCase().includes(needle) ||
      v.driver.toLowerCase().includes(needle)
    );
  });

  async function changeStatus(v: Vehicle, newStatus: VehicleStatus) {
    if (newStatus === v.status) return;
    const readyAt = newStatus === "READY" ? new Date().toISOString() : null;
    setVehicles((prev) =>
      prev.map((x) =>
        x.id === v.id ? { ...x, status: newStatus, ready_at: readyAt } : x
      )
    );
    await supabase
      .from("vehicles")
      .update({ status: newStatus, ready_at: readyAt })
      .eq("id", v.id);
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this vehicle? It will be moved out of the active list, but kept in the archive.")) return;
    const { error } = await supabase
      .from("vehicles")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } else {
      alert(error.message);
    }
  }

  async function handleRestore(id: string) {
    const { error } = await supabase
      .from("vehicles")
      .update({ archived_at: null })
      .eq("id", id);
    if (!error) {
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } else {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-slate-900">
            {showArchived ? "Archived vehicles" : "Vehicles in the shop"}
          </h1>
          {canAdd && !showArchived && <AddVehicleForm onAdded={load} />}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search (plate, driver, reason)..."
            className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | VehicleStatus)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {canArchive && (
            <label className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-slate-300"
              />
              Show archived
            </label>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No vehicles match your search.
          </p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Truck and Trailer</th>
                    <th className="px-4 py-3 font-medium">Driver</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">ETA</th>
                    <th className="px-4 py-3 font-medium">Problem</th>
                    <th className="px-4 py-3 font-medium">Comment</th>
                    <th className="px-4 py-3 font-medium">Destination</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {v.plate}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.driver}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(v.arrival_date).toLocaleDateString("en-US")}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.eta || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{v.reason}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={v.comment || ""}>
                        {v.comment || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {DESTINATION_LABELS[v.destination]}
                      </td>
                      <td className="px-4 py-3">
                        {canChangeStatus ? (
                          <select
                            value={v.status}
                            onChange={(e) =>
                              changeStatus(v, e.target.value as VehicleStatus)
                            }
                            className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${STATUS_COLORS[v.status].badge}`}
                          >
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`text-xs font-medium rounded-full px-2.5 py-1 ${STATUS_COLORS[v.status].badge}`}
                          >
                            {STATUS_LABELS[v.status]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {canArchive &&
                          (showArchived ? (
                            <button
                              onClick={() => handleRestore(v.id)}
                              className="text-brand-600 hover:underline text-xs font-medium"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchive(v.id)}
                              className="text-red-500 hover:underline text-xs font-medium"
                            >
                              Archive
                            </button>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
