import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useResource } from "../hooks/useResource";
import { useSession } from "../hooks/Session";
import { post, saveText } from "../services/api";
import { emptyMember, validateRegistration } from "../utils/validation";
import { dateTime } from "../utils/format";
import { Loading, ErrorAlert, Field, Button, Icon } from "../components/UI";
import PassCard from "../components/PassCard";
function MemberFields({ member, index, onChange, errors, team, onRemove }) {
  const fields = [
    ["name", "Full name", "text", 100],
    ["studentId", "Student ID", "text", 40],
    ["email", "Email address", "email", 160],
    ["department", "Department", "text", 100],
  ];
  return (
    <fieldset className="member-fields">
      <legend>
        {team
          ? index === 0
            ? "Team leader · member 1"
            : `Member ${index + 1}`
          : "Your details"}
      </legend>
      {onRemove && (
        <button type="button" className="remove-member" onClick={onRemove}>
          Remove member {index + 1}
        </button>
      )}
      <div className="row g-3">
        {fields.map(([key, label, type, maxLength]) => (
          <div className="col-md-6" key={key}>
            <Field
              label={label}
              type={type}
              value={member[key]}
              required
              maxLength={maxLength}
              error={errors[`members.${index}.${key}`]}
              onChange={(e) => onChange(key, e.target.value)}
              autoComplete={
                index === 0 && key === "name"
                  ? "name"
                  : index === 0 && key === "email"
                    ? "email"
                    : "off"
              }
            />
          </div>
        ))}
        <div className="col-md-6">
          <Field
            label="Year of study"
            required
            value={member.year}
            error={errors[`members.${index}.year`]}
            onChange={(e) => onChange("year", e.target.value)}
          >
            <option value="">Select year</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => (
              <option value={y} key={y}>
                Year {y}
              </option>
            ))}
          </Field>
        </div>
      </div>
    </fieldset>
  );
}
export function AccessDetails({ passId, managementCode }) {
  return (
    <section className="access-details no-print">
      <h3>
        <Icon name="ticket" /> Keep your private access details.
      </h3>
      <p>
        Save these now. This code is only shown when issued and is never
        emailed. Use both details on <Link to="/my-pass">My pass</Link> to check
        your place or cancel.
      </p>
      <label htmlFor="issued-code" className="form-label">
        Private management code
      </label>
      <input
        id="issued-code"
        className="form-control management-code"
        readOnly
        value={managementCode}
        onFocus={(e) => e.target.select()}
      />
      <p className="small mt-2">
        Keep this code private. If it is lost, contact the organizer for
        in-person verification and a replacement.
      </p>
      <Button
        variant="dark"
        onClick={() =>
          saveText(
            `CampusFest-${passId}-private-access.txt`,
            `CampusFest PRIVATE ACCESS — keep separate from your printed pass.\nPass ID: ${passId}\nManagement code: ${managementCode}\nRetrieve at ${window.location.origin}/my-pass\nNo email recovery. Contact the event organizer for in-person verification if lost.\n`,
          )
        }
      >
        <Icon name="download" /> Save private access details
      </Button>
    </section>
  );
}
export default function Register() {
  const { slug } = useParams();
  const {
    data: event,
    loading,
    error: loadError,
  } = useResource(`/events/${encodeURIComponent(slug)}`);
  const { session } = useSession();
  const [members, setMembers] = useState([emptyMember()]);
  const [teamName, setTeamName] = useState("");
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState("details");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const updateMember = (i, key, value) =>
    setMembers((prev) =>
      prev.map((m, n) => (n === i ? { ...m, [key]: value } : m)),
    );
  function review(e) {
    e.preventDefault();
    const fields = validateRegistration(event, members, teamName, consent);
    setErrors(fields);
    setError(null);
    if (Object.keys(fields).length) {
      document.getElementById("registration-errors")?.focus();
      return;
    }
    setStage("review");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const data = await post(
        `/events/${encodeURIComponent(slug)}/registrations`,
        {
          teamName: event.mode === "TEAM" ? teamName : "",
          members: members.map((m) => ({ ...m, year: Number(m.year) })),
          consent,
        },
      );
      setResult(data);
      setStage("result");
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (e) {
      setError(e);
      setErrors(e.fields || {});
      if (Object.keys(e.fields || {}).length) setStage("details");
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (loadError)
    return (
      <div className="container page-space">
        <ErrorAlert error={loadError} />
      </div>
    );
  if (result)
    return (
      <div className="container page-space narrow-page">
        <div className="no-print">
          <p className="eyebrow">YOU’RE ON THE LIST</p>
          <h1>
            {result.registration.status === "CONFIRMED"
              ? "Your place is confirmed."
              : "You’re on the waiting list."}
          </h1>
          <p className="text-muted">
            {result.registration.status === "CONFIRMED"
              ? "We’ll see you there. Save your access details before leaving this page."
              : `You are number ${result.registration.waitlistPosition} in the queue. Save your access details and check your pass for updates.`}
          </p>
        </div>
        <AccessDetails
          passId={result.registration.passId}
          managementCode={result.managementCode}
        />
        <PassCard {...result} />
        <div className="d-flex flex-wrap gap-3 mt-4 no-print">
          <Button onClick={() => window.print()}>
            Print{" "}
            {result.registration.status === "WAITLISTED"
              ? "waiting-list receipt"
              : "pass"}
          </Button>
          <Link className="btn btn-outline-dark" to="/events">
            Explore more events
          </Link>
        </div>
      </div>
    );
  return (
    <div className="container page-space narrow-page">
      <Link className="back-link" to={`/events/${slug}`}>
        ← {event.title}
      </Link>
      <p className="eyebrow mt-4">
        {stage === "review"
          ? "02 / REVIEW YOUR DETAILS"
          : "01 / MAKE IT OFFICIAL"}
      </p>
      <h1>
        {stage === "review"
          ? "One last look."
          : event.mode === "TEAM"
            ? "Bring your team."
            : "Make room for a good time."}
      </h1>
      <p className="text-muted">
        {event.title} · {dateTime(event.startAt)} IST
      </p>
      <div className="notice">
        <strong>
          {event.availability === "waitlist"
            ? "This event is full. You can join the waiting list."
            : `${event.availableUnits} ${event.unit} currently available.`}
        </strong>{" "}
        Your final status is assigned when your registration is saved. Waiting
        lists move in order as spaces open, up until the event starts.
      </div>
      <ErrorAlert error={error} />
      {!event.canRegister ? (
        <div className="alert alert-warning">
          Registration is closed for this event.
        </div>
      ) : stage === "review" ? (
        <section className="surface">
          <h2 className="h4">{teamName || members[0].name}</h2>
          {members.map((m, i) => (
            <div className="review-person" key={i}>
              <strong>
                {m.name}
                {event.mode === "TEAM" && i === 0 ? " · Team leader" : ""}
              </strong>
              <span>
                {m.studentId} · {m.email}
              </span>
              <span>
                {m.department} · Year {m.year}
              </span>
            </div>
          ))}
          <p className="small text-muted mt-3">
            Self-entered student IDs and email addresses are not verified
            identities. This demo does not provide institutional identity
            verification.
          </p>
          <div className="d-flex flex-wrap gap-3">
            <Button
              variant="outline-dark"
              disabled={busy}
              onClick={() => setStage("details")}
            >
              Edit details
            </Button>
            <Button disabled={busy || !session} onClick={submit}>
              {busy
                ? "Saving registration…"
                : event.availability === "waitlist"
                  ? "Confirm & join waiting list"
                  : "Confirm registration"}
              <Icon />
            </Button>
          </div>
        </section>
      ) : (
        <form onSubmit={review} noValidate>
          <div id="registration-errors" tabIndex={-1}>
            {Object.keys(errors).length > 0 && (
              <div className="alert alert-danger" role="alert">
                <strong>Check the highlighted details.</strong>
                <ul className="mb-0">
                  {Object.values(errors).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {event.mode === "TEAM" && (
            <div className="surface mb-4">
              <Field
                label="Team name"
                value={teamName}
                maxLength={100}
                required
                error={errors.teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              <p className="form-text">
                {event.minTeamSize}–{event.maxTeamSize} members, including your
                leader. Each team uses one of {event.capacity} team places.
              </p>
            </div>
          )}
          {members.map((m, i) => (
            <MemberFields
              key={i}
              member={m}
              index={i}
              errors={errors}
              team={event.mode === "TEAM"}
              onChange={(key, value) => updateMember(i, key, value)}
              onRemove={
                i > 0
                  ? () => setMembers((prev) => prev.filter((_, n) => n !== i))
                  : null
              }
            />
          ))}
          {event.mode === "TEAM" && (
            <Button
              variant="outline-dark"
              type="button"
              className="mb-4"
              disabled={members.length >= event.maxTeamSize}
              onClick={() => setMembers((prev) => [...prev, emptyMember()])}
            >
              <Icon name="plus" /> Add team member ({members.length}/
              {event.maxTeamSize})
            </Button>
          )}
          <div className="consent-box">
            <label>
              <input
                type="checkbox"
                className="form-check-input me-2"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I confirm these details are correct
              {event.mode === "TEAM"
                ? " and I have permission to provide every team member’s details"
                : ""}
              .
            </label>
            {errors.consent && (
              <p className="text-danger small mt-2 mb-0">{errors.consent}</p>
            )}
          </div>
          <Button type="submit" className="mt-4">
            Review registration
            <Icon />
          </Button>
        </form>
      )}
    </div>
  );
}
