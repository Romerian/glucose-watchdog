"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { glucoseReadings, type GlucoseReading } from "../lib/glucose-data";
import {
  calculateAverage,
  calculateTimeInRange,
  classifyGlucose,
  formatGlucoseTime,
  getTrend,
} from "../lib/glucose-business";

type RangeKey = "3H" | "6H" | "12H" | "24H";

const ranges: Record<RangeKey, number> = { "3H": 12, "6H": 18, "12H": 24, "24H": 30 };

function PawMark() {
  return (
    <span className="paw-mark" aria-hidden="true">
      <i /><i /><i /><b />
    </span>
  );
}

export default function Home() {
  const [range, setRange] = useState<RangeKey>("12H");
  const [activeNav, setActiveNav] = useState("Overview");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>([]);

  const visibleReadings = useMemo(() => glucoseReadings.slice(-ranges[range]), [range]);
  const latest = glucoseReadings.at(-1) as GlucoseReading;
  const previous = glucoseReadings.at(-2) as GlucoseReading;
  const status = classifyGlucose(latest.value);
  const trend = getTrend(latest.value, previous.value);
  const average = calculateAverage(visibleReadings);
  const inRange = calculateTimeInRange(visibleReadings);

  function saveNote() {
    const clean = note.trim();
    if (!clean) return;
    setSavedNotes((items) => [clean, ...items]);
    setNote("");
    setNoteOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setActiveNav("Overview")} aria-label="Glucose Watchdog home">
          <Image src="/glucose-watchdog-bulldog.png" alt="English bulldog icon" width={40} height={40} priority />
          <span>Glucose Watchdog</span>
        </button>
        <nav aria-label="Primary navigation">
          {["Overview", "Readings", "Insights"].map((item) => (
            <button key={item} className={activeNav === item ? "nav-active" : ""} onClick={() => setActiveNav(item)}>
              {item}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Notifications"><span className="bell" aria-hidden="true" /></button>
          <button className="profile-button" aria-label="Open profile">RD</button>
        </div>
      </header>

      <main>
        <section className="intro-row">
          <div>
            <p className="eyebrow"><span /> Live monitoring</p>
            <h1>{activeNav === "Overview" ? "Good afternoon, Romer." : activeNav}</h1>
            <p className="lede">Your glucose has stayed steady. Here’s the signal behind the number.</p>
          </div>
          <button className="add-button" onClick={() => setNoteOpen(true)}><span>＋</span> Add note</button>
        </section>

        <section className="dashboard-grid" aria-label="Glucose overview">
          <article className="hero-card">
            <div className="card-heading">
              <div>
                <p className="label">Current glucose</p>
                <p className="updated">Updated {formatGlucoseTime(latest.timestamp)}</p>
              </div>
              <div className={`status-pill ${status.tone}`}><span />{status.label}</div>
            </div>
            <div className="current-reading">
              <strong>{latest.value}</strong><span>mg/dL</span>
              <div className="trend"><b>{trend.symbol}</b>{trend.label}</div>
            </div>
            <div className="range-track" aria-label="Target range 70 to 180 milligrams per deciliter">
              <span className="range-low">70</span><span className="range-high">180</span>
              <i style={{ left: `${Math.min(94, Math.max(6, ((latest.value - 40) / 180) * 100))}%` }} />
            </div>
            <p className="range-caption">Target range <b>70–180 mg/dL</b></p>
          </article>

          <article className="metric-card teal-card">
            <div className="metric-icon"><PawMark /></div>
            <p className="label">Time in range</p>
            <strong>{inRange}%</strong>
            <p>Last {range.toLowerCase()}</p>
            <div className="progress"><i style={{ width: `${inRange}%` }} /></div>
          </article>

          <article className="metric-card">
            <div className="metric-icon coral"><span className="drop" /></div>
            <p className="label">Average glucose</p>
            <strong>{average}</strong><span className="unit">mg/dL</span>
            <p className="positive">↓ 4% from yesterday</p>
          </article>
        </section>

        <section className="content-grid">
          <article className="chart-card">
            <div className="section-heading">
              <div><p className="label">Glucose pattern</p><h2>Today’s curve</h2></div>
              <div className="range-buttons" aria-label="Chart range">
                {(Object.keys(ranges) as RangeKey[]).map((item) => <button key={item} className={range === item ? "selected" : ""} onClick={() => setRange(item)}>{item}</button>)}
              </div>
            </div>
            <div className="chart" role="img" aria-label={`Glucose chart for the last ${range.toLowerCase()}`}>
              <div className="target-band"><span>Target range</span></div>
              <div className="chart-bars">
                {visibleReadings.map((reading, index) => {
                  const height = Math.max(14, Math.min(94, ((reading.value - 55) / 110) * 100));
                  return <i key={reading.timestamp} className={index === visibleReadings.length - 1 ? "latest-bar" : ""} style={{ height: `${height}%` }} title={`${formatGlucoseTime(reading.timestamp)} · ${reading.value} mg/dL`} />;
                })}
              </div>
              <div className="chart-axis"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>Now</span></div>
            </div>
          </article>

          <aside className="insight-card">
            <div className="insight-top"><div className="watchdog-badge"><PawMark /></div><span>Watchdog insight</span></div>
            <h2>Looking steady.</h2>
            <p>Your glucose has stayed within target for most of this window. A small rise after lunch is settling naturally.</p>
            <div className="insight-callout"><span className="spark">✦</span><div><b>Keep it going</b><p>A short walk after your next meal may help maintain this pattern.</p></div></div>
          </aside>
        </section>

        <section className="recent-card">
          <div className="section-heading"><div><p className="label">Data layer</p><h2>Recent readings</h2></div><button onClick={() => setActiveNav("Readings")}>View all →</button></div>
          <div className="reading-list">
            {glucoseReadings.slice(-4).reverse().map((reading, index) => {
              const itemStatus = classifyGlucose(reading.value);
              return <div className="reading-row" key={reading.timestamp}><div><span className={`reading-dot ${itemStatus.tone}`} /> <b>{formatGlucoseTime(reading.timestamp)}</b></div><span>{index === 0 ? "Latest sensor reading" : "Continuous monitor"}</span><strong>{reading.value} <small>mg/dL</small></strong></div>;
            })}
          </div>
          {savedNotes.length > 0 && <div className="saved-notes"><p className="label">Your notes</p>{savedNotes.map((item, index) => <p key={`${item}-${index}`}>“{item}”</p>)}</div>}
        </section>
      </main>

      {noteOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setNoteOpen(false)}><section className="note-modal" role="dialog" aria-modal="true" aria-labelledby="note-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setNoteOpen(false)} aria-label="Close">×</button><p className="eyebrow"><span /> Journal entry</p><h2 id="note-title">Add a glucose note</h2><p>Capture a meal, medication, exercise, or how you feel.</p><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What happened?" autoFocus /><div className="modal-actions"><button onClick={() => setNoteOpen(false)}>Cancel</button><button className="save-button" onClick={saveNote}>Save note</button></div></section></div>}
    </div>
  );
}
