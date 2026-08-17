import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getCurrentSession,
  getStaffProfile,
  onStaffAuthChange,
  requestPasswordReset,
  signInStaff,
  signOutStaff,
} from '../services/admin/auth';

const AdminSessionContext = createContext(null);

export const AdminSessionProvider = ({ children }) => {
  const [state, setState] = useState({ status: 'loading', profile: null });

  const resolveSession = async (session) => {
    if (!session?.user) {
      setState({ status: 'anonymous', profile: null });
      return null;
    }

    try {
      const profile = await getStaffProfile(session.user.id);
      if (!profile) {
        setState({ status: 'denied', profile: null });
        return null;
      }
      setState({ status: 'authorized', profile });
      return profile;
    } catch {
      setState({ status: 'denied', profile: null });
      return null;
    }
  };

  useEffect(() => {
    let active = true;
    getCurrentSession().then(({ data }) => {
      if (active) resolveSession(data.session);
    }).catch(() => {
      if (active) setState({ status: 'anonymous', profile: null });
    });

    const { data: subscription } = onStaffAuthChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        setState({ status: 'anonymous', profile: null });
        return;
      }
      window.setTimeout(() => {
        if (active) resolveSession(session);
      }, 0);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await signInStaff(email, password);
    if (error || !data.session) throw new Error('AUTH_FAILED');
    const profile = await resolveSession(data.session);
    if (!profile) {
      await signOutStaff();
      throw new Error('AUTH_FAILED');
    }
  };

  const signOut = async () => {
    setState({ status: 'loading', profile: null });
    await signOutStaff();
    setState({ status: 'anonymous', profile: null });
  };

  return (
    <AdminSessionContext.Provider value={{ ...state, signIn, signOut, requestPasswordReset }}>
      {children}
    </AdminSessionContext.Provider>
  );
};

export const useAdminSession = () => {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error('useAdminSession must be used inside AdminSessionProvider.');
  return value;
};
