import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Destination } from "@/lib/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddVehicleForm({ onAdded }: { onAdded: () => void }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [driver, setDriver] = useState("");
  const [arrivalDate, setArrivalDate] = useState(todayISO());
  const [eta, setEta] = useState("");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [destination, setDestination] = useState<Destination>("SOHO");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!plate.trim() || !driver.trim() || !arrivalDate || !reason.trim()) {
      setError("Truck and trailer, driver, date and problem are required.");
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("vehicles").insert({
      plate: plate.trim().toUpperCase(),
      driver: driver.trim(),
      arrival_date: arrivalDate,
      eta: eta.trim() || null,
      reason: reason.trim(),
      comment: comment.trim() || null,
      destination,
      status: "ARRIVING",
      created_by: session?.user.id,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setPlate("");
    setDriver("");
    setArrivalDate(todayISO());
    setEta("");
    setReason("");
    setComment("");
    setDestination("SOHO");
    setOpen(false);
    onAdded();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2"
      >
        + Report vehicle arrival
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-xl p-5 mb-4 space-y-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">New vehicle</h2>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Truck and Trailer *
          </label>
          <input
            required
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. 1234/567890"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Driver *
          </label>
          <input
            required
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Driver name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Destination *
          </label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value as Destination)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="SOHO">Arriving to SOHO</option>
            <option value="MEPA">Arriving to MEPA</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Date *
          </label>
          <input
            required
            type="date"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            ETA
          </label>
          <input
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. 3:00 PM"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Problem (reason for arrival) *
          </label>
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Brake repair"
          />
        </div>
        <div className="sm:col-span-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Additional notes..."
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-slate-600 text-sm font-medium rounded-lg px-4 py-2 border border-slate-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
