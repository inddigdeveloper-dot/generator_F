import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import InddigLogo from "./InddigLogo";
import "../styles/Navbar.css";

const NAV_LINKS = [
    { to: "/dashboard",     label: "Dashboard" },
    { to: "/smart-reply",   label: "Smart Reply" },
    { to: "/pricing",       label: "Pricing" },
    { to: "/order-history", label: "Order History" },
    { to: "/edit-business", label: "Edit Business" },
];

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { isDark, toggleTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        setMobileOpen(false);
        logout();
        navigate("/login");
    };

    const initials = user?.name
        ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
        : "U";

    return (
        <>
            <nav className="navbar">
                <Link to="/" className="navbar-brand" aria-label="Go to home">
                    <InddigLogo size={200} />
                </Link>

                {user && (
                    <div className="navbar-center">
                        {NAV_LINKS.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`nav-link${location.pathname === link.to ? " nav-link-active" : ""}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}

                <div className="navbar-right">
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                        aria-label="Toggle theme"
                    >
                        {isDark ? "☀️" : "🌙"}
                    </button>

                    {user ? (
                        <>
                            <div className="plan-badge">Plan · Free</div>
                            <div className="nav-avatar" title={user.name}>{initials}</div>
                            <button className="nav-btn-logout nav-desktop-only" onClick={handleLogout}>
                                Logout
                            </button>
                            <button
                                className={`mobile-menu-toggle${mobileOpen ? " mobile-menu-toggle--open" : ""}`}
                                onClick={() => setMobileOpen(open => !open)}
                                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                                aria-expanded={mobileOpen}
                                aria-controls="mobile-nav-menu"
                            >
                                <span />
                                <span />
                                <span />
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="nav-btn-signin">Sign in</Link>
                            <Link to="/register" className="btn btn-primary nav-get-started">
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {user && (
                <div
                    id="mobile-nav-menu"
                    className={`mobile-nav-panel${mobileOpen ? " mobile-nav-panel--open" : ""}`}
                >
                    {NAV_LINKS.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`mobile-nav-link${location.pathname === link.to ? " mobile-nav-link-active" : ""}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <button className="mobile-nav-logout" onClick={handleLogout}>Logout</button>
                </div>
            )}
        </>
    );
}
