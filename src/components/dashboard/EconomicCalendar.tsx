"use client"

import { useEffect, useState } from "react"

export default function EconomicCalendar() {
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/economic-calendar")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEvents(data)
        } else {
          console.error("Invalid data:", data)
          setEvents([])
        }
      })
      .catch(err => {
        console.error("Fetch error:", err)
        setEvents([])
      })
  }, [])

  return (
    <div className="card p-5" style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Economic Calendar</h3>
        <span style={{ color: "#00D68F", fontSize: 12 }}>● Live</span>
      </div>

      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {events.length === 0 && (
          <div style={{ fontSize: 12, color: "#64748B" }}>No events</div>
        )}

        {events.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 12 }}>
            <div>
              <div>{e.event}</div>
              <div style={{ color: "#64748B" }}>
                {e.date ? new Date(e.date).toLocaleString() : ""}
              </div>
            </div>

            <span
              style={{
                color:
                  e.impact === "High"
                    ? "#FF4D6D"
                    : e.impact === "Medium"
                    ? "#FFB547"
                    : "#94A3B8"
              }}
            >
              {e.impact}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}