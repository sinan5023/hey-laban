// src/pages/CloseSalesPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../store/sessionStore";
import { getSalesSessionOverview } from "../services/salesSessionService";

function CloseSalesPage() {
  const navigate = useNavigate();
  const closeSession = useSessionStore((state) => state.closeSession);

  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const [closingNote, setClosingNote] = useState("");
  const [expenses, setExpenses] = useState([
    { categoryName: "COGS", amount: "", note: "" },
    { categoryName: "Salary/Wages", amount: "", note: "" },
    { categoryName: "Rent (Daily Avg)", amount: "", note: "" },
    { categoryName: "Utilities", amount: "", note: "" },
    { categoryName: "Packaging", amount: "", note: "" },
    { categoryName: "Miscellaneous", amount: "", note: "" },
  ]);
  const [confirmed, setConfirmed] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeError, setCloseError] = useState("");

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const data = await getSalesSessionOverview("current");
        setOverview(data);
      } catch (err) {
        setOverviewError(err?.response?.data?.message || "Failed to load session overview.");
      } finally {
        setOverviewLoading(false);
      }
    };
    fetchOverview();
  }, []);

  const formatMoney = (v) => {
    const n = Number(v || 0);
    return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const formatPeakHour = (ph) => {
    if (!ph) return "—";
    const h = ph.hour;
    const start = h % 12 === 0 ? 12 : h % 12;
    const end = (h + 2) % 12 === 0 ? 12 : (h + 2) % 12;
    const sp = h < 12 ? "am" : "pm";
    const ep = (h + 2) < 12 || (h + 2) >= 24 ? "am" : "pm";
    return `${start}${sp} - ${end}${ep}`;
  };

  const handleExpenseChange = (index, field, value) => {
    setExpenses((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const s = overview?.summary;
  const sess = overview?.session;

  const totalRevenue = Number(s?.totalRevenue || 0);
  const openingCash = Number(sess?.openingCash || 0);
  const grossProfit = totalRevenue - totalExpenses;

  const handleClose = async () => {
    if (!confirmed) {
      setCloseError("Please confirm the checkbox before closing.");
      return;
    }
    setCloseError("");

    const cleanedExpenses = expenses
      .filter((e) => e.categoryName.trim() && Number(e.amount || 0) > 0)
      .map((e) => ({
        categoryName: e.categoryName.trim(),
        amount: Number(e.amount),
        note: e.note.trim() || null,
      }));

    try {
      setCloseLoading(true);
      await closeSession({
        closingNote: closingNote.trim() || null,
        expenses: cleanedExpenses,
      });
      navigate("/open-sales", { replace: true });
    } catch (err) {
      setCloseError(err?.response?.data?.message || "Failed to close session.");
    } finally {
      setCloseLoading(false);
    }
  };

  if (overviewLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fef9f2]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#ded9d3] border-t-[#3d0c02]" />
          <p className="text-sm font-semibold text-[#54433f]">Loading session data…</p>
        </div>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fef9f2] px-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-center text-red-700">
          {overviewError}
        </div>
        <button type="button" onClick={() => navigate("/pos")} className="text-sm font-bold text-[#3d0c02] underline">
          Back to POS
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fef9f2] pb-32 font-[Plus_Jakarta_Sans] antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-[#fef9f2] px-6 py-4 shadow-[0_4px_8px_rgba(61,12,2,0.08)]">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate("/pos")} className="flex h-12 w-12 items-center justify-center rounded-full transition hover:bg-[#e6e2db]">
            <span className="text-2xl text-[#0e0100]">←</span>
          </button>
          <div>
            <h1 className="text-[24px] font-bold text-[#0e0100]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>Close Sales</h1>
            <p className="text-[12px] font-semibold text-[#54433f]">End today's billing session</p>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#d9c1bc] bg-[#e6e2db]">
          <span className="text-sm text-[#54433f]">👤</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6 md:col-span-8">
            {/* Status Card */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#d9c1bc]/30 bg-[#fef9f2] p-5 shadow-[0_4px_8px_rgba(61,12,2,0.08)] md:flex-row md:items-center">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#c4f6c9] px-3 py-1 text-[14px] font-bold text-[#002107]">
                  <span>✓</span> Ready to Close
                </div>
                <h2 className="mt-1 text-[24px] font-bold text-[#0e0100]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
                  {formatDate(sess?.sessionDate)}
                </h2>
              </div>
              <div className="flex flex-wrap gap-4 md:gap-6">
                <div className="flex min-w-[140px] flex-col rounded-xl border border-[#d9c1bc]/20 bg-[#f8f3ec] p-4">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider opacity-80">Opening Session</p>
                  <p className="text-[11px] font-bold uppercase text-[#54433f]">Opened At: <span className="text-[#0e0100]">{formatTime(sess?.openedAt)}</span></p>
                  <p className="text-[11px] font-bold uppercase text-[#54433f]">Opened By: <span className="text-[#0e0100]">{sess?.openedBy?.name || "—"}</span></p>
                  <p className="text-[11px] font-bold uppercase text-[#54433f]">Petty Cash: <span className="text-[#0e0100]">{formatMoney(sess?.openingCash)}</span></p>
                </div>
              </div>
            </div>

            {/* Sales Overview */}
            <div className="rounded-2xl border border-[#d9c1bc]/30 bg-[#fef9f2] p-5 shadow-[0_4px_8px_rgba(61,12,2,0.08)]">
              <h3 className="mb-4 flex items-center gap-2 text-[18px] font-bold text-[#0e0100]">
                📊 Sales Overview
              </h3>
              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl bg-[#f2ede6] p-4 text-center">
                  <p className="text-[12px] font-semibold uppercase text-[#54433f]">Total Orders</p>
                  <p className="text-[32px] font-bold text-[#0e0100]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>{s?.totalOrders || 0}</p>
                </div>
                <div className="rounded-xl border border-green-200/40 bg-green-50/30 p-4 text-center">
                  <p className="text-[12px] font-semibold uppercase text-[#146c2e]">Completed</p>
                  <p className="text-[32px] font-bold text-[#146c2e]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>{s?.completedOrders || 0}</p>
                </div>
                <div className="rounded-xl border border-red-200/40 bg-red-50/30 p-4 text-center">
                  <p className="text-[12px] font-semibold uppercase text-[#ba1a1a]">Cancelled</p>
                  <p className="text-[32px] font-bold text-[#ba1a1a]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>{s?.cancelledOrders || 0}</p>
                </div>
                <div className="rounded-xl border border-amber-200/40 bg-amber-50/30 p-4 text-center">
                  <p className="text-[12px] font-semibold uppercase text-[#815500]">Unpaid/Due</p>
                  <p className="text-[32px] font-bold text-[#815500]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>{s?.dueOrders || 0}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-12 gap-y-6 rounded-xl border border-[#e6e2db] bg-[#f8f3ec] p-6">
                <div>
                  <p className="text-[12px] font-semibold uppercase text-[#54433f]">Total Revenue</p>
                  <p className="mt-1 text-[48px] font-extrabold tracking-tight text-[#0e0100]" style={{ fontFamily: "Hanken Grotesk, sans-serif", letterSpacing: "-0.02em" }}>{formatMoney(s?.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold uppercase text-[#54433f]">Avg. Order Value</p>
                  <p className="mt-1 text-[32px] font-bold text-[#0e0100]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>{formatMoney(s?.averageOrderValue)}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold uppercase text-[#54433f]">Peak Hour</p>
                  <p className="mt-1 pt-1 text-[24px] font-bold text-[#0e0100]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>{formatPeakHour(s?.peakHour)}</p>
                </div>
              </div>
            </div>

            {/* Payments & Drawer */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[#d9c1bc]/30 bg-[#fef9f2] p-5 shadow-[0_4px_8px_rgba(61,12,2,0.08)]">
                <h3 className="mb-4 flex items-center gap-2 text-[18px] font-bold text-[#0e0100]">💰 Collections</h3>
                <div className="space-y-4">
                  <div className="flex items-end justify-between border-b border-[#e6e2db] pb-3">
                    <span className="text-[16px] text-[#54433f]">Total Collected</span>
                    <span className="text-[24px] font-bold text-[#0e0100]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>{formatMoney(s?.collections?.totalCollected)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#54433f]">💵 Cash</span>
                    <span className="font-bold">{formatMoney(s?.collections?.cashCollected)}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 text-sm">
                    <span className="text-[#54433f]">📱 UPI</span>
                    <span className="font-bold">{formatMoney(s?.collections?.upiCollected)}</span>
                  </div>
                  <div className="mt-2 flex items-end justify-between rounded-lg bg-red-50/60 p-3">
                    <span className="text-[14px] font-bold text-[#ba1a1a]">Outstanding Liability</span>
                    <span className="text-[20px] font-bold text-[#ba1a1a]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>{formatMoney(s?.outstandingLiability)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-[#ffddb2] p-5 text-center shadow-[0_4px_8px_rgba(61,12,2,0.08)]">
                <span className="mb-2 text-4xl opacity-80">🖨️</span>
                <p className="text-[14px] font-bold uppercase tracking-wider opacity-80">Expected Cash in Drawer</p>
                <p className="text-[48px] font-extrabold" style={{ fontFamily: "Hanken Grotesk, sans-serif", letterSpacing: "-0.02em" }}>{formatMoney(s?.cashDrawer?.expectedCashInDrawer)}</p>
                <p className="mt-4 rounded-full bg-white/30 px-3 py-1 text-[12px] font-semibold">Includes opening petty cash and today's cash collections</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6 md:col-span-4">
            {/* P&L Hero */}
            <div className="rounded-2xl bg-[#3d0c02] p-5 text-[#bf715c] shadow-[0_8px_16px_rgba(61,12,2,0.12)]">
              <h3 className="mb-4 flex items-center gap-2 text-[18px] font-bold opacity-90">📈 Final Profit & Loss</h3>
              <div className="mb-6 space-y-3">
                <div className="flex justify-between opacity-80"><span>Total Revenue</span><span>{formatMoney(totalRevenue)}</span></div>
                <div className="flex justify-between text-[#ffdad6] opacity-80"><span>Total Expenses</span><span>- {formatMoney(totalExpenses)}</span></div>
                <div className="flex justify-between text-[#ffdad6] opacity-80"><span>Opening Petty Cash</span><span>- {formatMoney(openingCash)}</span></div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#fef9f2]/10 p-4 text-center">
                <p className="mb-1 text-[12px] font-semibold uppercase tracking-wider">Estimated Net Profit</p>
                <p className="text-[32px] font-bold text-[#c4f6c9]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>{formatMoney(grossProfit - openingCash)}</p>
                {totalRevenue > 0 && (
                  <div className="mt-2 inline-block rounded bg-white/20 px-2 py-0.5 text-xs font-bold">
                    Margin: {((grossProfit - openingCash) / totalRevenue * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>

            {/* Daily Expenses */}
            <div className="flex-grow rounded-2xl border border-[#d9c1bc]/30 bg-[#fef9f2] p-5 shadow-[0_4px_8px_rgba(61,12,2,0.08)]">
              <h3 className="mb-4 flex items-center gap-2 text-[18px] font-bold text-[#0e0100]">🧾 Daily Expenses</h3>
              <div className="space-y-4">
                {expenses.map((expense, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <label className="w-1/2 text-[14px] font-bold text-[#54433f]">{expense.categoryName}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={expense.amount}
                      onChange={(e) => handleExpenseChange(index, "amount", e.target.value)}
                      placeholder="₹0"
                      className="w-1/2 rounded-lg border border-[#d9c1bc] bg-[#fef9f2] p-2 text-right text-[16px] text-[#0e0100] outline-none focus:border-[#3d0c02] focus:ring-1 focus:ring-[#3d0c02]"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-[#d9c1bc]/30 bg-[#f8f3ec]/50 p-2 opacity-70">
                  <label className="flex w-1/2 items-center gap-1 text-[14px] font-bold text-[#54433f]">Opening Petty Cash ℹ️</label>
                  <div className="w-1/2 pr-3 text-right text-[16px] text-[#54433f]">{formatMoney(openingCash)}</div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-[#e6e2db] pt-4">
                  <span className="text-[14px] font-bold text-[#0e0100]">Total Expenses</span>
                  <span className="text-[24px] font-bold text-[#ba1a1a]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>{formatMoney(totalExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="rounded-2xl border border-[#ba1a1a]/30 bg-red-50/60 p-5">
              <h4 className="mb-2 flex items-center gap-2 text-[14px] font-bold text-[#ba1a1a]">
                ⚠️ Final Closing Warning
              </h4>
              <p className="mb-4 text-sm text-[#54433f]">
                Closing the sales session will lock all transactions for today. Modifications will require administrator override.
                Once closed, opening cash, expenses, COGS, and the profit summary will be locked for this date.
              </p>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-[#d9c1bc] text-[#3d0c02] focus:ring-[#3d0c02]"
                />
                <span className="text-[12px] font-semibold text-[#0e0100]">
                  I confirm that today's sales and costs have been reviewed and are accurate.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Closing Note */}
        <div className="rounded-2xl border border-[#d9c1bc]/30 bg-[#fef9f2] p-5 shadow-[0_4px_8px_rgba(61,12,2,0.08)]">
          <label className="mb-2 block text-sm font-bold text-[#0e0100]">Closing Note (Optional)</label>
          <textarea
            rows="3"
            value={closingNote}
            onChange={(e) => setClosingNote(e.target.value)}
            placeholder="Any remarks about today's session…"
            className="w-full resize-none rounded-xl border-2 border-[#d9c1bc] bg-[#fef9f2] p-4 text-[16px] outline-none transition-colors focus:border-[#3d0c02]"
          />
        </div>

        {closeError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{closeError}</div>
        )}
      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#d9c1bc]/20 bg-[#fef9f2] p-4 shadow-[0_-4px_16px_rgba(61,12,2,0.05)]">
        <div className="mx-auto flex max-w-7xl justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/pos")}
            className="rounded-lg border border-[#3d0c02] px-6 py-3 text-[14px] font-bold text-[#3d0c02] transition hover:bg-[#3d0c02]/5 active:scale-[0.98]"
            style={{ minHeight: 48 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={closeLoading || !confirmed}
            className={`flex items-center gap-2 rounded-lg px-8 py-3 text-[14px] font-bold shadow-[0_4px_8px_rgba(61,12,2,0.08)] transition-all active:scale-[0.98] ${
              closeLoading || !confirmed
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : "bg-[#feb234] text-[#6d4700] hover:brightness-95"
            }`}
            style={{ minHeight: 48 }}
          >
            🔒 {closeLoading ? "Closing…" : "Complete Closing"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CloseSalesPage;
