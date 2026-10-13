import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../hooks/Session";
import { Button, Field, ErrorAlert, Icon } from "../components/UI";
export default function OrganizerLogin() {
  const { login, session, error: sessionError } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await login(email, password);
      if (result?.organizer) navigate("/organizer");
      else throw new Error("Could not load your session. Try again.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page container">
      <div className="login-intro">
        <p className="eyebrow">BEHIND EVERY GREAT CAMPUS MOMENT</p>
        <h1>
          Good experiences.
          <br />
          <span>Great organizers.</span>
        </h1>
        <p>
          Your events, your participants, and the details that bring it all
          together.
        </p>
        <Link to="/events" className="text-link">
          Back to the campus
          <Icon />
        </Link>
      </div>
      <form className="surface login-form" onSubmit={submit}>
        <h2>Welcome back.</h2>
        <p className="text-muted">Sign in to your organizer workspace.</p>
        <ErrorAlert error={error || sessionError} />
        <Field
          label="Organizer email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-100" disabled={busy || !session}>
          {busy ? "Signing in…" : "Sign in"}
          <Icon />
        </Button>
        <p className="small text-muted mt-4 mb-0">
          Organizer accounts are provisioned by the local administrator. Contact
          them to reset your password. Students can use{" "}
          <Link to="/my-pass">My pass</Link> without an account.
        </p>
      </form>
    </div>
  );
}
