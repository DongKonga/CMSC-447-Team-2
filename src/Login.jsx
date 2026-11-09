import { useState } from "react";
import { login } from "./auth/authService";
import "./Login.css";

export function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both a username and password.");
      return;
    }

    setIsLoading(true);

    // Perform simplified login
    const result = login(username, password);

    setTimeout(() => {
      setIsLoading(false);
      if (result.success) {
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
      } else {
        setError(result.error || "Login failed. Please try again.");
      }
    }, 200);
  };


  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header with Hydrology / GIS Icon */}
        <div className="login-header">
          <div className="login-icon-wrapper">
            <svg
              className="login-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <h1 className="login-title">Stormwater GIS</h1>
          <p className="login-subtitle">Hydrology & BMP Tracking Portal</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-error-alert" role="alert">
            <svg
              className="error-icon"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <div className="input-wrapper">
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>


      </div>
    </div>
  );
}
