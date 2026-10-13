import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import { inputDate, utcDate } from "../utils/format";
import {
  PageHeading,
  Loading,
  ErrorAlert,
  Field,
  TextArea,
  Button,
} from "../components/UI";
const defaults = {
  title: "",
  slug: "",
  category: "Technology",
  description: "",
  rules: "",
  venue: "",
  image: "/images/campus.jpg",
  startAt: "",
  endAt: "",
  registrationOpensAt: "",
  registrationDeadline: "",
  mode: "SOLO",
  capacity: 20,
  minTeamSize: 1,
  maxTeamSize: 1,
  contact: "",
};
function EditorForm({ event }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({
    ...defaults,
    ...event,
    ...Object.fromEntries(
      ["startAt", "endAt", "registrationOpensAt", "registrationDeadline"].map(
        (k) => [k, inputDate(event?.[k])],
      ),
    ),
  }));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((v) => ({ ...v, [key]: value }));
  const fieldError = (k) => error?.fields?.[k];
  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = Object.fromEntries(
        Object.keys(defaults).map((k) => [k, form[k]]),
      );
      for (const k of [
        "startAt",
        "endAt",
        "registrationOpensAt",
        "registrationDeadline",
      ])
        payload[k] = utcDate(form[k]);
      for (const k of ["capacity", "minTeamSize", "maxTeamSize"])
        payload[k] = Number(form[k]);
      if (payload.mode === "SOLO")
        payload.minTeamSize = payload.maxTeamSize = 1;
      await api(`/organizer/events${event ? `/${event.id}` : ""}`, {
        method: event ? "PUT" : "POST",
        body: payload,
      });
      navigate("/organizer/events");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <ErrorAlert error={error} />
      <div className="editor-grid">
        <div>
          <section className="surface mb-4">
            <h2 className="h4">The essentials</h2>
            <Field
              label="Event title"
              required
              maxLength={120}
              value={form.title}
              error={fieldError("title")}
              onChange={(e) => set("title", e.target.value)}
            />
            <Field
              label="URL slug"
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              maxLength={100}
              value={form.slug}
              error={fieldError("slug")}
              onChange={(e) => set("slug", e.target.value)}
              hint="Lowercase letters, numbers, and hyphens. Example: design-jam"
            />
            <div className="row">
              <div className="col-sm-6">
                <Field
                  label="Category"
                  required
                  maxLength={50}
                  value={form.category}
                  error={fieldError("category")}
                  onChange={(e) => set("category", e.target.value)}
                />
              </div>
              <div className="col-sm-6">
                <Field
                  label="Venue"
                  required
                  maxLength={160}
                  value={form.venue}
                  error={fieldError("venue")}
                  onChange={(e) => set("venue", e.target.value)}
                />
              </div>
            </div>
            <TextArea
              label="Event description"
              required
              maxLength={6000}
              value={form.description}
              error={fieldError("description")}
              onChange={(e) => set("description", e.target.value)}
            />
            <TextArea
              label="Rules & what to bring"
              maxLength={4000}
              value={form.rules}
              error={fieldError("rules")}
              onChange={(e) => set("rules", e.target.value)}
            />
            <Field
              label="Public organizer contact"
              required
              maxLength={200}
              value={form.contact}
              error={fieldError("contact")}
              onChange={(e) => set("contact", e.target.value)}
              hint="Shown publicly so participants can get in touch."
            />
          </section>
          <section className="surface mb-4">
            <h2 className="h4">Schedule</h2>
            <p className="small text-muted">
              Enter all times in Asia/Kolkata (IST). Opening must precede the
              deadline; deadline must be at or before start; end must follow
              start.
            </p>
            <div className="row">
              {[
                ["registrationOpensAt", "Registration opens"],
                ["registrationDeadline", "Registration deadline"],
                ["startAt", "Event starts"],
                ["endAt", "Event ends"],
              ].map(([key, label]) => (
                <div className="col-sm-6" key={key}>
                  <Field
                    label={label}
                    type="datetime-local"
                    required
                    value={form[key]}
                    error={fieldError(key)}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside>
          <section className="surface mb-4">
            <h2 className="h4">Participation</h2>
            <Field
              label="Registration mode"
              value={form.mode}
              error={fieldError("mode")}
              onChange={(e) => set("mode", e.target.value)}
            >
              <option value="SOLO">Solo — capacity in seats</option>
              <option value="TEAM">Team — capacity in teams</option>
            </Field>
            <Field
              label={`Capacity (${form.mode === "TEAM" ? "teams" : "seats"})`}
              type="number"
              min={1}
              max={10000}
              required
              value={form.capacity}
              error={fieldError("capacity")}
              onChange={(e) => set("capacity", e.target.value)}
            />
            {form.mode === "TEAM" && (
              <div className="row">
                <div className="col-6">
                  <Field
                    label="Minimum members"
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={form.minTeamSize}
                    error={fieldError("minTeamSize")}
                    onChange={(e) => set("minTeamSize", e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <Field
                    label="Maximum members"
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={form.maxTeamSize}
                    error={fieldError("maxTeamSize")}
                    onChange={(e) => set("maxTeamSize", e.target.value)}
                  />
                </div>
              </div>
            )}
            <p className="small text-muted">
              After registrations exist, the mode cannot change and team limits
              must fit existing entries. Capacity cannot drop below confirmed
              registrations. Increasing capacity promotes eligible waiting-list
              entries in order.
            </p>
          </section>
          <section className="surface mb-4">
            <h2 className="h4">Event image</h2>
            <Field
              label="Approved local photograph"
              value={form.image}
              onChange={(e) => set("image", e.target.value)}
            >
              <option value="/images/campus.jpg">Campus library</option>
              <option value="/images/code.jpg">
                Technology & collaboration
              </option>
              <option value="/images/stage.jpg">Performance & culture</option>
              <option value="/images/design.jpg">Creative workshop</option>
            </Field>
            <img
              className="editor-preview"
              src={form.image}
              alt="Selected event photograph"
            />
          </section>
        </aside>
      </div>
      <div className="editor-actions">
        <Link className="btn btn-outline-dark" to="/organizer/events">
          Back to events
        </Link>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : event ? "Save changes" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}
export default function EventEditor() {
  const { id } = useParams();
  const { data, loading, error } = useResource("/organizer/events");
  const event = id ? data?.find((e) => e.id === id) : null;
  if (id && loading) return <Loading />;
  if (error) return <ErrorAlert error={error} />;
  if (id && !event) return <p>Event not found in your workspace.</p>;
  return (
    <>
      <PageHeading
        eyebrow="THE DETAILS MAKE THE DIFFERENCE"
        title={id ? "Edit your event" : "Create an experience"}
      >
        {id
          ? "Keep participants informed with accurate event details."
          : "Save your event as a draft, then publish when it’s ready."}
      </PageHeading>
      <EditorForm key={id || "new"} event={event} />
    </>
  );
}
