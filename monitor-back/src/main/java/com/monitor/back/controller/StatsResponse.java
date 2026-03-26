package com.monitor.back.controller;

public class StatsResponse {

    public long totalEvents;
    public long eventsLast24h;
    public long totalDevices;
    public long recentEventsCount;

    public StatsResponse(long totalEvents, long eventsLast24h, long totalDevices, long recentEventsCount) {
        this.totalEvents = totalEvents;
        this.eventsLast24h = eventsLast24h;
        this.totalDevices = totalDevices;
        this.recentEventsCount = recentEventsCount;
    }
}