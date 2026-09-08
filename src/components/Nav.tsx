import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/types";

export default function Nav() {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const linkClass = (href: string) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      location.pathname === href
        ? "bg-brand-600 text-white"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 mr-4">Equipment Coming</span>
          <Link to="/dashboard" className={linkClass("/dashboard")}>
            Vehicles
          </Link>
          <Link to="/board" className={linkClass("/board")} target="_blank">
            TV Board
          </Link>
          {profile?.role === "ADMIN" && (
            <Link to="/admin/users" className={linkClass("/admin/users")}>
              Users
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:inline">
            {profile?.full_name}{" "}
            {profile ? `(${ROLE_LABELS[profile.role]})` : ""}
          </span>
          <button
            onClick={() => signOut()}
            className="text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
