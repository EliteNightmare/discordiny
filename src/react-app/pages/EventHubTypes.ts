export type EventActivity = { title: string; path: string };
export type HubEvent = { slug: string; title: string; eyebrow: string; description: string; cover_url: string; theme: string; start_at: string; end_at: string; cancelled_at: string | null; cancelled?: boolean; published: number | boolean; featured_slot: number; activities: EventActivity[]; status: "ACTIVE" | "UPCOMING" | "CONCLUDED" | "CANCELLED" };
export const eventImage = (url: string) => url && (url.startsWith('/') && !url.startsWith('//') || /^https:\/\//i.test(url)) ? url : undefined;
export const displayDate = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
