import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { updateUserProfile } from "../api/client";
import "../styles/EditBusiness.css";

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export default function EditBusinessPage() {
    const { user, login } = useAuth();

    const [form, setForm] = useState({
        business_name: user?.business_name || "",
        business_desc: user?.business_desc || "",
        mobile_no: user?.mobile_no || "",
        google_place_id: user?.google_place_id || "",
        review_link: user?.review_link || "",
        seo_keyword: user?.seo_keyword?.join(", ") || "",
    });
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [mapsLoaded, setMapsLoaded] = useState(false);
    const [placeChosen, setPlaceChosen] = useState(false);
    const searchRef = useRef(null);
    const autocompleteRef = useRef(null);

    // Load Google Maps Places API once
    useEffect(() => {
        if (!MAPS_KEY) return;
        if (window.google?.maps?.places) { setMapsLoaded(true); return; }
        const existing = document.querySelector('script[data-gmaps]');
        if (existing) { existing.addEventListener("load", () => setMapsLoaded(true)); return; }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
        script.async = true;
        script.dataset.gmaps = "1";
        script.onload = () => setMapsLoaded(true);
        document.head.appendChild(script);
    }, []);

    // Attach Autocomplete once Maps is ready
    useEffect(() => {
        if (!mapsLoaded || !searchRef.current || autocompleteRef.current) return;

        const ac = new window.google.maps.places.Autocomplete(searchRef.current, {
            types: ["establishment"],
            fields: ["name", "place_id", "formatted_phone_number", "editorial_summary", "formatted_address"],
        });

        ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (!place.place_id) return;
            setPlaceChosen(true);
            setSuccess("");
            setError("");
            setForm(prev => ({
                ...prev,
                business_name: place.name || prev.business_name,
                google_place_id: place.place_id,
                review_link: `https://search.google.com/local/writereview?placeid=${place.place_id}`,
                mobile_no: place.formatted_phone_number?.replace(/\s/g, "") || prev.mobile_no,
                business_desc: place.editorial_summary?.overview || place.formatted_address || prev.business_desc,
            }));
        });

        autocompleteRef.current = ac;
    }, [mapsLoaded]);

    const handleChange = e => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setSuccess("");
        setError("");
    };

    // Auto-generate review link when place_id is typed manually
    const handlePlaceIdChange = e => {
        const pid = e.target.value.trim();
        setForm(prev => ({
            ...prev,
            google_place_id: e.target.value,
            review_link: pid ? `https://search.google.com/local/writereview?placeid=${pid}` : prev.review_link,
        }));
        setSuccess("");
        setError("");
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setSaving(true);
        setSuccess("");
        setError("");
        try {
            const payload = {
                ...form,
                seo_keyword: form.seo_keyword.split(",").map(k => k.trim()).filter(Boolean),
            };
            await updateUserProfile(payload);
            const token = localStorage.getItem("token");
            const refresh = localStorage.getItem("refresh_token");
            if (token && refresh) await login(token, refresh);
            setSuccess("Business profile updated successfully!");
        } catch (err) {
            setError(typeof err === "string" ? err : "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="inner-page">
            <div className="bg-orbs">
                <div className="orb orb-1" style={{ opacity: 0.07 }} />
                <div className="orb orb-2" style={{ opacity: 0.06 }} />
            </div>

            <div className="inner-page-body">
                <div className="page-header">
                    <div className="page-eyebrow">Edit Business</div>
                    <h1 className="page-title">Business Profile</h1>
                    <p className="page-sub">Update your business details used for AI review generation.</p>
                </div>

                <div className="eb-layout">
                    <form className="panel eb-form" onSubmit={handleSubmit}>
                        <div className="panel-header">
                            <span className="panel-title">Business Details</span>
                        </div>

                        {success && <div className="alert alert-success">{success}</div>}
                        {error && <div className="alert alert-error">{error}</div>}

                        {/* ── Google Places Search ──
                        {MAPS_KEY && (
                            <div className="form-group eb-places-group">
                                <label className="form-label">Find on Google</label>
                                <div className="eb-search-wrap">
                                    <span className="eb-search-icon">🔍</span>
                                    <input
                                        ref={searchRef}
                                        className="form-input eb-search-input"
                                        placeholder={mapsLoaded ? "Search your business name to auto-fill…" : "Loading Google Places…"}
                                        disabled={!mapsLoaded}
                                        autoComplete="off"
                                    />
                                </div>
                                {placeChosen
                                    ? <p className="eb-field-hint eb-places-ok">✓ Info filled from Google — review and save below.</p>
                                    : <p className="eb-field-hint">Type your business name to auto-fill all fields from Google.</p>
                                }
                            </div>
                        )} */}

                        <div className="form-group">
                            <label className="form-label">Business Name</label>
                            <input
                                type="text"
                                name="business_name"
                                className="form-input"
                                placeholder="Your business name"
                                value={form.business_name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Business Description</label>
                            <textarea
                                name="business_desc"
                                className="form-input form-textarea"
                                placeholder="Brief description of your business, services, or specialty"
                                value={form.business_desc}
                                onChange={handleChange}
                                rows={3}
                            />
                            <p className="eb-field-hint">The AI uses this to make reviews sound authentic and specific.</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mobile Number</label>
                            <input
                                type="tel"
                                name="mobile_no"
                                className="form-input"
                                placeholder="+91 XXXXX XXXXX"
                                value={form.mobile_no}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Google Place ID</label>
                            <input
                                type="text"
                                name="google_place_id"
                                className="form-input"
                                placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
                                value={form.google_place_id}
                                onChange={handlePlaceIdChange}
                            />
                            <p className="eb-field-hint">
                                Required for QR code generation and directing customers to your Google review page.{" "}
                                <a
                                    href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    How to find it →
                                </a>
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Google Review Link</label>
                            <input
                                type="url"
                                name="review_link"
                                className="form-input"
                                placeholder="https://search.google.com/local/writereview?placeid=..."
                                value={form.review_link}
                                onChange={handleChange}
                            />
                            <p className="eb-field-hint">Auto-filled when you enter a Place ID. Customers are sent here to post their review.</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">SEO Keywords</label>
                            <input
                                type="text"
                                name="seo_keyword"
                                className="form-input"
                                placeholder="e.g. digital marketing, social media, branding"
                                value={form.seo_keyword}
                                onChange={handleChange}
                            />
                            <p className="eb-field-hint">Comma-separated — the AI weaves these into every generated review.</p>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary eb-save-btn"
                            disabled={saving}
                        >
                            {saving ? <><span className="spinner" /> Saving…</> : "Save Changes"}
                        </button>
                    </form>

                    {/* Info sidebar */}
                    <div className="eb-info">
                        <div className="panel">
                            <div className="panel-header">
                                <span className="panel-title">Account Info</span>
                            </div>
                            <div className="eb-info-item">
                                <span className="eb-info-label">Email</span>
                                <span className="eb-info-value">{user?.email || "—"}</span>
                            </div>
                            <div className="eb-info-item">
                                <span className="eb-info-label">Account Name</span>
                                <span className="eb-info-value">{user?.name || "—"}</span>
                            </div>
                            <div className="eb-info-item">
                                <span className="eb-info-label">Username</span>
                                <span className="eb-info-value">@{user?.user_name || "—"}</span>
                            </div>
                            <div className="eb-info-item">
                                <span className="eb-info-label">Plan</span>
                                <span className="eb-info-value eb-plan-tag">Free</span>
                            </div>
                        </div>

                        <div className="panel eb-tip">
                            <div className="eb-tip-icon">💡</div>
                            <p>
                                {MAPS_KEY
                                    ? "Use the search above to auto-fill your Place ID, review link, and contact details from Google in one click."
                                    : "Enter your Google Place ID to enable QR code generation and customer review redirects."
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
