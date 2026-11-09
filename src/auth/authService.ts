/**
 * UMBC HYDRO-GIS Spatial Telemetry Portal
 * Authentication & Session Management Service
 * Supports ArcGIS Enterprise SSO & Local Workstation Binding (TTL: 14 Days)
 */

const AUTH_STORAGE_KEY = "umbc_hydro_gis_session";
const WORKSTATION_KEY = "umbc_hydro_gis_saved_workstation";
const DEFAULT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours for non-remembered sessions

export const authService = {
  /**
   * Retrieves saved username if workstation was previously remembered
   */
  getSavedWorkstationUsername(): string | null {
    try {
      const saved = localStorage.getItem(WORKSTATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (new Date(parsed.expiresAt).getTime() > Date.now()) {
          return parsed.username;
        } else {
          localStorage.removeItem(WORKSTATION_KEY);
        }
      }
    } catch (e) {
      console.warn("Failed to read remembered workstation", e);
    }
    return null;
  },

  /**
   * Checks if there is an active valid session
   */
  getCurrentUser() {
    try {
      // Check session storage first
      const sessionData = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (sessionData) {
        const user = JSON.parse(sessionData);
        if (new Date(user.expiresAt).getTime() > Date.now()) {
          return user;
        }
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      }

      // Check persistent local storage if workstation was remembered
      const localData = localStorage.getItem(AUTH_STORAGE_KEY);
      if (localData) {
        const user = JSON.parse(localData);
        if (new Date(user.expiresAt).getTime() > Date.now()) {
          // Rehydrate session storage for faster access
          sessionStorage.setItem(AUTH_STORAGE_KEY, localData);
          return user;
        }
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to retrieve current user session", e);
    }
    return null;
  },

  /**
   * Returns true if user has an active session
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  /**
   * Authenticate against ArcGIS Enterprise directory
   */
  async login({
    username,
    password,
    rememberWorkstation = true,
    portalUrl = "umbc.maps.arcgis.com",
  }: {
    username: string;
    password: string;
    rememberWorkstation?: boolean;
    portalUrl?: string;
  }) {
    // Basic validation
    const trimmedUser = username.trim();
    if (!trimmedUser) {
      throw new Error("ArcGIS Enterprise username / domain is required.");
    }
    if (!password || password.trim().length === 0) {
      throw new Error("Institutional key / password is required.");
    }

    // Simulate enterprise directory verification delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const ttl = rememberWorkstation ? DEFAULT_TTL_MS : SESSION_TTL_MS;
    const expiresAt = new Date(Date.now() + ttl).toISOString();

    const formattedDisplay = trimmedUser.includes("@")
      ? trimmedUser.split("@")[0].replace(/[._]/g, " ").toUpperCase()
      : trimmedUser.toUpperCase();

    const user = {
      username: trimmedUser,
      displayName: formattedDisplay,
      email: trimmedUser.includes("@") ? trimmedUser : `${trimmedUser}@umbc.edu`,
      role: "MS4 Lead Telemetry Operator",
      lab: "BLDG TRC 204 // Hydrology GIS Lab",
      portal: portalUrl,
      workstationBound: rememberWorkstation,
      authenticatedAt: new Date().toISOString(),
      expiresAt,
      token: "esri-token-" + Math.random().toString(36).substring(2, 15),
    };

    const serialized = JSON.stringify(user);
    sessionStorage.setItem(AUTH_STORAGE_KEY, serialized);

    if (rememberWorkstation) {
      localStorage.setItem(AUTH_STORAGE_KEY, serialized);
      localStorage.setItem(
        WORKSTATION_KEY,
        JSON.stringify({
          username: trimmedUser,
          expiresAt,
        })
      );
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(WORKSTATION_KEY);
    }

    return user;
  },

  /**
   * Logs out the user and clears all session data
   */
  logout() {
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      // We keep the remembered username in WORKSTATION_KEY for easy re-login if desired,
      // but invalidate active auth token
    } catch (e) {
      console.warn("Error during logout", e);
    }
  },
};
