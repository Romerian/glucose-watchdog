"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { glucoseReadings, insulinDoses, type GlucoseReading, type InsulinDose, type InsulinType } from "../lib/glucose-data";
import {
  calculateAverage,
  calculateTimeInRange,
  classifyGlucose,
  formatLongDate,
  formatGlucoseTime,
  getGlucoseWarning,
  getTrend,
  WARNING_REMINDER_MS,
  type GlucoseWarning,
} from "../lib/glucose-business";

type HoveredPoint = { kind: "glucose"; x: number; y: number; reading: GlucoseReading } | { kind: "insulin"; x: number; y: number; dose: InsulinDose };
type WarningRecord = GlucoseWarning & { id: string; timestamp: string; value: number; acknowledgedAt?: string };

const chartX = (index: number) => 32 + (index / 23) * 656;
const chartY = (value: number) => 222 - ((Math.min(220, Math.max(40, value)) - 40) / 180) * 194;
const insulinChartX = (timestamp: string) => {
  const time = new Date(timestamp);
  return 32 + ((time.getHours() + time.getMinutes() / 60) / 23) * 656;
};
const insulinChartY = (units: number, axisMax: number) => 222 - (units / axisMax) * 194;

function formatInsulinDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
}

function localDateTimeNow() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function PawMark() {
  return (
    <span className="paw-mark" aria-hidden="true">
      <i /><i /><i /><b />
    </span>
  );
}

