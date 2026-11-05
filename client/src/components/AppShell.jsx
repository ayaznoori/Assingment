import { Link, useLocation } from "react-router-dom";

export default function AppShell({ children, variant = "default" }) {
  const { pathname } = useLocation();
  const onReview = pathname.includes("/review/");

  return (
    <div className={`app-shell app-shell--${variant}`}>
      <div className="app-shell__bg" aria-hidden />
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand__mark">Q</span>
          <span className="brand__text">
            Question <em>Studio</em>
          </span>
        </Link>
        <nav className="topbar__nav">
          {!onReview && <span className="topbar__pill">Content review</span>}
          {onReview && (
            <Link to="/" className="topbar__link">
              New session
            </Link>
          )}
        </nav>
      </header>
      <div className="app-shell__content">{children}</div>
    </div>
  );
}
