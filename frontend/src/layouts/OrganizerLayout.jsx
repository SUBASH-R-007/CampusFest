import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../hooks/Session";
import { Brand, Loading, ErrorAlert, Icon } from "../components/UI";
export default function OrganizerLayout() {
  const { session, error: sessionError, logout } = useSession();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  if (sessionError)
    return (
      <div className="container page-space">
        <ErrorAlert error={sessionError} />
      </div>
    );
  if (!session) return <Loading />;
  if (!session.organizer) return <Navigate to="/organizer/login" replace />;
  async function signOut() {
    setBusy(true);
    try {
      await logout();
      navigate("/organizer/login");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="workspace">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="workspace-sidebar">
        <Brand />
        <span className="workspace-label">ORGANIZER WORKSPACE</span>
        <nav aria-label="Organizer navigation">
          <NavLink end to="/organizer">
            <Icon name="chart" />
            Overview
          </NavLink>
          <NavLink to="/organizer/events">
            <Icon name="calendar" />
            My events
          </NavLink>
          <NavLink to="/organizer/attendance">
            <Icon name="check" />
            Attendance
          </NavLink>
          <NavLink to="/events">
            <Icon />
            Public event explorer
          </NavLink>
        </nav>
        <div className="organizer-account">
          <span className="account-avatar">
            {session.organizer.name.slice(0, 1)}
          </span>
          <div>
            <strong>{session.organizer.name}</strong>
            <small>{session.organizer.email}</small>
          </div>
          <button onClick={signOut} disabled={busy}>
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <span>{session.config?.campusName || "CampusFest"}</span>
          <span className="demo-label">DEMO WORKSPACE</span>
        </header>
        <main id="main" className="workspace-content">
          <ErrorAlert error={error} />
          <Outlet />
        </main>
        <footer className="workspace-footer">
          CampusFest · All times Asia/Kolkata (IST) · Course demonstration
        </footer>
      </div>
    </div>
  );
}
