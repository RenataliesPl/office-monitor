export interface Status {
    id: string;
    temperature: number | null;
    humidity: number | null;
    lastUpdated: string | null;
}

export interface EventItem {
    id?: number;
    type?: string;
    sensor?: string;
    payload?: string;
    timestamp?: string;
}

export interface Stats {
    totalEvents: number;
    eventsLast24h: number;
    totalDevices: number;
    recentEventsCount: number;
}