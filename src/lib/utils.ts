export function formatDuration(ms?: number | null): string {
  if (!ms || !isFinite(ms) || ms <= 0) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatTotalDuration(ms: number): string {
  if (!ms || ms <= 0) return "";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** Upgrade iTunes artwork URL to a larger size. */
export function artwork(url: string | undefined | null, size = 600): string {
  if (!url) return "";
  return url.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`);
}

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
