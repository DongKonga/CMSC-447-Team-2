import React, { useState, useEffect } from "react";
import { authService } from "./auth/authService";

export function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState(
    authService.getSavedWorkstationUsername() || "gis_operator@umbc.edu"
  );
  const [password, setPassword] = useState("••••••••••••••••");
  const [isPasswordMasked, setIsPasswordMasked] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberWorkstation, setRememberWorkstation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [statusStep, setStatusStep] = useState("");
  const [error, setError] = useState("");
  const [activeModal, setActiveModal] = useState(null);

  // Live telemetry pulse animation state
  const [telemetryDischarge, setTelemetryDischarge] = useState(0.42);
  const [telemetryRetention, setTelemetryRetention] = useState(89.4);
  const [pulseActive, setPulseActive] = useState(false);

  // Clear masked password on focus if it's the placeholder
  const handlePasswordFocus = () => {
    if (isPasswordMasked) {
      setPassword("");
      setIsPasswordMasked(false);
    }
  };

  // Subtle live telemetry pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 800);
      setTelemetryDischarge((prev) => {
        const delta = (Math.random() * 0.04 - 0.02);
        return Math.max(0.38, Math.min(0.46, +(prev + delta).toFixed(2)));
      });
      setTelemetryRetention((prev) => {
        const delta = (Math.random() * 0.2 - 0.1);
        return Math.max(88.5, Math.min(90.2, +(prev + delta).toFixed(1)));
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please provide your ArcGIS Enterprise username or email domain.");
      return;
    }
    if (!password) {
      setError("Please enter your institutional password or access key.");
      return;
    }

    try {
      setIsLoading(true);
      setStatusStep("Initiating handshake with umbc.maps.arcgis.com...");
      await new Promise((r) => setTimeout(r, 450));

      setStatusStep("Verifying MS4 Telemetry Directory Authorization...");
      await new Promise((r) => setTimeout(r, 450));

      const actualPassword = isPasswordMasked ? "default_secure_key" : password;
      const user = await authService.login({
        username,
        password: actualPassword,
        rememberWorkstation,
      });

      setStatusStep("Authentication confirmed. Loading GIS Telemetry layers...");
      await new Promise((r) => setTimeout(r, 400));

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (err) {
      setError(err.message || "Failed to authenticate against ArcGIS Enterprise.");
    } finally {
      setIsLoading(false);
      setStatusStep("");
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md selection:bg-primary-container selection:text-on-primary-container min-h-screen flex flex-col justify-between overflow-x-hidden relative">
      {/* TOP APP BAR / BRAND HEADER */}
      <header className="w-full px-space-lg py-space-md flex items-center justify-between z-50">
        <div className="flex items-center gap-3 select-none">
          <span className="font-display-lg text-2xl font-bold tracking-wider text-primary-container">
            UMBC
          </span>
          <span className="h-4 w-px bg-outline-variant"></span>
          <span className="font-label-mono-sm text-label-telemetry tracking-widest text-on-surface-variant uppercase">
            Hydro-GIS Spatial Telemetry
          </span>
        </div>
        <div className="flex items-center gap-2 text-outline">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-label-mono-sm text-label-telemetry uppercase tracking-wider text-on-surface-variant">
            Systems Operational
          </span>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTAINER */}
      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 py-6 md:py-10 flex items-center justify-center">
        {/* TWO-COLUMN MODAL / CARD CONTAINER (Matching Image Layout) */}
        <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          {/* LEFT COLUMN: BRANDING & MISSION STATEMENT PANEL (lg:col-span-6) */}
          <section className="lg:col-span-6 bg-surface-container-low border-b lg:border-b-0 lg:border-r border-outline-variant p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
            {/* Subtle atmospheric cartographic grid & rings */}
            <div className="absolute inset-0 grid-lines pointer-events-none opacity-60"></div>
            <div className="absolute -top-24 -left-24 w-96 h-96 topo-rings pointer-events-none opacity-70"></div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-primary-container/5 blur-3xl pointer-events-none"></div>

            {/* Top Section of Left Panel */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant mb-8 shadow-sm">
                <span className="material-symbols-outlined text-primary-container text-sm">
                  water_drop
                </span>
                <span className="font-label-mono-sm text-label-telemetry text-primary tracking-widest uppercase">
                  Baltimore County Watershed Network
                </span>
              </div>
              <div className="space-y-4">
                <span className="font-display-lg text-3xl font-extrabold tracking-tight text-primary-container block">
                  UMBC
                </span>
                <h2 className="font-headline-lg text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface tracking-tight leading-tight">
                  Turn data into resilience.
                </h2>
                <p className="font-body-md text-on-surface-variant text-sm md:text-base leading-relaxed max-w-md pt-1">
                  Access enterprise spatial data, watershed catchments, and
                  real-time hydrological monitoring across UMBC campus.
                </p>
              </div>
            </div>

            {/* Center Cartographic Accent (Technical, Clean, Non-illustrative) */}
            <div className="relative z-10 my-8 py-6 px-5 bg-surface-container/60 border border-outline-variant/60 rounded-xl backdrop-blur-sm transition-all duration-300">
              <div className="flex items-center justify-between mb-4 border-b border-outline-variant/50 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`material-symbols-outlined text-primary text-base transition-transform ${
                      pulseActive ? "scale-125 text-primary-container" : ""
                    }`}
                  >
                    layers
                  </span>
                  <span className="font-label-mono-sm text-label-telemetry uppercase tracking-wider text-on-surface">
                    Telemetry Basemap / Live Runoff
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="font-label-mono-sm text-label-telemetry text-primary-container font-semibold">
                    MS4 // VERIFIED
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-left">
                <div className="p-2.5 rounded bg-surface-container-lowest/80 border border-outline-variant/40">
                  <span className="font-label-mono-sm text-[10px] text-outline block mb-0.5">
                    SENSORS
                  </span>
                  <span className="font-headline-md text-sm md:text-base text-on-surface font-semibold">
                    14 ACTIVE
                  </span>
                </div>
                <div className="p-2.5 rounded bg-surface-container-lowest/80 border border-outline-variant/40">
                  <span className="font-label-mono-sm text-[10px] text-outline block mb-0.5">
                    DISCHARGE
                  </span>
                  <span className="font-headline-md text-sm md:text-base text-primary font-semibold font-mono">
                    {telemetryDischarge} m³/s
                  </span>
                </div>
                <div className="p-2.5 rounded bg-surface-container-lowest/80 border border-outline-variant/40">
                  <span className="font-label-mono-sm text-[10px] text-outline block mb-0.5">
                    RETENTION
                  </span>
                  <span className="font-headline-md text-sm md:text-base text-on-surface font-semibold font-mono">
                    {telemetryRetention}%
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Compliance Footnote */}
            <div className="relative z-10 pt-4 border-t border-outline-variant/40 flex items-center justify-between text-on-surface-variant text-xs">
              <span className="font-label-mono-sm text-label-telemetry text-secondary">
                HYDROLOGY LAB // BLDG TRC 204
              </span>
              <span className="font-label-mono-sm text-label-telemetry text-primary-container">
                ESRI ARCGIS 11.2 ENTERPRISE
              </span>
            </div>
          </section>

          {/* RIGHT COLUMN: LOGIN CREDENTIALS & FORM (lg:col-span-6) */}
          <section className="lg:col-span-6 bg-surface-container-lowest p-8 md:p-12 flex flex-col justify-between relative">
            <div>
              {/* Symbol / Brand Icon at Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center text-primary-container shadow-inner">
                  <span className="material-symbols-outlined text-2xl">hub</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-primary-container animate-ping"></div>
              </div>

              {/* Form Heading */}
              <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface tracking-tight mb-2">
                Login to your Account
              </h1>
              <p className="font-body-sm text-on-surface-variant mb-6 text-sm">
                Division of Information Technology &amp; Facilities Hydrology GIS Lab
              </p>

              {/* Error Alert Display */}
              {error && (
                <div className="mb-5 p-3 rounded-lg bg-error-container/20 border border-error/50 flex items-start gap-2.5 text-error text-xs animate-shake">
                  <span className="material-symbols-outlined text-base mt-0.5">
                    error
                  </span>
                  <div className="flex-1">
                    <span className="font-semibold block">Authentication Error</span>
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={() => setError("")}
                    className="text-error/70 hover:text-error text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Direct GIS Directory Auth Form */}
              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Username / Domain Input */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      className="font-label-mono-sm text-label-mono-sm text-on-surface uppercase tracking-wider"
                      htmlFor="arcgis-username"
                    >
                      ArcGIS Enterprise Username / Domain
                    </label>
                    <span className="font-label-mono-sm text-label-telemetry text-outline">
                      DEFAULT: umbc.maps.arcgis.com
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-lg">
                        badge
                      </span>
                    </div>
                    <input
                      className="w-full bg-surface-container-low border border-outline-variant text-on-surface pl-10 pr-3 py-2.5 rounded-lg font-label-mono-sm text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors duration-150 placeholder:text-outline disabled:opacity-50"
                      id="arcgis-username"
                      placeholder="gis_operator@umbc.edu"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Institutional Key / Password Input */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      className="font-label-mono-sm text-label-mono-sm text-on-surface uppercase tracking-wider"
                      htmlFor="arcgis-password"
                    >
                      Institutional Key / Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveModal("forgot")}
                      className="font-label-mono-sm text-label-telemetry text-primary-container hover:underline cursor-pointer bg-transparent border-0 p-0"
                    >
                      Forgot portal access?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-lg">
                        key
                      </span>
                    </div>
                    <input
                      className="w-full bg-surface-container-low border border-outline-variant text-on-surface pl-10 pr-10 py-2.5 rounded-lg font-label-mono-sm text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors duration-150 disabled:opacity-50"
                      id="arcgis-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onFocus={handlePasswordFocus}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setIsPasswordMasked(false);
                      }}
                      disabled={isLoading}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      aria-label="Toggle password visibility"
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-on-surface cursor-pointer"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Checkbox: Workstation Bind */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      checked={rememberWorkstation}
                      onChange={(e) => setRememberWorkstation(e.target.checked)}
                      className="w-4 h-4 rounded bg-surface-container-low border border-outline-variant text-primary-container focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#ffc20e]"
                      type="checkbox"
                    />
                    <span className="font-label-mono-sm text-xs text-on-surface-variant">
                      Remember this GIS workstation
                    </span>
                  </label>
                  <span className="font-label-mono-sm text-label-telemetry text-secondary">
                    TTL: 14 DAYS
                  </span>
                </div>

                {/* Status Indicator during login */}
                {isLoading && (
                  <div className="p-3 bg-surface-container border border-primary-container/40 rounded-lg flex items-center gap-3 text-xs text-primary-container animate-pulse">
                    <span className="material-symbols-outlined text-base animate-spin">
                      sync
                    </span>
                    <span className="font-label-mono-sm">{statusStep}</span>
                  </div>
                )}

                {/* Primary Submit Action: UMBC Gold (#FFC20E) */}
                <button
                  className="w-full bg-primary-container hover:bg-[#e5ad08] active:bg-[#d49e00] text-on-primary-container font-headline-md text-sm font-bold uppercase tracking-wider py-3.5 px-space-md rounded-lg flex items-center justify-center gap-2.5 transition-all duration-150 ease-in-out shadow-md hover:shadow-lg cursor-pointer mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isLoading}
                >
                  <span className="material-symbols-outlined text-lg">
                    {isLoading ? "hourglass_top" : "lock_open"}
                  </span>
                  <span>
                    {isLoading
                      ? "Verifying Telemetry Credentials..."
                      : "Authenticate via ArcGIS Enterprise"}
                  </span>
                </button>
              </form>
            </div>

            {/* Right Panel Footer Support Notice */}
            <div className="mt-8 pt-6 border-t border-outline-variant text-center">
              <p className="font-body-sm text-xs text-on-surface-variant">
                Need GIS credential authorization?
                <button
                  type="button"
                  onClick={() => setActiveModal("request-access")}
                  className="text-primary-container hover:underline font-semibold ml-1.5 bg-transparent border-0 p-0 cursor-pointer"
                >
                  Request access via DoIT
                </button>
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* INSTITUTIONAL FOOTER */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant w-full px-space-lg py-4 flex flex-col md:flex-row justify-between items-center gap-space-sm z-50">
        <div className="flex flex-col sm:flex-row items-center gap-space-sm">
          <span className="font-label-mono-sm text-label-mono-sm font-bold text-primary">
            UMBC GIS // HYDRO-PORTAL
          </span>
          <span className="hidden sm:inline text-outline-variant">|</span>
          <p className="font-body-sm text-xs text-secondary text-center sm:text-left">
            © 2025 University of Maryland, Baltimore County (UMBC) — Division of
            Information Technology &amp; Facilities Management GIS Lab. All rights
            reserved.
          </p>
        </div>

        {/* Legal & Operational Compliance Links */}
        <nav className="flex flex-wrap items-center gap-x-space-md gap-y-1 font-body-sm text-xs">
          <button
            onClick={() => setActiveModal("status")}
            className="text-secondary hover:text-on-surface transition-colors duration-150 bg-transparent border-0 cursor-pointer p-0"
          >
            ArcGIS Enterprise Status
          </button>
          <button
            onClick={() => setActiveModal("compliance")}
            className="text-secondary hover:text-on-surface transition-colors duration-150 bg-transparent border-0 cursor-pointer p-0"
          >
            Watershed Compliance
          </button>
          <button
            onClick={() => setActiveModal("policy")}
            className="text-secondary hover:text-on-surface transition-colors duration-150 bg-transparent border-0 cursor-pointer p-0"
          >
            Hydrology Data Policy
          </button>
          <button
            onClick={() => setActiveModal("sso")}
            className="text-secondary hover:text-on-surface transition-colors duration-150 bg-transparent border-0 cursor-pointer p-0"
          >
            Security &amp; SSO Help
          </button>
          <button
            onClick={() => setActiveModal("emergency")}
            className="text-secondary hover:text-on-surface transition-colors duration-150 bg-transparent border-0 cursor-pointer p-0"
          >
            Emergency Operations
          </button>
        </nav>
      </footer>

      {/* MODAL DIALOGS FOR INTERACTIVE LINKS */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-surface-container border border-outline-variant rounded-xl max-w-lg w-full p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">
                  {activeModal === "forgot" && "lock_reset"}
                  {activeModal === "request-access" && "how_to_reg"}
                  {activeModal === "status" && "dns"}
                  {activeModal === "compliance" && "verified"}
                  {activeModal === "policy" && "policy"}
                  {activeModal === "sso" && "shield"}
                  {activeModal === "emergency" && "warning"}
                </span>
                <h3 className="font-headline-md text-lg font-bold text-on-surface">
                  {activeModal === "forgot" && "ArcGIS Portal Access Recovery"}
                  {activeModal === "request-access" && "Request GIS Lab Authorization"}
                  {activeModal === "status" && "Enterprise GIS System Status"}
                  {activeModal === "compliance" && "MS4 Watershed Compliance Standards"}
                  {activeModal === "policy" && "UMBC Hydrology Spatial Data Policy"}
                  {activeModal === "sso" && "Security & Single Sign-On Guidance"}
                  {activeModal === "emergency" && "Stormwater Emergency Response"}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-outline hover:text-on-surface text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-body-sm text-sm text-on-surface-variant leading-relaxed">
              {activeModal === "forgot" && (
                <>
                  <p>
                    Portal access credentials are authenticated directly against
                    the <strong>UMBC ArcGIS Enterprise &amp; DoIT Active Directory</strong>.
                  </p>
                  <div className="p-3 bg-surface-container-low rounded border border-outline-variant/50 space-y-1.5">
                    <p className="font-semibold text-on-surface">
                      Institutional Password Reset:
                    </p>
                    <p>
                      Reset your central UMBC identity via the myUMBC account self-service portal:
                    </p>
                    <a
                      href="https://my.umbc.edu/account"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-container underline inline-flex items-center gap-1"
                    >
                      my.umbc.edu/account
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </a>
                  </div>
                  <p>
                    For dedicated ArcGIS Online tokens or local service account access, contact the lab administrator at{" "}
                    <span className="text-primary font-mono">gis-support@umbc.edu</span>.
                  </p>
                </>
              )}

              {activeModal === "request-access" && (
                <>
                  <p>
                    Access to the <strong>UMBC Hydro-GIS Spatial Telemetry Portal</strong> is restricted to authorized personnel from the Facilities Hydrology GIS Lab and designated research staff.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Facility: Technology Research Center (TRC 204)</li>
                    <li>Requirement: Active UMBC Campus Directory ID</li>
                    <li>MS4 Phase II Compliance Clearance</li>
                  </ul>
                  <div className="pt-2">
                    <a
                      href="https://doit.umbc.edu"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-2 rounded font-semibold text-xs uppercase tracking-wider"
                    >
                      Submit DoIT Support Ticket
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </a>
                  </div>
                </>
              )}

              {activeModal === "status" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded bg-surface-container-low border border-outline-variant/30">
                    <span>ArcGIS Enterprise Server 11.2</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 99.98% Operational
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-surface-container-low border border-outline-variant/30">
                    <span>Watershed Sensor Telemetry Feed</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 14/14 Online (18ms)
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-surface-container-low border border-outline-variant/30">
                    <span>DoIT SSO Identity Provider</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Active
                    </span>
                  </div>
                </div>
              )}

              {activeModal === "compliance" && (
                <>
                  <p>
                    This system supports compliance with the <strong>Maryland Department of the Environment (MDE) National Pollutant Discharge Elimination System (NPDES) General Permit</strong> for Municipal Separate Storm Sewer Systems (MS4).
                  </p>
                  <p className="text-xs">
                    Continuous monitoring measures runoff discharge, sediment retention, and campus watershed impervious surface coverage in accordance with Maryland Phase II guidelines.
                  </p>
                </>
              )}

              {activeModal === "policy" && (
                <>
                  <p>
                    Hydrological and spatial telemetry gathered on the UMBC campus is classified as <strong>Institutional Tier 2 Research &amp; Facilities Data</strong>.
                  </p>
                  <p className="text-xs">
                    Data may be used for internal research, campus planning, stormwater management, and regulatory compliance reporting. Unauthorized redistribution or scraping is prohibited.
                  </p>
                </>
              )}

              {activeModal === "sso" && (
                <>
                  <p>
                    Authentication utilizes UMBC Shibboleth Single Sign-On with Duo Security Multi-Factor Authentication (MFA).
                  </p>
                  <p className="text-xs">
                    When accessing from a recognized TRC GIS workstation with the <em>Remember Workstation</em> option enabled, credential tokens remain valid for a 14-day TTL cycle.
                  </p>
                </>
              )}

              {activeModal === "emergency" && (
                <div className="space-y-2">
                  <p className="text-error font-semibold">
                    Campus Flooding or Hazardous Spill Emergency Protocol:
                  </p>
                  <div className="p-3 bg-error-container/20 border border-error/40 rounded text-xs space-y-1">
                    <p className="text-on-surface font-semibold">
                      Facilities Management 24/7 Dispatch:
                    </p>
                    <p className="text-error font-mono text-sm">(410) 455-2550</p>
                    <p className="text-on-surface font-semibold pt-1">
                      UMBC Police Emergency:
                    </p>
                    <p className="text-error font-mono text-sm">(410) 455-5555</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded font-label-mono-sm text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
