import { useEffect, useRef } from "react";
export default function EventChart({ events }) {
  const canvas = useRef(null);
  const container = useRef(null);
  useEffect(() => {
    function draw() {
      const c = canvas.current;
      if (!c) return;
      const width = container.current.clientWidth;
      const height = Math.max(220, events.length * 47 + 40);
      const ratio = window.devicePixelRatio || 1;
      c.width = width * ratio;
      c.height = height * ratio;
      c.style.height = `${height}px`;
      const ctx = c.getContext("2d");
      ctx.scale(ratio, ratio);
      ctx.clearRect(0, 0, width, height);
      const labelWidth = Math.min(145, width * 0.35);
      const max = Math.max(
        1,
        ...events.map((e) => e.confirmedCount + e.waitlistedCount),
      );
      events.forEach((e, i) => {
        const y = i * 47 + 24;
        ctx.font = "12px system-ui";
        ctx.fillStyle = "#48444f";
        const title =
          e.title.length > 18 ? e.title.slice(0, 16) + "…" : e.title;
        ctx.fillText(title, 0, y + 6);
        const usable = Math.max(30, width - labelWidth - 42);
        const confirmed = (usable * e.confirmedCount) / max;
        const waitlisted = (usable * e.waitlistedCount) / max;
        ctx.fillStyle = "#6736dc";
        ctx.fillRect(labelWidth, y - 10, confirmed, 23);
        ctx.fillStyle = "#d9cbff";
        ctx.fillRect(labelWidth + confirmed, y - 10, waitlisted, 23);
        ctx.fillStyle = "#48444f";
        ctx.fillText(
          String(e.confirmedCount + e.waitlistedCount),
          labelWidth + confirmed + waitlisted + 8,
          y + 6,
        );
      });
    }
    const observer = new ResizeObserver(draw);
    observer.observe(container.current);
    draw();
    return () => observer.disconnect();
  }, [events]);
  return (
    <div ref={container}>
      <canvas
        ref={canvas}
        role="img"
        aria-label="Confirmed and waitlisted registration units for each owned event. Exact values are in the table below."
      />
      <div className="chart-legend">
        <span>
          <i />
          Confirmed units
        </span>
        <span>
          <i />
          Waitlisted units
        </span>
      </div>
      <div className="table-responsive">
        <table className="table">
          <caption>
            Event registration units. A team counts as one unit.
          </caption>
          <thead>
            <tr>
              <th>Event</th>
              <th>Confirmed</th>
              <th>Waitlisted</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{e.title}</td>
                <td>{e.confirmedCount}</td>
                <td>{e.waitlistedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
