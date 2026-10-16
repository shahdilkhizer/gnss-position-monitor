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

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

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
