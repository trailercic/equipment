export type Role = "ADMIN" | "MAINTENANCE" | "FLEET";

export type VehicleStatus = "ARRIVING" | "ARRIVED" | "READY";

export type Destination = "SOHO" | "MEPA";

export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  role: Role;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  driver: string;
  arrival_date: string;
  eta: string | null;
  reason: string;
  comment: string | null;
  destination: Destination;
  status: VehicleStatus;
  ready_at: string | null;
  archived_at: string | null;
  created_by: string | null;
  status_updated_by: string | null;
  gps_distance_miles: number | null;
  gps_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  MAINTENANCE: "Maintenance",
  FLEET: "Fleet",
};

// Order matters - used to sort the board and to know what "next status" is.
export const STATUS_ORDER: VehicleStatus[] = ["ARRIVING", "ARRIVED", "READY"];

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  ARRIVING: "Arriving",
  ARRIVED: "Arrived",
  READY: "Ready",
};

// Shared color tokens: red = arriving, orange = arrived, green = ready
export const STATUS_COLORS: Record<
  VehicleStatus,
  { badge: string; dot: string; solid: string }
> = {
  ARRIVING: { badge: "bg-red-100 text-red-700", dot: "bg-red-500", solid: "bg-red-600" },
  ARRIVED: { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500", solid: "bg-orange-600" },
  READY: { badge: "bg-green-100 text-green-700", dot: "bg-green-500", solid: "bg-green-600" },
};

export const DESTINATION_LABELS: Record<Destination, string> = {
  SOHO: "Arriving to SOHO",
  MEPA: "Arriving to MEPA",
};
