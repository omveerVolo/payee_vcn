const browser = typeof window !== "undefined";

function loadAuth() {
  if (browser) {
    const stored = localStorage.getItem("authUser");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Secure true authentication identity, delegating mock targets towards viewingAs
        return {
          isLoggedIn: true,
          user: data.user,
          viewingAs: data.viewingAs || null,
          isAdminView: data.isAdminView || false,
        };
      } catch (e) {
        // ignore invalid cache
      }
    }
  }
  return {
    isLoggedIn: false,
    user: /** @type {any} */ (null),
    viewingAs: null,
    isAdminView: false,
  };
}

export const authState = $state(loadAuth());

/**
 * @param {Partial<{id: string, name: string, email: string, role: string, hasData: boolean}> | any} [userOverrides]
 */
export function login(userOverrides) {
  authState.isLoggedIn = true;
  if (userOverrides) {
    authState.user = /** @type {any} */ ({
      ...authState.user,
      ...userOverrides,
    });
    if (browser) {
      localStorage.setItem(
        "authUser",
        JSON.stringify({
          user: authState.user,
          viewingAs: authState.viewingAs,
          isAdminView: authState.isAdminView,
        }),
      );
    }
  }
}

export function logout() {
  authState.isLoggedIn = false;
  authState.user = /** @type {any} */ (null);
  authState.viewingAs = null;
  authState.isAdminView = false;
  if (browser) {
    localStorage.removeItem("authUser");
  }
}

/**
 * @param {any} targetUser
 */
export function startViewing(targetUser) {
  if (authState.user?.role === "admin" && targetUser) {
    authState.viewingAs = targetUser;
    authState.isAdminView = true;
    if (browser) {
      localStorage.setItem(
        "authUser",
        JSON.stringify({
          user: authState.user,
          viewingAs: authState.viewingAs,
          isAdminView: authState.isAdminView,
        }),
      );
    }
  }
}

export function stopViewing() {
  if (authState.isAdminView) {
    authState.viewingAs = null;
    authState.isAdminView = false;
    if (browser) {
      localStorage.setItem(
        "authUser",
        JSON.stringify({
          user: authState.user,
          viewingAs: null,
          isAdminView: false,
        }),
      );
    }
  }
}
