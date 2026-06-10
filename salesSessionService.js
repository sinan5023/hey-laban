// src/services/salesSessionService.js
import api from "./api";

export async function getTodaySalesSession() {
  const response = await api.get("/api/sales-session/today");
  return response.data.data;
}

export async function openSalesSession(payload) {
  const response = await api.post("/api/sales-session", payload);
  return response.data.data;
}

export async function closeTodaySalesSession(payload) {
  const response = await api.patch("/api/sales-session", payload);
  return response.data.data;
}

export async function getSalesSessionOverview(preset) {
  const response = await api.get("/api/sales-session/overview", {
    params: { preset },
  });
  return response.data.data;
}