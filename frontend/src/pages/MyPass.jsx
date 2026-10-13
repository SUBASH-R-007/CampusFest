import { useState } from "react";
import { useSession } from "../hooks/Session";
import { post } from "../services/api";
import { isBeforeStart } from "../utils/format";
import {
  Button,
  Field,
  ErrorAlert,
  Confirmation,
  Icon,
} from "../components/UI";
import PassCard from "../components/PassCard";
export default function MyPass() {
  const { session, error: sessionError } = useSession();
  const [passId, setPassId] = useState("");
  const [managementCode, setManagementCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  async function lookup(e) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(
        await post("/passes/lookup", {
          passId: passId.trim(),
          managementCode: managementCode.trim(),
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      setResult(
        await post("/passes/cancel", {
          passId: passId.trim(),
          managementCode: managementCode.trim(),
        }),
      );
      setConfirm(false);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page-space narrow-page">
      <div className="no-print">
        <p className="eyebrow">YOUR PLANS, ALL IN ONE PLACE</p>
        <h1>Your pass to a good time.</h1>
        <p className="text-muted">
          Check your place, print your pass, or update your plans. No account
          needed.
        </p>
      </div>
      {!result ? (
        <form className="surface pass-lookup no-print" onSubmit={lookup}>
          <span className="lookup-icon">
            <Icon name="ticket" size={30} />
          </span>
          <h2 className="h4">Let’s find your registration.</h2>
          <p>Enter the private access details saved when you registered.</p>
          <ErrorAlert error={error || sessionError} />
          <Field
            label="Registration / pass ID"
            required
            value={passId}
            onChange={(e) => setPassId(e.target.value)}
            placeholder="CF-…"
            autoComplete="off"
          />
          <Field
            label="Private management code"
            type="password"
            required
            value={managementCode}
            onChange={(e) => setManagementCode(e.target.value)}
            autoComplete="off"
          />
          <Button type="submit" disabled={busy || !session} className="w-100">
            {busy ? "Finding your pass…" : "Find my pass"}
            <Icon />
          </Button>
          <p className="small text-muted mt-3 mb-0">
            Lost your code? Contact the event organizer for in-person
            verification and a replacement. There is no email recovery.
          </p>
        </form>
      ) : (
        <>
          <div className="no-print">
            <ErrorAlert error={error} />
            <div className="pass-actions">
              <Button variant="outline-dark" disabled={busy} onClick={lookup}>
                <Icon name="refresh" />
                {busy ? "Refreshing…" : "Refresh status"}
              </Button>
              <Button onClick={() => window.print()}>
                Print{" "}
                {result.registration.status === "CONFIRMED"
                  ? "pass"
                  : "registration receipt"}
              </Button>
              <button
                className="text-link"
                onClick={() => {
                  setResult(null);
                  setManagementCode("");
                  setError(null);
                }}
              >
                Look up another pass
              </button>
            </div>
          </div>
          <PassCard {...result} />
          <div className="no-print mt-4">
            {result.registration.status !== "CANCELLED" &&
            result.event.status !== "cancelled" &&
            isBeforeStart(result.event) ? (
              <div className="cancel-panel">
                <div>
                  <h3 className="h6">Plans changed?</h3>
                  <p className="small mb-0">
                    Cancel before the event starts to make room for someone
                    else.
                    {result.registration.teamName &&
                      " This cancels the entire team."}
                  </p>
                </div>
                <Button
                  variant="outline-danger"
                  disabled={busy}
                  onClick={() => setConfirm(true)}
                >
                  Cancel registration
                </Button>
              </div>
            ) : (
              result.registration.status !== "CANCELLED" && (
                <p className="small text-muted">
                  Self-service cancellation closes when the event starts.
                </p>
              )
            )}
          </div>
        </>
      )}
      {confirm && (
        <Confirmation
          title="Cancel this registration?"
          label="Cancel registration"
          onCancel={() => {
            setConfirm(false);
            setError(null);
          }}
          onConfirm={cancel}
          busy={busy}
          error={error}
        >
          <p>
            This releases your place.{" "}
            {result.registration.teamName
              ? "Every member of your team will be cancelled. "
              : ""}
            If you register again, you receive a new pass and a new position in
            the queue.
          </p>
        </Confirmation>
      )}
    </div>
  );
}
