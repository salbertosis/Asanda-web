import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getCurrentSession,
  getStaffProfile,
  onStaffAuthChange,
  requestPasswordReset,
  signInStaff,
  signOutStaff,
  updateStaffPassword,
} from "../services/admin/auth";

const AdminSessionContext = createContext(null);

export const AdminSessionProvider = ({ children }) => {
  const [state, setState] = useState({ status: "loading", profile: null });
  const passwordRecoveryActive = useRef(false);
  const generation = useRef(0);
  const currentUserId = useRef(null);
  const active = useRef(true);

  const revokeAuthority = (status = "anonymous") => {
    generation.current += 1;
    currentUserId.current = null;
    if (active.current) setState({ status, profile: null });
  };

  const beginResolution = (session) => {
    const userId = session?.user?.id;
    if (typeof userId !== "string" || !userId.trim()) {
      revokeAuthority(session?.user ? "unavailable" : "anonymous");
      return null;
    }
    if (currentUserId.current !== userId) generation.current += 1;
    currentUserId.current = userId;
    const fence = { generation: generation.current, userId };
    if (active.current) setState({ status: "loading", profile: null });
    return fence;
  };

  const fenceIsCurrent = (fence) =>
    active.current &&
    fence?.generation === generation.current &&
    fence.userId === currentUserId.current;

  const resolveSession = async (session, fence = beginResolution(session)) => {
    if (!fence) return session?.user ? "unavailable" : "anonymous";

    try {
      const profile = await getStaffProfile(fence.userId);
      if (!fenceIsCurrent(fence)) return "stale";
      if (!profile || profile.id !== fence.userId) {
        setState({ status: "denied", profile: null });
        return "denied";
      }
      setState({ status: "authorized", profile });
      return "authorized";
    } catch {
      if (!fenceIsCurrent(fence)) return "stale";
      setState({ status: "unavailable", profile: null });
      return "unavailable";
    }
  };

  useEffect(() => {
    active.current = true;
    getCurrentSession()
      .then(({ data }) => {
        if (active.current && !passwordRecoveryActive.current)
          resolveSession(data?.session);
      })
      .catch(() => revokeAuthority("unavailable"));

    const { data: subscription } = onStaffAuthChange((event, session) => {
      if (!active.current) return;
      if (event === "PASSWORD_RECOVERY") {
        passwordRecoveryActive.current = true;
        revokeAuthority("password_recovery");
        return;
      }
      if (event === "SIGNED_OUT" || !session?.user) {
        passwordRecoveryActive.current = false;
        revokeAuthority("anonymous");
        return;
      }
      if (passwordRecoveryActive.current) return;
      const fence = beginResolution(session);
      window.setTimeout(() => resolveSession(session, fence), 0);
    });

    return () => {
      active.current = false;
      generation.current += 1;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await signInStaff(email, password);
    if (error || !data?.session) throw new Error("AUTH_FAILED");
    const fence = beginResolution(data.session);
    const status = await resolveSession(data.session, fence);
    if (status !== "authorized") {
      if (fenceIsCurrent(fence)) {
        revokeAuthority(status === "unavailable" ? "unavailable" : "denied");
        try {
          await signOutStaff();
        } catch {
          // Local authority is already revoked; a later sign-in can retry remote cleanup.
        }
      }
      throw new Error("AUTH_FAILED");
    }
  };

  const signOut = async () => {
    passwordRecoveryActive.current = false;
    revokeAuthority();
    try {
      await signOutStaff();
    } catch {
      // Fail closed locally even when the remote session cannot be cleared.
    }
  };

  const updatePassword = async (password) => {
    const { error } = await updateStaffPassword(password);
    if (error) throw error;

    passwordRecoveryActive.current = false;
    revokeAuthority();
    await signOutStaff();
  };

  return (
    <AdminSessionContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
        requestPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
};

export const useAdminSession = () => {
  const value = useContext(AdminSessionContext);
  if (!value)
    throw new Error(
      "useAdminSession must be used inside AdminSessionProvider.",
    );
  return value;
};