export default function Home() {
  const [selectedDay, setSelectedDay] = useState(6);
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);
  const [activeNav, setActiveNav] = useState("Overview");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>([]);
  const [userReadings, setUserReadings] = useState<GlucoseReading[]>([]);
  const [readingOpen, setReadingOpen] = useState(false);
  const [readingInput, setReadingInput] = useState("");
  const [readingDateTime, setReadingDateTime] = useState(localDateTimeNow);
  const [userInsulinDoses, setUserInsulinDoses] = useState<InsulinDose[]>([]);
  const [insulinOpen, setInsulinOpen] = useState(false);
  const [insulinInput, setInsulinInput] = useState("");
  const [insulinType, setInsulinType] = useState<InsulinType>("Bolus");
  const [insulinDateTime, setInsulinDateTime] = useState(localDateTimeNow);
  const [insulinDurationInput, setInsulinDurationInput] = useState("8");
  const [insulinDurationUnit, setInsulinDurationUnit] = useState<"minutes" | "hours">("hours");
  const [activeWarning, setActiveWarning] = useState<WarningRecord | null>(null);
  const [warningHistory, setWarningHistory] = useState<WarningRecord[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => glucoseReadings.slice(index * 24, index * 24 + 24)), []);
  const visibleReadings = days[selectedDay];
  const allDoses = [...insulinDoses, ...userInsulinDoses].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const visibleDate = formatLongDate(visibleReadings[0].timestamp);
  const visibleDoses = allDoses.filter((dose) => formatLongDate(dose.timestamp) === visibleDate);
  const insulinAxisMax = Math.max(10, Math.ceil(Math.max(0, ...visibleDoses.map((dose) => dose.units)) / 5) * 5);
  const insulinAxisTicks = [0, insulinAxisMax / 2, insulinAxisMax];
  const allReadings = [...glucoseReadings, ...userReadings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const latest = allReadings.at(-1) as GlucoseReading;
  const previous = (allReadings.at(-2) ?? latest) as GlucoseReading;
  const status = classifyGlucose(latest.value);
  const trend = getTrend(latest.value, previous.value);
  const average = calculateAverage(visibleReadings);
  const inRange = calculateTimeInRange(visibleReadings);

  useEffect(() => {
    const lastWarning = warningHistory[0];
    if (!lastWarning?.acknowledgedAt || getGlucoseWarning(latest.value) === null) return;
    const timeout = window.setTimeout(() => {
      const warning = getGlucoseWarning(latest.value);
      if (!warning) return;
      const reminder = { ...warning, id: crypto.randomUUID(), timestamp: new Date().toISOString(), value: latest.value };
      setWarningHistory((items) => [reminder, ...items]);
      setActiveWarning(reminder);
    }, WARNING_REMINDER_MS);
    return () => window.clearTimeout(timeout);
  }, [latest.value, warningHistory]);

  function saveNote() {
    const clean = note.trim();
    if (!clean) return;
    setSavedNotes((items) => [clean, ...items]);
    setNote("");
    setNoteOpen(false);
  }

  function saveReading() {
    const value = Number(readingInput);
    const timestamp = new Date(readingDateTime);
    if (!Number.isFinite(value) || value < 20 || value > 500 || Number.isNaN(timestamp.getTime())) return;
    const reading = { value, timestamp: timestamp.toISOString() };
    setUserReadings((items) => [...items, reading]);
    setReadingInput("");
    setReadingDateTime(localDateTimeNow());
    setReadingOpen(false);
    const warning = getGlucoseWarning(value);
    if (warning) {
      const record = { ...warning, id: crypto.randomUUID(), timestamp: reading.timestamp, value };
      setWarningHistory((items) => [record, ...items]);
      setActiveWarning(record);
    }
  }

  function saveInsulinDose() {
    const units = Number(insulinInput);
    const timestamp = new Date(insulinDateTime);
    const durationValue = Number(insulinDurationInput);
    const durationMinutes = insulinDurationUnit === "hours" ? durationValue * 60 : durationValue;
    const invalidDuration = insulinType === "Basal" && (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 720);
    if (!Number.isFinite(units) || units <= 0 || units > 200 || Number.isNaN(timestamp.getTime()) || invalidDuration) return;
    setUserInsulinDoses((items) => [...items, { type: insulinType, units, timestamp: timestamp.toISOString(), ...(insulinType === "Basal" ? { durationMinutes } : {}) }]);
    setInsulinInput("");
    setInsulinType("Bolus");
    setInsulinDateTime(localDateTimeNow());
    setInsulinDurationInput("8");
    setInsulinDurationUnit("hours");
    setInsulinOpen(false);
  }

  function acknowledgeWarning() {
    if (!activeWarning) return;
    const acknowledgedAt = new Date().toISOString();
    setWarningHistory((items) => items.map((item) => item.id === activeWarning.id ? { ...item, acknowledgedAt } : item));
    setActiveWarning(null);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setActiveNav("Overview")} aria-label="Glucose Watchdog home">
          <Image src="/glucose-watchdog-bulldog.png" alt="English bulldog icon" width={40} height={40} priority unoptimized />
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
          <button className="icon-button notification-button" aria-label="Warning history" onClick={() => setNotificationsOpen((open) => !open)}><span className="bell" aria-hidden="true" />{warningHistory.length > 0 && <i>{warningHistory.length}</i>}</button>
          <button className="profile-button" aria-label="Open profile">RD</button>
        </div>
        {notificationsOpen && <aside className="notification-panel" aria-label="Warning history"><div><b>Warning history</b><button onClick={() => setNotificationsOpen(false)} aria-label="Close warning history">×</button></div>{warningHistory.length === 0 ? <p>No warnings recorded.</p> : warningHistory.map((warning) => <article key={warning.id} className={warning.severity}><b>{warning.title}</b><span>{warning.value} mg/dL · {formatLongDate(warning.timestamp)} · {formatGlucoseTime(warning.timestamp)}</span><p>{warning.acknowledgedAt ? `Acknowledged ${formatGlucoseTime(warning.acknowledgedAt)}` : "Acknowledgement required"}</p></article>)}</aside>}
      </header>

      <main>
        <section className="intro-row">
          <div>
            <p className="eyebrow"><span /> Live monitoring</p>
            <h1>{activeNav === "Overview" ? "Good afternoon, Romer." : activeNav}</h1>
            <p className="lede">Your glucose has stayed steady. Here’s the signal behind the number.</p>
          </div>
          <div className="intro-actions"><button className="secondary-button" onClick={() => setNoteOpen(true)}>Add note</button><button className="secondary-button" onClick={() => { setInsulinDateTime(localDateTimeNow()); setInsulinOpen(true); }}><span>＋</span> Add insulin</button><button className="add-button" onClick={() => { setReadingDateTime(localDateTimeNow()); setReadingOpen(true); }}><span>＋</span> Add reading</button></div>
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
            <div className="range-track" aria-label="Normal range 80 to 115 milligrams per deciliter">
              <span className="range-low">80</span><span className="range-high">115</span>
              <i style={{ left: `${Math.min(94, Math.max(6, ((latest.value - 40) / 180) * 100))}%` }} />
            </div>
            <p className="range-caption">Normal range <b>80–115 mg/dL</b></p>
          </article>

          <article className="metric-card teal-card">
            <div className="metric-icon"><PawMark /></div>
            <p className="label">Time in range</p>
            <strong>{inRange}%</strong>
            <p>{formatLongDate(visibleReadings[0].timestamp)}</p>
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
              <div><p className="label">24-hour glucose trend</p><h2>{formatLongDate(visibleReadings[0].timestamp)}</h2></div>
              <div className="chart-nav" aria-label="Select chart day">
                <button onClick={() => setSelectedDay((day) => Math.max(0, day - 1))} disabled={selectedDay === 0} aria-label="Previous day">←</button>
                <span>Day {selectedDay + 1} of 7</span>
                <button onClick={() => setSelectedDay((day) => Math.min(6, day + 1))} disabled={selectedDay === 6} aria-label="Next day">→</button>
              </div>
            </div>
            <div className="day-strip" aria-label="Seven days of glucose data">
              {days.map((day, index) => <button key={day[0].timestamp} className={selectedDay === index ? "selected" : ""} onClick={() => setSelectedDay(index)}><span>{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(day[0].timestamp))}</span>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(day[0].timestamp))}</button>)}
            </div>
            <div className="chart" onMouseLeave={() => setHoveredPoint(null)}>
              <svg viewBox="0 0 720 250" role="img" aria-label={`Glucose readings in milligrams per deciliter and insulin dosage in units for ${formatLongDate(visibleReadings[0].timestamp)} from 00:00 through 23:00`}>
                <text className="axis-title glucose-axis-title" x="32" y="12">Glucose (mg/dL)</text>
                <text className="axis-title insulin-axis-title" x="688" y="12" textAnchor="end">Insulin (units)</text>
                <rect className="zone zone-high" x="32" y={chartY(220)} width="656" height={chartY(180) - chartY(220)} />
                <rect className="zone zone-normal" x="32" y={chartY(115)} width="656" height={chartY(80) - chartY(115)} />
                <rect className="zone zone-low" x="32" y={chartY(70)} width="656" height={chartY(40) - chartY(70)} />
                {[40, 70, 80, 115, 180].map((value) => <g key={value}><line className="grid-line" x1="32" x2="688" y1={chartY(value)} y2={chartY(value)} /><text className="axis-label" x="27" y={chartY(value) + 3} textAnchor="end">{value}</text></g>)}
                <line className="insulin-axis" x1="688" x2="688" y1="28" y2="222" />
                {insulinAxisTicks.map((value) => <g key={value}><line className="insulin-axis-tick" x1="688" x2="694" y1={insulinChartY(value, insulinAxisMax)} y2={insulinChartY(value, insulinAxisMax)} /><text className="axis-label insulin-axis-label" x="699" y={insulinChartY(value, insulinAxisMax) + 3}>{value}</text></g>)}
                <text className="zone-label" x="680" y={chartY(196)}>HIGH 180–400</text>
                <text className="zone-label" x="680" y={chartY(93)}>NORMAL 80–115</text>
                <text className="zone-label" x="680" y={chartY(55)}>LOW 40–70</text>
                <polyline className="glucose-line" points={visibleReadings.map((reading, index) => `${chartX(index)},${chartY(reading.value)}`).join(" ")} />
                {visibleReadings.map((reading, index) => <circle key={reading.timestamp} className="glucose-point" cx={chartX(index)} cy={chartY(reading.value)} r="4.5" tabIndex={0} aria-label={`${reading.value} milligrams per deciliter on ${formatLongDate(reading.timestamp)} at ${formatGlucoseTime(reading.timestamp)}`} onMouseEnter={() => setHoveredPoint({ kind: "glucose", x: chartX(index), y: chartY(reading.value), reading })} onFocus={() => setHoveredPoint({ kind: "glucose", x: chartX(index), y: chartY(reading.value), reading })} />)}
                {visibleDoses.filter((dose) => dose.type === "Basal" && dose.durationMinutes).map((dose) => { const startX = insulinChartX(dose.timestamp); const endX = Math.min(688, startX + ((dose.durationMinutes as number) / (23 * 60)) * 656); const y = insulinChartY(dose.units, insulinAxisMax); return <line key={`${dose.timestamp}-duration`} className="basal-duration-line" x1={startX} x2={endX} y1={y} y2={y} tabIndex={0} aria-label={`${formatInsulinDuration(dose.durationMinutes as number)} basal insulin duration beginning ${formatGlucoseTime(dose.timestamp)}`} onMouseEnter={() => setHoveredPoint({ kind: "insulin", x: startX, y, dose })} onFocus={() => setHoveredPoint({ kind: "insulin", x: startX, y, dose })} />; })}
                {visibleDoses.filter((dose) => dose.type === "Bolus").map((dose) => { const x = insulinChartX(dose.timestamp); const y = insulinChartY(dose.units, insulinAxisMax); const markerProps = { tabIndex: 0, "aria-label": `${dose.type}, ${dose.units} units of insulin on ${formatLongDate(dose.timestamp)} at ${formatGlucoseTime(dose.timestamp)}`, onMouseEnter: () => setHoveredPoint({ kind: "insulin" as const, x, y, dose }), onFocus: () => setHoveredPoint({ kind: "insulin" as const, x, y, dose }) }; return <rect key={`${dose.timestamp}-${dose.type}`} className="insulin-point" x={x - 5} y={y - 5} width="10" height="10" transform={`rotate(45 ${x} ${y})`} {...markerProps} />; })}
              </svg>
              {hoveredPoint && <div className="chart-tooltip" style={{ left: `${Math.min(78, Math.max(8, (hoveredPoint.x / 720) * 100))}%`, top: `${Math.max(5, (hoveredPoint.y / 250) * 100 - 24)}%` }}><b>{hoveredPoint.kind === "glucose" ? `${hoveredPoint.reading.value} mg/dL` : `${hoveredPoint.dose.type} · ${hoveredPoint.dose.units} units`}</b>{hoveredPoint.kind === "insulin" && hoveredPoint.dose.durationMinutes && <span>Duration: {formatInsulinDuration(hoveredPoint.dose.durationMinutes)}</span>}<span>{formatLongDate(hoveredPoint.kind === "glucose" ? hoveredPoint.reading.timestamp : hoveredPoint.dose.timestamp)}</span><span>{formatGlucoseTime(hoveredPoint.kind === "glucose" ? hoveredPoint.reading.timestamp : hoveredPoint.dose.timestamp)}</span></div>}
              <div className="chart-legend"><span><i className="legend-dot" /> Glucose · left axis</span><span><i className="legend-duration" /> Basal duration</span><span><i className="legend-insulin" /> Bolus · right axis</span><span>Times shown in HH:mm</span></div>
              <div className="chart-axis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
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
          <div className="section-heading"><div><p className="label">Data layer</p><h2>Recent entries</h2></div><button onClick={() => setActiveNav("Readings")}>View all →</button></div>
          <div className="entry-columns"><div><h3>Glucose readings</h3><div className="reading-list">
            {allReadings.slice(-4).reverse().map((reading, index) => {
              const itemStatus = classifyGlucose(reading.value);
              return <div className="reading-row" key={reading.timestamp}><div><span className={`reading-dot ${itemStatus.tone}`} /> <b>{formatGlucoseTime(reading.timestamp)}</b></div><span>{formatLongDate(reading.timestamp)} · {index === 0 ? "Latest reading" : "Monitor"}</span><strong>{reading.value} <small>mg/dL</small></strong></div>;
            })}
          </div></div><div><h3>Insulin deliveries</h3><div className="reading-list">{allDoses.slice(-4).reverse().map((dose) => <div className="reading-row insulin-row" key={`${dose.timestamp}-${dose.type}`}><div><i className={`legend-insulin ${dose.type === "Basal" ? "basal" : ""}`} /><b>{formatGlucoseTime(dose.timestamp)}</b></div><span>{formatLongDate(dose.timestamp)} · {dose.type}{dose.durationMinutes ? ` · ${formatInsulinDuration(dose.durationMinutes)}` : ""}</span><strong>{dose.units} <small>units</small></strong></div>)}</div></div></div>
          {savedNotes.length > 0 && <div className="saved-notes"><p className="label">Your notes</p>{savedNotes.map((item, index) => <p key={`${item}-${index}`}>“{item}”</p>)}</div>}
        </section>
      </main>

      {noteOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setNoteOpen(false)}><section className="note-modal" role="dialog" aria-modal="true" aria-labelledby="note-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setNoteOpen(false)} aria-label="Close">×</button><p className="eyebrow"><span /> Journal entry</p><h2 id="note-title">Add a glucose note</h2><p>Capture a meal, medication, exercise, or how you feel.</p><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What happened?" autoFocus /><div className="modal-actions"><button onClick={() => setNoteOpen(false)}>Cancel</button><button className="save-button" onClick={saveNote}>Save note</button></div></section></div>}
      {readingOpen && <div className="modal-backdrop" role="presentation"><section className="note-modal reading-modal" role="dialog" aria-modal="true" aria-labelledby="reading-title"><button className="modal-close" onClick={() => setReadingOpen(false)} aria-label="Close">×</button><p className="eyebrow"><span /> Glucose reading</p><h2 id="reading-title">Record a reading</h2><p>Enter the glucose level and when the reading was taken.</p><label htmlFor="glucose-value">Glucose level</label><div className="reading-input"><input id="glucose-value" inputMode="decimal" type="number" min="20" max="500" value={readingInput} onChange={(event) => setReadingInput(event.target.value)} autoFocus /><span>mg/dL</span></div><label htmlFor="glucose-datetime">Date and time</label><input className="datetime-input" id="glucose-datetime" type="datetime-local" value={readingDateTime} onChange={(event) => setReadingDateTime(event.target.value)} /><small>Warnings appear below 70 or above 180 mg/dL.</small><div className="modal-actions"><button onClick={() => setReadingOpen(false)}>Cancel</button><button className="save-button" onClick={saveReading} disabled={!readingInput || !readingDateTime}>Record reading</button></div></section></div>}
      {insulinOpen && <div className="modal-backdrop" role="presentation"><section className="note-modal reading-modal" role="dialog" aria-modal="true" aria-labelledby="insulin-title"><button className="modal-close" onClick={() => setInsulinOpen(false)} aria-label="Close">×</button><p className="eyebrow"><span /> Insulin delivery</p><h2 id="insulin-title">Record insulin</h2><p>Enter the type, quantity, and delivery date and time.</p><fieldset><legend>Insulin type</legend><div className="type-options">{(["Basal", "Bolus"] as InsulinType[]).map((type) => <label key={type}><input type="radio" name="insulin-type" value={type} checked={insulinType === type} onChange={() => setInsulinType(type)} />{type}</label>)}</div></fieldset>{insulinType === "Basal" && <><label htmlFor="insulin-duration">Duration</label><div className="duration-input"><input id="insulin-duration" inputMode="decimal" type="number" min={insulinDurationUnit === "hours" ? 1 / 60 : 1} max={insulinDurationUnit === "hours" ? 12 : 720} step={insulinDurationUnit === "hours" ? 0.25 : 1} value={insulinDurationInput} onChange={(event) => setInsulinDurationInput(event.target.value)} /><select aria-label="Duration unit" value={insulinDurationUnit} onChange={(event) => setInsulinDurationUnit(event.target.value as "minutes" | "hours")}><option value="minutes">minutes</option><option value="hours">hours</option></select></div><small>Enter a duration from 1 minute to 12 hours.</small></>}<label htmlFor="insulin-units">Quantity</label><div className="reading-input"><input id="insulin-units" inputMode="decimal" type="number" min="0.1" max="200" step="0.1" value={insulinInput} onChange={(event) => setInsulinInput(event.target.value)} autoFocus /><span>units</span></div><label htmlFor="insulin-datetime">Date and time of delivery</label><input className="datetime-input" id="insulin-datetime" type="datetime-local" value={insulinDateTime} onChange={(event) => setInsulinDateTime(event.target.value)} /><div className="modal-actions"><button onClick={() => setInsulinOpen(false)}>Cancel</button><button className="save-button" onClick={saveInsulinDose} disabled={!insulinInput || !insulinDateTime || (insulinType === "Basal" && !insulinDurationInput)}>Record insulin</button></div></section></div>}
      {activeWarning && <div className={`warning-backdrop ${activeWarning.severity}`} role="presentation"><section className="warning-dialog" role="alertdialog" aria-modal="true" aria-labelledby="warning-title" aria-describedby="warning-message"><span className="warning-symbol" aria-hidden="true">!</span><p className="warning-kicker">Glucose warning · {formatLongDate(activeWarning.timestamp)} · {formatGlucoseTime(activeWarning.timestamp)}</p><h2 id="warning-title">{activeWarning.title}</h2><strong>{activeWarning.value} <small>mg/dL</small></strong><p id="warning-message">{activeWarning.message}</p><div className="warning-rule"><b>Acknowledgement required</b><span>If your glucose remains outside the acceptable range, this warning will return in five minutes.</span></div><button onClick={acknowledgeWarning}>I understand — acknowledge warning</button></section></div>}
    </div>
  );
}
