export interface LocationPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

export interface UserState {
  user_id: string;
  user_name: string;
  role: string;
  is_online: boolean;
  last_location?: LocationPoint;
  last_updated: number;
  battery?: number;
}

const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "";
    }
  }
  return "http://localhost:8000";
};

const getWsBase = (): string => {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== "undefined") {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.host}`;
    }
  }
  return "ws://localhost:8000";
};

export const API_BASE = getApiBase();
export const WS_BASE = getWsBase();

export async function fetchUsers(): Promise<UserState[]> {
  try {
    const res = await fetch(`${API_BASE}/api/users`);
    if (!res.ok) throw new Error("Failed to fetch users");
    return await res.json();
  } catch (err) {
    console.error("fetchUsers error:", err);
    return [];
  }
}

export async function fetchUserHistory(userId: string): Promise<LocationPoint[]> {
  try {
    const res = await fetch(`${API_BASE}/api/history/${userId}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("fetchUserHistory error:", err);
    return [];
  }
}
