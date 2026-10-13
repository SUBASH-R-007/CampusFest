import { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../hooks/Session";
export function Icon({ name = "arrow", size = 20, ...props }) {
  const paths = {
    arrow: "M5 12h14M12 5l7 7-7 7",
    search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    calendar: "M5 3v4M19 3v4M3 10h18M3 5h18v16H3z",
    pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0zM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    ticket: "M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4zM15 5v14",
    menu: "M4 6h16M4 12h16M4 18h16",
    check: "M5 12l4 4L19 6",
    close: "M5 5l14 14M19 5L5 19",
    people:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87",
    plus: "M12 5v14M5 12h14",
    chart: "M4 4v16h17M8 16v-5M13 16V7M18 16V4",
    download: "M12 3v12M7 10l5 5 5-5M4 17v4h16v-4",
    refresh:
      "M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 7M4 12l2 7a7 7 0 0 0 12-2",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.arrow} />
    </svg>
  );
}
export function Brand() {
  const { session } = useSession();
  const logo = session?.config?.logo;
  return (
    <Link className="brand" to="/" aria-label="CampusFest home">
      <span className="brand-mark" aria-hidden="true">
        {logo ? (
          <img src={logo} alt="" />
        ) : (
          <>
            <span />
            <span />
            <span />
          </>
        )}
      </span>
      Campus<span>Fest</span>
      <span className="brand-dot">.</span>
    </Link>
  );
}
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Badge({ value, children }) {
  return (
    <span
      className={`status-badge status-${String(value || "").toLowerCase()}`}
    >
      {children || String(value || "").replaceAll("_", " ")}
    </span>
  );
}
export function Loading({ text = "Loading…" }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />{" "}
      {text}
    </div>
  );
}
export function ErrorAlert({ error }) {
  if (!error) return null;
  return (
    <div className="alert alert-danger" role="alert">
      <strong>{error.status === 401 ? "Please sign in again. " : ""}</strong>
      {error.message || String(error)}
      {error.status === 401 && (
        <Link to="/organizer/login" className="d-block mt-2">
          Go to organizer login
        </Link>
      )}
    </div>
  );
}
export function Empty({ title = "Nothing here yet", children, action }) {
  return (
    <div className="empty-state">
      <Icon name="calendar" size={32} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Field({
  label,
  error,
  children,
  className = "",
  hint,
  id: suppliedId,
  ...props
}) {
  const generatedId = useId();
  const id = suppliedId || generatedId;
  return (
    <div className={`field ${className}`}>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      {children ? (
        <select
          className={`form-select ${error ? "is-invalid" : ""}`}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          {...props}
        >
          {children}
        </select>
      ) : (
        <input
          className={`form-control ${error ? "is-invalid" : ""}`}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          {...props}
        />
      )}
      {(error || hint) && (
        <div
          id={`${id}-help`}
          className={error ? "invalid-feedback" : "form-text"}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}
export function TextArea({ label, error, ...props }) {
  const id = useId();
  return (
    <div className="field">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={`form-control ${error ? "is-invalid" : ""}`}
        rows={5}
        aria-invalid={!!error}
        {...props}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
}
export function Dialog({ title, children, onClose }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const focused = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      focused?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className="cf-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirmation({
  title,
  children,
  onCancel,
  onConfirm,
  busy,
  confirmDisabled = false,
  label = "Confirm",
  error,
}) {
  return (
    <Dialog
      title={title}
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      <div className="mb-4">{children}</div>
      <ErrorAlert error={error} />
      <div className="d-flex gap-2 justify-content-end">
        <Button variant="outline-dark" disabled={busy} onClick={onCancel}>
          Keep it
        </Button>
        <Button
          variant="danger"
          disabled={busy || confirmDisabled}
          onClick={onConfirm}
        >
          {busy ? "Saving…" : label}
        </Button>
      </div>
    </Dialog>
  );
}
export function PageHeading({ eyebrow, title, children, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="text-muted mb-0">{children}</p>}
      </div>
      {action}
    </div>
  );
}
