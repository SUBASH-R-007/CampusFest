export const emptyMember = () => ({
  name: "",
  studentId: "",
  email: "",
  department: "",
  year: "",
});
export function validateRegistration(event, members, teamName, consent) {
  const errors = {};
  if (event.mode === "TEAM" && !teamName.trim())
    errors.teamName = "Enter a team name.";
  if (
    event.mode === "TEAM" &&
    (members.length < event.minTeamSize || members.length > event.maxTeamSize)
  )
    errors.members = `Use ${event.minTeamSize}–${event.maxTeamSize} members including the leader.`;
  const ids = new Set(),
    emails = new Set();
  members.forEach((m, i) => {
    for (const field of ["name", "studentId", "email", "department", "year"])
      if (!String(m[field]).trim())
        errors[`members.${i}.${field}`] =
          `Enter ${field === "studentId" ? "a student ID" : field === "year" ? "a year of study" : field}.`;
    if (m.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email.trim()))
      errors[`members.${i}.email`] = "Enter a valid email address.";
    const id = m.studentId.replace(/\s+/g, "").toLowerCase(),
      email = m.email.trim().toLowerCase();
    if (id && ids.has(id))
      errors[`members.${i}.studentId`] =
        "Each team member needs a different student ID.";
    if (email && emails.has(email))
      errors[`members.${i}.email`] =
        "Each team member needs a different email address.";
    ids.add(id);
    emails.add(email);
  });
  if (!consent)
    errors.consent = "Confirm the details and permission before continuing.";
  return errors;
}
