import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Brand, Icon } from "../components/UI";
import { useSession } from "../hooks/Session";
import { STATIC_PREVIEW } from "../utils/hosting";
export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { session } = useSession();
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={
          STATIC_PREVIEW
            ? (event) => {
                event.preventDefault();
                document.getElementById("main")?.focus();
              }
            : undefined
        }
      >
        Skip to content
      </a>
      <header className="site-header no-print">
        <div className="container header-inner">
          <Brand />
          <nav
            className={open ? "public-nav is-open" : "public-nav"}
            aria-label="Main navigation"
          >
            <NavLink to="/" end onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/events" onClick={() => setOpen(false)}>
              Explore events
            </NavLink>
            <NavLink to="/my-pass" onClick={() => setOpen(false)}>
              My pass
            </NavLink>
            <NavLink
              className="organizer-link"
              to="/organizer"
              onClick={() => setOpen(false)}
            >
              Organizer workspace
              <Icon size={15} />
            </NavLink>
          </nav>
          <button
            className="mobile-toggle icon-button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </header>
      {STATIC_PREVIEW && (
        <div className="static-preview-banner" role="note">
          <div className="container">
            <strong>Static preview</strong> — sample events and illustrative
            dates. Registration, login and attendance are unavailable.
          </div>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer no-print">
        <div className="container">
          <div className="footer-top">
            <div>
              <Brand />
              <p>Discover. Register. Show up.</p>
            </div>
            <div className="footer-links">
              <NavLink to="/events">Find your next event</NavLink>
              <NavLink to="/my-pass">Retrieve your pass</NavLink>
              <NavLink to="/organizer/login">Organizer login</NavLink>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              {session?.config?.campusName || "CampusFest demo campus"} ·
              Student project
            </span>
            <span>
              Demo content. An independent course project, with no institutional
              endorsement.
            </span>
            <span>All times in Asia/Kolkata (IST)</span>
          </div>
        </div>
      </footer>
    </>
  );
}
