// src/store/sessionStore.js
import { create } from "zustand";
import {
  getTodaySalesSession,
  openSalesSession,
  closeTodaySalesSession,
} from "../services/salesSessionService";

export const useSessionStore = create((set) => ({
  todaySession: null,
  isSessionChecked: false,

  setTodaySession: (session) =>
    set({ todaySession: session, isSessionChecked: true }),

  clearTodaySession: () =>
    set({ todaySession: null, isSessionChecked: false }),

  fetchTodaySession: async () => {
    try {
      const session = await getTodaySalesSession();
      set({ todaySession: session, isSessionChecked: true });
      return session;
    } catch (error) {
      // Session doesn't exist or is closed — that's fine,
      // the middleware on order/kot/payment endpoints will enforce access.
      set({ todaySession: null, isSessionChecked: true });
      return null;
    }
  },

  openTodaySession: async (payload) => {
    try {
      const session = await openSalesSession(payload);
      set({ todaySession: session, isSessionChecked: true });
      return session;
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || "";

      const alreadyExists =
        status === 409 &&
        message.includes("already exists");

      if (alreadyExists) {
        const existingSession = await getTodaySalesSession();
        set({ todaySession: existingSession, isSessionChecked: true });
        return existingSession;
      }

      throw error;
    }
  },

  closeSession: async (payload) => {
    const session = await closeTodaySalesSession(payload);
    set({ todaySession: null, isSessionChecked: true });
    return session;
  },
}));