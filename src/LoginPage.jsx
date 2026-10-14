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
  const [error, setError] = useState("");
  const [activeModal, setActiveModal] = useState(null);

  const handlePasswordFocus = () => {
    if (isMasked) {
      setPassword("");
      setIsMasked(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your UMBC email or username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setIsLoading(true);
      const actualPassword = isMasked ? "demo_password" : password;
      const user = await authService.login({
        username: username.trim(),
        password: actualPassword,
        rememberWorkstation: rememberMe,
      });

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (err) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-neutral-100 flex flex-col justify-between selection:bg-[#ffc20e] selection:text-black">
      {/* SIMPLE CLEAN TOP BAR */}
      <header className="w-full px-6 py-5 flex items-center justify-between border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          {/* UMBC Wordmark */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-[#ffc20e] font-sans">
              UMBC
            </span>
            <span className="h-4 w-px bg-neutral-700"></span>
            <span className="text-sm font-medium text-neutral-300 tracking-wide">
              Stormwater Portal
            </span>
          </div>
        </div>
        <a
          href="https://doit.umbc.edu"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-neutral-400 hover:text-[#ffc20e] transition-colors"
        >
          DoIT Support
        </a>
      </header>

      {/* CENTERED LOGIN CARD */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#1a1a1a] border border-neutral-800 rounded-2xl p-8 sm:p-10 shadow-xl relative">
          
          {/* UMBC LOGO BADGE */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border-2 border-[#ffc20e] flex items-center justify-center shadow-lg shadow-black/40 mb-4">
              <span className="text-2xl font-black text-[#ffc20e] tracking-tight">
                U
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Sign in to UMBC Stormwater
            </h1>
            <p className="text-neutral-400 text-sm mt-1.5">
              Enter your campus credentials to access GIS &amp; telemetry data
            </p>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-red-950/40 border border-red-800/60 flex items-start gap-3 text-red-200 text-sm">
              <span className="material-symbols-outlined text-lg text-red-400 shrink-0 mt-0.5">
                error
              </span>
              <div className="flex-1">{error}</div>
              <button
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-200 font-bold ml-1 text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {/* SIMPLE FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username / Email */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-neutral-300 mb-1.5"
              >
                UMBC Email or Username
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-lg pointer-events-none">
                  person
                </span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yourusername@umbc.edu"
                  disabled={isLoading}
                  required
                  autoComplete="username"
                  className="w-full bg-[#121212] border border-neutral-700 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-neutral-500 focus:outline-none focus:border-[#ffc20e] focus:ring-1 focus:ring-[#ffc20e] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-neutral-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setActiveModal("forgot")}
                  className="text-xs text-[#ffc20e] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-lg pointer-events-none">
                  lock
                </span>
                <input
                  id="password"
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
                  className="w-full bg-[#121212] border border-neutral-700 text-white pl-10 pr-11 py-2.5 rounded-xl text-sm placeholder:text-neutral-500 focus:outline-none focus:border-[#ffc20e] focus:ring-1 focus:ring-[#ffc20e] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-1"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#121212] border-neutral-700 text-[#ffc20e] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#ffc20e]"
                />
                <span className="text-sm text-neutral-300">Remember me</span>
              </label>
              <span className="text-xs text-neutral-500">UMBC SSO</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#ffc20e] hover:bg-[#e6ad0b] active:bg-[#cca00a] text-black font-semibold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">
                    progress_activity
                  </span>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="material-symbols-outlined text-lg">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* FOOTER ASSISTANCE */}
          <div className="mt-8 pt-6 border-t border-neutral-800 text-center">
            <p className="text-xs text-neutral-400">
              Need access or technical support?{" "}
              <button
                type="button"
                onClick={() => setActiveModal("help")}
                className="text-[#ffc20e] hover:underline font-medium"
              >
                Contact DoIT
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* MINIMAL FOOTER */}
      <footer className="w-full px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500 border-t border-neutral-800/80">
        <p>© 2025 University of Maryland, Baltimore County</p>
        <div className="flex items-center gap-4">
          <a
            href="https://umbc.edu"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-400 transition-colors"
          >
            UMBC Home
          </a>
          <span>•</span>
          <a
            href="https://doit.umbc.edu"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-400 transition-colors"
          >
            DoIT Help Desk
          </a>
        </div>
      </footer>

      {/* SIMPLE CLEAN MODAL */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-[#1a1a1a] border border-neutral-800 rounded-xl max-w-sm w-full p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-white">
                {activeModal === "forgot" ? "Reset Password" : "Need Help?"}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-neutral-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <div className="text-sm text-neutral-300 space-y-2.5">
              {activeModal === "forgot" ? (
                <>
                  <p>
                    Please use your UMBC myUMBC account to reset your campus password:
                  </p>
                  <a
                    href="https://my.umbc.edu/account"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-[#ffc20e] hover:underline font-medium"
                  >
                    my.umbc.edu/account →
                  </a>
                </>
              ) : (
                <>
                  <p>
                    For access requests to the Stormwater GIS Lab or login assistance:
                  </p>
                  <p className="text-xs text-neutral-400">
                    • Phone: (410) 455-3838<br />
                    • Email: doit@umbc.edu<br />
                    • Location: Engineering TRC 204
                  </p>
                </>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium cursor-pointer"
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
