"use client";

import Link from "next/link";
import React from "react";

export type ActivityEvent = {
  id: string;
  type: "stream_created" | "stream_paused" | "stream_settled" | "funds_withdrawn" | "wallet_connected";
  title: string;
  timestamp: string;
  link?: string;
  status: "success" | "info" | "warning" | "accent";
};

export type ActivityGroup = {
  date: string;
  events: ActivityEvent[];
};

interface ActivityTimelineProps {
  groups: ActivityGroup[];
}

export const ActivityTimeline = ({ groups }: ActivityTimelineProps) => {
  return (
    <div className="activity-feed-wrap">
      {groups.map((group) => (
        <section key={group.date} className="activity-group">
          <h3 className="activity-group-title">{group.date}</h3>
          <ul className="activity-timeline">
            {group.events.map((event) => (
              <li key={event.id} className="activity-item">
                <div className="activity-marker">
                  <div className={`activity-dot activity-dot--${event.status}`} />
                  <div className="activity-line" />
                </div>
                <div className="activity-content">
                  <div className="activity-card">
                    <div className="activity-info">
                      <span className="activity-title">{event.title}</span>
                      <time className="activity-time">{event.timestamp}</time>
                    </div>
                    {event.link && (
                      <Link href={event.link} className="button button--secondary" style={{ minHeight: "2rem", padding: "0.4rem 0.8rem", fontSize: "0.8125rem" }}>
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export const ActivityTimelineSkeleton = () => {
  return (
    <div className="activity-feed-wrap" aria-hidden="true">
      {[1, 2].map((group) => (
        <div key={group} className="activity-group">
          <div className="skeleton" style={{ height: "0.75rem", width: "6rem", marginLeft: "2.5rem", marginBottom: "1rem" }} />
          <div className="activity-timeline">
            {[1, 2, 3].map((item) => (
              <div key={item} className="activity-item">
                <div className="activity-marker">
                  <div className="activity-dot" style={{ background: "var(--skeleton-base)" }} />
                  <div className="activity-line" style={{ background: "var(--skeleton-base)" }} />
                </div>
                <div className="activity-content">
                  <div className="activity-card" style={{ borderStyle: "dashed" }}>
                    <div className="activity-info">
                      <div className="skeleton" style={{ height: "1rem", width: "12rem", marginBottom: "0.5rem" }} />
                      <div className="skeleton" style={{ height: "0.75rem", width: "4rem" }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
