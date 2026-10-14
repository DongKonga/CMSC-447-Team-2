import React, { useState } from "react";
import { authService } from "./auth/authService";

export function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState(
    authService.getSavedWorkstationUsername() || "gis_operator@umbc.edu"
  );
  const [password, setPassword] = useState("••••••••••••");
  const [isMasked, setIsMasked] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState(""); // 'sso' | 'credentials'
  const [error, setError] = useState("");
  const [activeModal, setActiveModal] = useState(null);

  const handlePasswordFocus = () => {
    if (isMasked) {
      setPassword("");
      setIsMasked(false);
    }
  };

  // Primary Action: myUMBC SSO Login
  const handleSsoLogin = async () => {
    setError("");
    setIsLoading(true);
    setLoginMethod("sso");

    try {
      await new Promise((resolve) => setTimeout(resolve, 650));
      const ssoUser = await authService.login({
        username: "myumbc_user@umbc.edu",
        password: "sso_delegated_session",
        rememberWorkstation: true,
      });

      if (onLoginSuccess) {
        onLoginSuccess(ssoUser);
      }
    } catch (err) {
      setError(err.message || "Failed to authenticate via myUMBC Single Sign-On.");
    } finally {
      setIsLoading(false);
      setLoginMethod("");
    }
  };

  // Secondary Action: Standard GIS Operator Credentials
  const handleCredentialsSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your UMBC email or operator ID.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);
    setLoginMethod("credentials");

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const actualPassword = isMasked ? "operator_secure_auth" : password;
      const user = await authService.login({
        username: username.trim(),
        password: actualPassword,
        rememberWorkstation: rememberMe,
      });

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (err) {
      setError(err.message || "Invalid operator credentials. Please try again.");
    } finally {
      setIsLoading(false);
      setLoginMethod("");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0b0f19] text-slate-100 selection:bg-[#ffc20e] selection:text-black">
      
      {/* ======================================================== */}
      {/* LEFT COLUMN: DARK SLATE PANEL WITH TOPOGRAPHIC OVERLAY */}
      {/* ======================================================== */}
      <section className="lg:w-[48%] xl:w-[45%] bg-[#0f172a] border-b lg:border-b-0 lg:border-r border-slate-800 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        
        {/* Subtle Topographic Contour Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 600 900"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            {/* Elevation Contour Lines */}
            <path
              d="M-40 80C140 40 280 140 640 90"
              stroke="#94a3b8"
              strokeWidth="1.2"
              strokeDasharray="4 2"
            />
            <path
              d="M-40 160C160 110 320 220 640 170"
              stroke="#cbd5e1"
              strokeWidth="1.2"
            />
            <path
              d="M-40 250C190 190 350 310 640 260"
              stroke="#ffc20e"
              strokeWidth="1.4"
            />
            <path
              d="M-40 340C220 280 380 400 640 350"
              stroke="#94a3b8"
              strokeWidth="1.2"
            />
            <path
              d="M-40 440C180 380 340 510 640 460"
              stroke="#cbd5e1"
              strokeWidth="1.2"
            />
            <path
              d="M-40 550C240 480 410 620 640 570"
              stroke="#ffc20e"
              strokeWidth="1.4"
            />
            <path
              d="M-40 660C190 600 370 730 640 680"
              stroke="#94a3b8"
              strokeWidth="1.2"
            />
            <path
              d="M-40 780C260 710 440 840 640 800"
              stroke="#cbd5e1"
              strokeWidth="1.2"
            />

            {/* Closed Topographic Summit Rings (Watershed Basin) */}
            <path
              d="M160 420C220 370 320 390 360 460C400 530 340 610 260 600C180 590 110 490 160 420Z"
              stroke="#64748b"
              strokeWidth="1.2"
            />
            <path
              d="M200 450C240 415 300 430 330 475C360 520 315 575 260 565C205 555 165 495 200 450Z"
              stroke="#ffc20e"
              strokeWidth="1.2"
              opacity="0.8"
            />
            <path
              d="M235 475C260 450 295 460 310 490C325 520 295 550 265 545C235 540 215 505 235 475Z"
              stroke="#ffc20e"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Top Header: UMBC Facilities Lockup */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-black/60 border border-[#ffc20e]/60 shadow-md">
              <span className="text-xl font-black text-[#ffc20e] tracking-tight">
                U
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-[#ffc20e]">
                  UMBC
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Facilities Management
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide">
                Division of Information Technology &amp; Facilities Management
              </p>
            </div>
          </div>
        </div>

        {/* Center: Project Description & Scope */}
        <div className="relative z-10 my-10 space-y-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Stormwater GIS &amp; Hydrology Tracking
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mt-2.5 max-w-lg">
              Centralized spatial data infrastructure monitoring campus runoff, 
              catchment drainage, and retention capacity in compliance with UMBC’s 
              NPDES MS4 watershed permit.
            </p>
          </div>

          {/* Clean Core Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Watershed Stations
              </span>
              <span className="text-base font-bold text-white mt-0.5 block">
                14 Online
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                MS4 Catchments
              </span>
              <span className="text-base font-bold text-[#ffc20e] mt-0.5 block">
                Permit Verified
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Telemetry Link
              </span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                Live Sync
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Lockup: Lab & Department Footnote */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Hydrology GIS Lab • TRC Bldg 204</span>
          <span className="text-[#ffc20e] font-medium">Internal Utility</span>
        </div>
      </section>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: ACCESSIBLE AUTHENTICATION FORM            */}
      {/* ======================================================== */}
      <section className="lg:w-[52%] xl:w-[55%] bg-[#0b0f19] p-8 sm:p-12 lg:p-16 flex items-center justify-center">
        <div className="w-full max-w-md space-y-7">
          
          {/* Form Header */}
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Portal Authentication
            </h2>
            <p className="text-sm text-slate-400 mt-1.5">
              Sign in using your institutional myUMBC login or GIS operator credentials.
            </p>
          </div>

          {/* Error Alert Display */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-3 text-red-200 text-sm">
              <span className="material-symbols-outlined text-lg text-red-400 shrink-0 mt-0.5">
                error
              </span>
              <div className="flex-1 text-xs sm:text-sm">{error}</div>
              <button
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* PRIMARY ACTION: LOG IN VIA myUMBC */}
          <div>
            <button
              type="button"
              onClick={handleSsoLogin}
              disabled={isLoading}
              className="w-full bg-[#ffc20e] hover:bg-[#e6ad0b] active:bg-[#cca00a] text-black font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ffc20e] focus:ring-offset-2 focus:ring-offset-[#0b0f19]"
            >
              {isLoading && loginMethod === "sso" ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">
                    progress_activity
                  </span>
                  <span>Connecting to myUMBC...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">
                    verified_user
                  </span>
                  <span>Log in via myUMBC</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2">
              University Single Sign-On (Shibboleth &amp; Duo Multi-Factor Authentication)
            </p>
          </div>

          {/* CLEAN DIVIDER */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-[#0b0f19] px-3 text-xs text-slate-400 uppercase tracking-wider font-medium">
              or operator access
            </span>
          </div>

          {/* SECONDARY FORM: OPERATOR CREDENTIALS */}
          <form onSubmit={handleCredentialsSubmit} className="space-y-4" novalidate>
            {/* Operator Username / Email */}
            <div>
              <label
                htmlFor="operator-username"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Operator Username or Campus ID
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none">
                  badge
                </span>
                <input
                  id="operator-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="operator@umbc.edu"
                  disabled={isLoading}
                  required
                  autoComplete="username"
                  className="w-full bg-slate-900/90 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#ffc20e] focus:ring-1 focus:ring-[#ffc20e] transition-colors"
                />
              </div>
            </div>

            {/* Operator Password / Security Key */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="operator-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Password or Access Key
                </label>
                <button
                  type="button"
                  onClick={() => setActiveModal("forgot")}
                  className="text-xs text-[#ffc20e] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none">
                  lock
                </span>
                <input
                  id="operator-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onFocus={handlePasswordFocus}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setIsMasked(false);
                  }}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-900/90 border border-slate-700 text-white pl-10 pr-11 py-2.5 rounded-xl text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#ffc20e] focus:ring-1 focus:ring-[#ffc20e] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-[#ffc20e] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#ffc20e]"
                />
                <span className="text-xs text-slate-300">
                  Remember this device for 14 days
                </span>
              </label>
            </div>

            {/* Secondary Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm border border-slate-700 hover:border-[#ffc20e]/80 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading && loginMethod === "credentials" ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">
                    progress_activity
                  </span>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Operator Key</span>
                  <span className="material-symbols-outlined text-base">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* FOOTER ASSISTANCE */}
          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <span>
              Need GIS authorization?{" "}
              <button
                type="button"
                onClick={() => setActiveModal("help")}
                className="text-[#ffc20e] hover:underline font-medium cursor-pointer"
              >
                Contact DoIT
              </button>
            </span>
            <span className="text-slate-500">
              Facilities Help Desk: (410) 455-3838
            </span>
          </div>

        </div>
      </section>

      {/* MODAL DIALOG */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-white">
                {activeModal === "forgot" ? "Reset UMBC Password" : "GIS Lab Support"}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-sm text-slate-300 space-y-2.5">
              {activeModal === "forgot" ? (
                <>
                  <p>
                    Institutional myUMBC passwords can be reset directly through the central campus identity portal:
                  </p>
                  <a
                    href="https://my.umbc.edu/account"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#ffc20e] hover:underline font-semibold"
                  >
                    my.umbc.edu/account →
                  </a>
                  <p className="text-xs text-slate-400 pt-1">
                    For standalone ArcGIS Enterprise keys, contact the GIS administrator at <span className="text-slate-200 font-mono">gis-support@umbc.edu</span>.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    For access authorization to the UMBC Stormwater GIS Portal or hardware telemetry issues:
                  </p>
                  <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1">
                    <p><strong className="text-white">DoIT Technology Help Desk:</strong></p>
                    <p>• Phone: (410) 455-3838</p>
                    <p>• Web: <a href="https://doit.umbc.edu" target="_blank" rel="noreferrer" className="text-[#ffc20e] underline">doit.umbc.edu</a></p>
                    <p>• Facilities GIS Lab: TRC Bldg 204</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium cursor-pointer"
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
