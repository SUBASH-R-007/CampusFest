import { useEffect } from "react";
import { Route, Routes, Link, useLocation } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import OrganizerLayout from "./layouts/OrganizerLayout";
import Home from "./pages/Home";
import { Events, EventDetails } from "./pages/Events";
import Register from "./pages/Register";
import MyPass from "./pages/MyPass";
import OrganizerLogin from "./pages/OrganizerLogin";
import Dashboard from "./pages/Dashboard";
import OrganizerEvents from "./pages/OrganizerEvents";
import EventEditor from "./pages/EventEditor";
import Participants from "./pages/Participants";
import Attendance from "./pages/Attendance";
import StaticNotice from "./pages/StaticNotice";
import { STATIC_PREVIEW } from "./utils/hosting";
function NotFound() {
  return (
    <div className="container page-space text-center">
      <p className="eyebrow">404 / A SMALL DETOUR</p>
      <h1>This one isn’t on the schedule.</h1>
      <p>The page may have moved. Your next experience is still out there.</p>
      <Link to="/events" className="btn btn-primary">
        Explore events
      </Link>
    </div>
  );
}
export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${location.pathname.startsWith("/organizer") ? "Organizer workspace" : "Discover. Register. Show up."} — CampusFest`;
  }, [location.pathname]);
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:slug" element={<EventDetails />} />
        <Route
          path="/events/:slug/register"
          element={STATIC_PREVIEW ? <StaticNotice /> : <Register />}
        />
        <Route
          path="/my-pass"
          element={STATIC_PREVIEW ? <StaticNotice /> : <MyPass />}
        />
        <Route
          path="/organizer/login"
          element={STATIC_PREVIEW ? <StaticNotice /> : <OrganizerLogin />}
        />
        {STATIC_PREVIEW && (
          <Route path="/organizer/*" element={<StaticNotice />} />
        )}
        <Route path="*" element={<NotFound />} />
      </Route>
      {!STATIC_PREVIEW && (
        <Route path="/organizer" element={<OrganizerLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="events" element={<OrganizerEvents />} />
          <Route path="events/new" element={<EventEditor />} />
          <Route path="events/:id/edit" element={<EventEditor />} />
          <Route path="events/:id/participants" element={<Participants />} />
          <Route path="attendance" element={<Attendance />} />
        </Route>
      )}
    </Routes>
  );
}
