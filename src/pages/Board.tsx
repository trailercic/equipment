import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  DESTINATION_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_ORDER,
  type Vehicle,
} from "@/lib/types";

function isToday(isoString: string) {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function Row({ v }: { v: Vehicle }) {
  const colors = STATUS_COLORS[v.status];
  return (
    <div className="flex items-center gap-4 bg-slate-800 rounded-xl px-5 py-3">
      <span
        className={`shrink-0 w-4 h-4 rounded-full ${colors.dot}`}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-2xl font-bold text-white tracking-wide">
            {v.plate}
          </span>
          <span className="text-slate-400 text-lg">
            Driver: {v.driver}
          </span>
        </div>
        <div className="text-slate-400 text-lg">
          {v.reason} · {DESTINATION_LABELS[v.destination]}
        </div>
      </div>
      <div className="text-right shrink-0">
        <span
          className={`inline-block text-sm font-semibold rounded-full px-3 py-1 ${colors.badge}`}
        >
          {STATUS_LABELS[v.status]}
        </span>
        <div className="text-slate-400 text-base tabular-nums mt-1">
          {v.eta && <span>ETA {v.eta} · </span>}
          {new Date(v.arrival_date).toLocaleDateString("en-US")}
        </div>
      </div>
    </div>
  );
}

// Koliko piksela u sekundi se tabla auto-skroluje kad lista ne stane na ekran.
const SCROLL_SPEED_PX_PER_SEC = 40;

export default function Board() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [now, setNow] = useState(new Date());
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollDuration, setScrollDuration] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: true });
    if (!error && data) setVehicles(data as Vehicle[]);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("board-vehicles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        () => load()
      )
      .subscribe();

    // Backup refresh in case the realtime connection drops (e.g. TV left on overnight)
    const poll = setInterval(load, 30000);
    const clock = setInterval(() => setNow(new Date()), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  // Ready vehicles drop off the live board once the day changes - they stay
  // in the database (and on the Dashboard) as history, just not shown here.
  const visible = vehicles
    .filter((v) => v.status !== "READY" || (v.ready_at && isToday(v.ready_at)))
    .sort((a, b) => {
      const order = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      if (order !== 0) return order;
      // Whoever arrives first goes on top: arrival date first, then ETA.
      const dateCompare = a.arrival_date.localeCompare(b.arrival_date);
      if (dateCompare !== 0) return dateCompare;
      return (a.eta || "").localeCompare(b.eta || "");
    });

  // Ako lista ne stane na ekran, umesto scroll bara pustimo je da se
  // beskonačno i glatko "vrti" u krug (lista se duplira, pa se animacijom
  // pomera za tačno pola svoje visine, što izgleda kao neprekidna petlja).
  useEffect(() => {
    const wrap = wrapRef.current;
    const list = listRef.current;
    if (!wrap || !list) return;

    const measure = () => {
      const contentHeight = list.scrollHeight;
      const wrapHeight = wrap.clientHeight;
      if (contentHeight > wrapHeight + 1) {
        setScrollDuration(contentHeight / SCROLL_SPEED_PX_PER_SEC);
      } else {
        setScrollDuration(null);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(list);
    return () => ro.disconnect();
  }, [visible.length]);

  return (
    <div className="h-screen bg-slate-950 flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-white">Equipment Coming</h1>
        <div className="text-2xl text-slate-400 tabular-nums">
          {now.toLocaleTimeString("en-US")}
        </div>
      </div>

      <div ref={wrapRef} className="flex-1 min-h-0 overflow-hidden">
        {visible.length === 0 ? (
          <p className="text-slate-500 text-xl text-center py-10">
            — no vehicles —
          </p>
        ) : (
          <div
            className="flex flex-col gap-3"
            style={
              scrollDuration
                ? { animation: `board-scroll ${scrollDuration}s linear infinite` }
                : undefined
            }
          >
            <div ref={listRef} className="flex flex-col gap-3">
              {visible.map((v) => (
                <Row key={v.id} v={v} />
              ))}
            </div>
            {scrollDuration && (
              <div className="flex flex-col gap-3" aria-hidden="true">
                {visible.map((v) => (
                  <Row key={`dup-${v.id}`} v={v} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
