// src/pages/OpenSalesPage.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../store/sessionStore";
import { getSalesSessionOverview } from "../services/salesSessionService";

function OpenSalesPage() {
  const navigate = useNavigate();
  const openTodaySession = useSessionStore((state) => state.openTodaySession);
  const fetchTodaySession = useSessionStore((state) => state.fetchTodaySession);

  const [openingCash, setOpeningCash] = useState("0");
  const [openingNote, setOpeningNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  // Previous session overview
  const [prevOverview, setPrevOverview] = useState(null);
  const [prevLoading, setPrevLoading] = useState(true);

  const quickAmounts = [500, 1000, 1500, 2000];

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const todayDate = useMemo(() => {
    return formatDate(new Date().toISOString());
  }, []);

  // Format currency
  const formatMoney = (value) => {
    const num = Number(value || 0);
    return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Check if session already open
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await fetchTodaySession();
        if (session?.status === "OPEN") {
          navigate("/pos", { replace: true });
          return;
        }
      } catch {
        // ignore — page stays in open-sales
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [fetchTodaySession, navigate]);

  // Fetch previous session overview
  useEffect(() => {
    const fetchPrev = async () => {
      try {
        const data = await getSalesSessionOverview("previous");
        setPrevOverview(data);
      } catch {
        // no previous session — that's okay
        setPrevOverview(null);
      } finally {
        setPrevLoading(false);
      }
    };
    fetchPrev();
  }, []);

  const handleQuickAmount = (amount) => {
    setOpeningCash(String(amount));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const parsedCash = Number(openingCash);

    if (Number.isNaN(parsedCash) || parsedCash < 0) {
      setError("Please enter a valid opening cash amount.");
      return;
    }

    try {
      setLoading(true);

      const session = await openTodaySession({
        openingCash: parsedCash,
        openingNote: openingNote.trim() || null,
      });

      if (session?.status === "OPEN") {
        navigate("/pos", { replace: true });
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to open sales session.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Checklist state
  const cashEntered = Number(openingCash) > 0;

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fef9f2]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#ded9d3] border-t-[#3d0c02]" />
          <p className="text-sm font-semibold text-[#54433f]">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fef9f2] pb-32 font-[Plus_Jakarta_Sans]">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-[80px] items-center justify-between bg-[#fef9f2] px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/pos")}
            className="flex h-12 w-12 items-center justify-center rounded-full text-[#3d0c02] transition-colors hover:bg-[#e6e2db]"
          >
            <span className="text-2xl">←</span>
          </button>
          <div>
            <h1 className="text-[24px] font-bold leading-tight text-[#3d0c02]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
              Open Sales
            </h1>
            <p className="text-[12px] font-semibold text-[#54433f]">
              Start today's billing session
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        {/* Section 1: Status */}
        <section className="flex items-start gap-4 rounded-2xl border border-red-200/60 bg-[#ffdad6] p-5 shadow-[0_4px_8px_rgba(61,12,2,0.08)]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ba1a1a] text-white shadow-sm">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
          </div>
          <div>
            <h2 className="mb-1 text-[24px] font-bold text-[#93000a]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>
              Session Closed
            </h2>
            <p className="mb-2 text-[16px] text-[#54433f]">{todayDate}</p>
            <p className="rounded-lg border border-[#d9c1bc]/30 bg-[#f2ede6] p-3 text-[16px] text-[#54433f]">
              Open sales to start billing and print orders. Ensure opening cash is verified.
            </p>
          </div>
        </section>

        {/* Section 2: Opening Cash */}
        <section>
          <h3 className="mb-3 px-2 text-[18px] font-bold text-[#3d0c02]">Opening Cash</h3>
          <div className="rounded-2xl border border-[#e6e2db] bg-white p-5 shadow-[0_4px_8px_rgba(61,12,2,0.08)]">
            <label htmlFor="cash-input" className="block text-[14px] font-bold text-[#1d1c18]">
              Opening petty cash / cash float
            </label>
            <p className="mb-4 text-[16px] text-[#54433f]">
              Enter the physical cash available in the drawer before starting.
            </p>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[24px] font-bold text-[#54433f]" style={{ fontFamily: "Hanken Grotesk, sans-serif" }}>₹</span>
              <input
                id="cash-input"
                type="number"
                min="0"
                step="0.01"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="h-[64px] w-full rounded-xl border-2 border-[#d9c1bc] bg-[#fef9f2] pl-12 pr-4 text-[24px] font-bold outline-none transition-colors focus:border-[#3d0c02]"
                style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleQuickAmount(amount)}
                  className="h-12 rounded-full border border-[#d9c1bc] px-6 text-[14px] font-bold text-[#1d1c18] transition-colors hover:border-[#3d0c02] hover:bg-[#e6e2db] active:scale-[0.98]"
                >
                  ₹{amount}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Opening Note */}
        <section>
          <h3 className="mb-3 px-2 text-[18px] font-bold text-[#3d0c02]">
            Opening Note <span className="text-[12px] font-normal text-[#54433f]">(Optional)</span>
          </h3>
          <div className="rounded-2xl border border-[#e6e2db] bg-white p-5 shadow-[0_4px_8px_rgba(61,12,2,0.08)]">
            <textarea
              rows="3"
              value={openingNote}
              onChange={(e) => setOpeningNote(e.target.value)}
              placeholder="Add any notes regarding the drawer state..."
              className="w-full resize-none rounded-xl border-2 border-[#d9c1bc] bg-[#fef9f2] p-4 text-[16px] outline-none transition-colors focus:border-[#3d0c02]"
            />
          </div>
        </section>

        {/* Section 4: Previous Session */}
        <section>
          <h3 className="mb-3 px-2 text-[18px] font-bold text-[#3d0c02]">Previous Session</h3>
          {prevLoading ? (
            <div className="rounded-2xl border border-[#d9c1bc]/30 bg-[#f2ede6] p-5">
              <div className="flex animate-pulse flex-col gap-3">
                <div className="h-4 w-48 rounded bg-[#ded9d3]" />
                <div className="h-4 w-32 rounded bg-[#ded9d3]" />
                <div className="h-8 w-40 rounded bg-[#ded9d3]" />
              </div>
            </div>
          ) : prevOverview ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-[#d9c1bc]/30 bg-[#f2ede6] p-5 shadow-[0_4px_8px_rgba(61,12,2,0.08)] md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[16px] text-[#54433f]">
                  <span>📅</span>
                  <span>
                    Last closed:{" "}
                    <strong className="text-[#1d1c18]">
                      {formatDate(prevOverview.session?.sessionDate)}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[16px] text-[#54433f]">
                  <span>👤</span>
                  <span>
                    Opened by:{" "}
                    <strong className="text-[#1d1c18]">
                      {prevOverview.session?.openedBy?.name || "—"}
                    </strong>
                  </span>
                </div>
              </div>
              <div className="hidden h-12 w-px bg-[#d9c1bc]/50 md:block" />
              <div className="h-px w-full bg-[#d9c1bc]/50 md:hidden" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div className="col-span-2">
                  <span className="text-[12px] font-semibold text-[#54433f]">Total Sales</span>
                  <div className="text-[18px] font-bold text-[#3d0c02]">
                    {formatMoney(prevOverview.summary?.totalRevenue)}
                  </div>
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-[#54433f]">Cash</span>
                  <div className="text-[16px] font-semibold text-[#1d1c18]">
                    {formatMoney(prevOverview.summary?.collections?.cashCollected)}
                  </div>
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-[#54433f]">UPI</span>
                  <div className="text-[16px] font-semibold text-[#1d1c18]">
                    {formatMoney(prevOverview.summary?.collections?.upiCollected)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#d9c1bc]/30 bg-[#f2ede6] p-5 text-center text-[14px] text-[#54433f]">
              No previous session found.
            </div>
          )}
        </section>

        {/* Section 5: Checklist */}
        <section className="rounded-xl border border-[#d9c1bc]/30 bg-[#e6e2db]/50 p-4">
          <ul className="space-y-2 text-[14px] font-bold text-[#54433f]">
            <li className="flex items-center gap-3">
              {cashEntered ? (
                <span className="text-[#feb234] text-xl">✓</span>
              ) : (
                <span className="text-[#86736e] text-xl">○</span>
              )}
              Opening cash entered
            </li>
            <li className="flex items-center gap-3">
              <span className="text-[#feb234] text-xl">✓</span>
              Printer connected
            </li>
            <li className="flex items-center gap-3">
              {cashEntered ? (
                <span className="text-[#feb234] text-xl">✓</span>
              ) : (
                <span className="text-[#86736e] text-xl">○</span>
              )}
              Ready to begin billing
            </li>
          </ul>
        </section>

        {/* Error */}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 z-50 w-full border-t border-[#e6e2db] bg-white p-4 px-6 shadow-[0_-8px_16px_rgba(61,12,2,0.05)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/pos")}
            className="h-12 rounded-xl border-2 border-[#3d0c02] bg-[#fef9f2] px-8 text-[14px] font-bold text-[#3d0c02] transition-colors hover:bg-[#e6e2db] active:scale-[0.98] active:brightness-90"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`flex h-12 items-center gap-2 rounded-xl px-12 text-[20px] font-bold shadow-[0_4px_8px_rgba(61,12,2,0.08)] transition-all active:scale-[0.98] active:brightness-90 ${
              loading
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : "bg-[#feb234] text-[#3d0c02] hover:brightness-95"
            }`}
            style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
          >
            {loading ? "Opening…" : "Open Sales"}
            {!loading && <span>→</span>}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default OpenSalesPage;