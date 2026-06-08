// src/pages/POSPage.jsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PaymentModal from "../components/pos/PaymentModal";
import { useCartStore } from "../store/cartStore";
import { useSessionStore } from "../store/sessionStore";
import { fetchCatalogue } from "../services/catalogueService";
import { createOrder, updateOrder, createOrderWithKot } from "../services/orderService";
import { createKot } from "../services/kotService";
import { createOrderPayment } from "../services/paymentService";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "../hooks/orders/useDebouncedValue";
import { useTicketSearchQuery } from "../hooks/orders/useTicketSearchQuery";
import OrdersSearchDropdown from "../components/orders/OrdersSearchDropdown";
import { printBoth } from "../utils/printHelpers";

function POSPage() {
  const navigate = useNavigate();

  const [toast, setToast] = useState(null);

  const [kotLoading, setKotLoading] = useState(false);
  const [lastKot, setLastKot] = useState(null);
  const [isCartDirty, setIsCartDirty] = useState(false);

  const [showOrderNote, setShowOrderNote] = useState(false);

  const [saveLoading, setSaveLoading] = useState(false);
  const [lastSavedOrder, setLastSavedOrder] = useState(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCloseSaleModal, setShowCloseSaleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [showDiscountEditor, setShowDiscountEditor] = useState(false);
  const [discountInput, setDiscountInput] = useState("");

  const [closingNote, setClosingNote] = useState("");
  const [expenses, setExpenses] = useState([
    { categoryName: "", amount: "", note: "" },
  ]);
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeError, setCloseError] = useState("");

  const todaySession = useSessionStore((state) => state.todaySession);
  const fetchTodaySession = useSessionStore((state) => state.fetchTodaySession);
  const closeSession = useSessionStore((state) => state.closeSession);
  const discountAmount = useCartStore((state) => state.discountAmount);
  const setDiscountAmount = useCartStore((state) => state.setDiscountAmount);

  const orderType = useCartStore((state) => state.orderType);
  const orderNote = useCartStore((state) => state.orderNote);
  const setOrderType = useCartStore((state) => state.setOrderType);
  const setOrderNote = useCartStore((state) => state.setOrderNote);
  const addToCart = useCartStore((state) => state.addToCart);
  const increaseQty = useCartStore((state) => state.increaseQty);
  const decreaseQty = useCartStore((state) => state.decreaseQty);
  const clearCart = useCartStore((state) => state.clearCart);
  const getCartItems = useCartStore((state) => state.getCartItems);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getTotal = useCartStore((state) => state.getTotal);
  const products = useCartStore((state) => state.products);

  // ─── read cart-restored order from store ────────────────────────────────────
  const currentOrderId = useCartStore((state) => state.currentOrderId);
  const currentOrderNo = useCartStore((state) => state.currentOrderNo);
  const clearCurrentOrder = useCartStore((state) => state.clearCurrentOrder);

  const {
    data: categories = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["catalogue"],
    queryFn: fetchCatalogue,
    staleTime: 5 * 60 * 1000,
  });

  // seed lastSavedOrder from store when navigated from Orders → Go to Cart
  useEffect(() => {
    if (currentOrderId && !lastSavedOrder?.id) {
      setLastSavedOrder({ id: currentOrderId, orderNo: currentOrderNo });
      setIsCartDirty(false);
    }
  }, []); // run only on mount — intentional empty deps

  useEffect(() => {
    if (showDiscountEditor) {
      setDiscountInput(String(discountAmount || ""));
    }
  }, [showDiscountEditor, discountAmount]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    const ensureSession = async () => {
      try {
        const session = todaySession || (await fetchTodaySession());
        if (!session || session.status !== "OPEN") {
          navigate("/open-sales", { replace: true });
        }
      } catch {
        navigate("/open-sales", { replace: true });
      }
    };
    ensureSession();
  }, [todaySession, fetchTodaySession, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const cartItems = useMemo(() => getCartItems(), [products, getCartItems]);
  const subtotal = useMemo(() => getSubtotal(), [products, getSubtotal]);
  const total = useMemo(() => getTotal(), [products, getTotal]);

  useEffect(() => {
    if (lastSavedOrder?.id) {
      setIsCartDirty(true);
    }
  }, [cartItems, orderType, orderNote, discountAmount]);

  const visibleCategories = useMemo(
    () =>
      (categories || [])
        .filter((category) => category.isActive !== false)
        .map((category) => ({
          ...category,
          products: (category.products || []).filter(
            (item) => item.isActive !== false,
          ),
        }))
        .filter((category) => category.products.length > 0),
    [categories],
  );

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const selectedCategory = visibleCategories.find(
      (category) => category.id === selectedCategoryId,
    );

    if (!selectedCategory) return [];

    return (selectedCategory.products || []).filter((product) => {
      if (!normalizedSearch) return true;

      return [product.name, product.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [visibleCategories, selectedCategoryId, searchQuery]);

  const cartQtyMap = useMemo(() => {
    const map = {};
    cartItems.forEach((item) => {
      map[item.id] = item.quantity;
    });
    return map;
  }, [cartItems]);

  const totalCartQty = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const formatMoney = (value) => {
    const numeric = Number(value || 0);
    return numeric.toFixed(2);
  };

  const showToast = ({ type = "success", title, message }) => {
    setToast({
      id: Date.now(),
      type,
      title,
      message,
    });
  };

  const clearToast = () => {
    setToast(null);
  };

  const handleAddExpenseRow = () => {
    setExpenses((prev) => [
      ...prev,
      { categoryName: "", amount: "", note: "" },
    ]);
  };

  const handleRemoveExpenseRow = (index) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExpenseChange = (index, field, value) => {
    setExpenses((prev) =>
      prev.map((expense, i) =>
        i === index ? { ...expense, [field]: value } : expense,
      ),
    );
  };

  const resetCurrentOrderFlow = () => {
    clearCart();
    clearCurrentOrder();
    setLastSavedOrder(null);
    setLastKot(null);
    setIsCartDirty(false);
    setShowOrderNote(false);
    setOrderNote("");
  };

  const shouldClearCartOnLeave = () => {
    return !!lastSavedOrder?.id || !!currentOrderId || !!lastKot?.id;
  };

  const resetCloseModal = () => {
    setClosingNote("");
    setExpenses([{ categoryName: "", amount: "", note: "" }]);
    setCloseError("");
    setShowCloseSaleModal(false);
  };

  const handleConfirmCloseSale = async () => {
    setCloseError("");

    const cleanedExpenses = expenses
      .map((expense) => ({
        categoryName: expense.categoryName.trim(),
        amount: expense.amount === "" ? "" : Number(expense.amount),
        note: expense.note.trim() || null,
      }))
      .filter(
        (expense) =>
          expense.categoryName !== "" ||
          expense.amount !== "" ||
          expense.note !== null,
      );

    for (const expense of cleanedExpenses) {
      if (!expense.categoryName) {
        setCloseError("Expense category name is required.");
        return;
      }
      if (
        expense.amount === "" ||
        Number.isNaN(expense.amount) ||
        expense.amount < 0
      ) {
        setCloseError(
          `Valid amount is required for ${expense.categoryName || "expense"}.`,
        );
        return;
      }
    }

    try {
      setCloseLoading(true);
      await closeSession({
        closingNote: closingNote.trim() || null,
        expenses: cleanedExpenses,
      });
      resetCurrentOrderFlow();
      resetCloseModal();
      navigate("/open-sales", { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to close sales session.";
      setCloseError(message);
    } finally {
      setCloseLoading(false);
    }
  };

  const buildOrderPayload = () => ({
    orderType,
    note: orderNote.trim() || null,
    discountAmount: Number(discountAmount || 0),
    items: cartItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      note: item.note?.trim() || null,
    })),
  });

  const ensureOrderForCart = async () => {
    if (cartItems.length === 0) {
      throw new Error("Please add at least one item.");
    }

    const payload = buildOrderPayload();

    if (!lastSavedOrder?.id) {
      const createdOrder = await createOrder(payload);
      setLastSavedOrder(createdOrder);
      setIsCartDirty(false);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (createdOrder?.id) {
        queryClient.setQueryData(["order", createdOrder.id], createdOrder);
      }
      return createdOrder;
    }

    if (!isCartDirty) {
      return lastSavedOrder;
    }

    const updatedOrder = await updateOrder(lastSavedOrder.id, payload);
    setLastSavedOrder(updatedOrder);
    setIsCartDirty(false);
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    if (updatedOrder?.id) {
      queryClient.setQueryData(["order", updatedOrder.id], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ["order", updatedOrder.id] });
    }
    return updatedOrder;
  };

  const handleSaveOrder = async () => {
    setLastKot(null);

    if (cartItems.length === 0) {
      showToast({
        type: "error",
        title: "Cart empty",
        message: "Add at least one item before saving the order.",
      });
      return;
    }

    try {
      setSaveLoading(true);
      const isNewOrder = !lastSavedOrder?.id;
      const order = await ensureOrderForCart();
      setLastSavedOrder(order);
      setIsCartDirty(false);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (order?.id) {
        queryClient.invalidateQueries({ queryKey: ["order", order.id] });
        queryClient.setQueryData(["order", order.id], order);
      }
      showToast({
        type: "success",
        title: isNewOrder ? "Order saved" : "Order updated",
        message: `${order.orderNo} • Token #${order.tokenNo}`,
      });
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to save order.";
      showToast({
        type: "error",
        title: "Save failed",
        message,
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePrintKOT = async () => {
    setLastKot(null);

    if (cartItems.length === 0 && !lastSavedOrder?.id) {
      showToast({
        type: "error",
        title: "Cart empty",
        message: "Please add items before printing KOT.",
      });
      return;
    }

    try {
      setKotLoading(true);

      let order, kot;

      if (!lastSavedOrder?.id) {
        // ── NEW ORDER: Single API call creates both order + KOT ──
        const payload = {
          ...buildOrderPayload(),
          kotNote: orderNote.trim() || null,
        };
        const result = await createOrderWithKot(payload);
        order = result.order;
        kot = result.kot;
      } else if (isCartDirty) {
        // ── EDITED ORDER: Update order first, then create KOT ──
        order = await ensureOrderForCart();
        kot = await createKot(order.id, {
          note: orderNote.trim() || null,
        });
      } else {
        // ── REPRINT: Order unchanged, just create KOT (1 API call) ──
        order = lastSavedOrder;
        kot = await createKot(order.id, {
          note: orderNote.trim() || null,
        });
      }

      // Fire print IMMEDIATELY
      printBoth(kot, order);

      // Update UI state
      setLastSavedOrder(order);
      setLastKot(kot);
      setIsCartDirty(false);

      showToast({
        type: "success",
        title: kot.status === "REPRINTED" ? "KOT reprinted" : "KOT printed",
        message: `${kot.kotNo} • Times printed: ${kot.timesPrinted}`,
      });

      // Background cache refresh
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (order?.id) {
        queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to print KOT.";
      showToast({
        type: "error",
        title: "KOT failed",
        message,
      });
    } finally {
      setKotLoading(false);
    }
  };

  // payment section
  const [paymentLoading, setPaymentLoading] = useState(false);

  const handleConfirmPayment = async (payload) => {
    try {
      setPaymentLoading(true);
      const order = await ensureOrderForCart();

      if (payload.type === "UNPAID") {
        showToast({
          type: "success",
          title: "Order saved",
          message: `${order.orderNo} saved as unpaid.`,
        });
        setTimeout(() => {
          resetCurrentOrderFlow();
        }, 1000);
        return order;
      }

      const response = await createOrderPayment(order.id, {
        payments: payload.payments,
      });

      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["order", order.id] });

      showToast({
        type: "success",
        title: "Payment completed",
        message: `${response.orderNo || order.orderNo} paid successfully.`,
      });

      setTimeout(() => {
        resetCurrentOrderFlow();
      }, 1000);

      return response;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to complete payment.";
      showToast({ type: "error", title: "Payment failed", message });
      throw err;
    } finally {
      setPaymentLoading(false);
    }
  };

  const [orderSearch, setOrderSearch] = useState("");
  const [kotSearch, setKotSearch] = useState("");

  const debouncedOrder = useDebouncedValue(orderSearch, 300);
  const debouncedKot = useDebouncedValue(kotSearch, 300);

  const normalizedOrderQuery = debouncedOrder
    .trim()
    .toUpperCase()
    .startsWith("ORD-")
    ? debouncedOrder.trim().toUpperCase()
    : "";

  const normalizedKotQuery = debouncedKot
    .trim()
    .toUpperCase()
    .startsWith("KOT-")
    ? debouncedKot.trim().toUpperCase()
    : "";

  const orderSearchQuery = useTicketSearchQuery(
    normalizedOrderQuery,
    !!normalizedOrderQuery,
  );
  const kotSearchQuery = useTicketSearchQuery(
    normalizedKotQuery,
    !!normalizedKotQuery,
  );

  const handleTicketSelect = (result) => {
    const params = new URLSearchParams({
      page: "1",
      limit: "20",
      sortBy: "createdAt",
      sortDir: "DESC",
    });

    if (result.type === "ORDER") {
      params.set("selectedOrderId", result.data.id);
      params.set("selectedOrderNo", result.data.orderNo);
      navigate(`/orders?${params.toString()}`);
      return;
    }

    params.set("selectedOrderId", result.data.order.id);
    params.set("selectedOrderNo", result.data.order.orderNo);
    params.set("selectedKotNo", result.data.kotNo);
    navigate(`/orders?${params.toString()}`);
  };

  const queryClient = useQueryClient();

  const goToOrdersPage = () => {
    const params = new URLSearchParams({
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortDir: "DESC",
    });

    if (lastSavedOrder?.id) {
      params.set("selectedOrderId", lastSavedOrder.id);
      params.set("selectedOrderNo", lastSavedOrder.orderNo);
    }

    if (shouldClearCartOnLeave()) {
      resetCurrentOrderFlow();
    }

    navigate(`/orders?${params.toString()}`);
  };

  const goToSettingsPage = () => {
    if (shouldClearCartOnLeave()) {
      resetCurrentOrderFlow();
    }

    navigate("/settings");
  };

  return (
    <>
      <div className="flex h-screen flex-col overflow-hidden bg-[#fef9f2] text-[#3d0c02]">
        <header className="flex h-[56px] shrink-0 items-center justify-between bg-[#3d0c02] px-6 text-white">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-extrabold tracking-tight">
              Confectionery POS
            </h1>

            <span className="border-l border-white/20 pl-4 text-sm opacity-60">
              {todaySession?.date
                ? new Date(todaySession.date).toLocaleDateString()
                : "Today"}
            </span>

            <div className="ml-4 flex items-center gap-2">
              <div className="relative w-40">
                <input
                  value={kotSearch}
                  onChange={(e) => setKotSearch(e.target.value)}
                  className="h-8 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                  placeholder="Search KOT"
                  type="text"
                />
                <OrdersSearchDropdown
                  open={!!kotSearch.trim()}
                  loading={kotSearchQuery.isLoading}
                  result={kotSearchQuery.data}
                  error={kotSearchQuery.isError}
                  onSelect={(result) => {
                    handleTicketSelect(result);
                    setKotSearch("");
                  }}
                />
              </div>

              <div className="relative w-40">
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="h-8 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                  placeholder="Search Order"
                  type="text"
                />
                <OrdersSearchDropdown
                  open={!!orderSearch.trim()}
                  loading={orderSearchQuery.isLoading}
                  result={orderSearchQuery.data}
                  error={orderSearchQuery.isError}
                  onSelect={(result) => {
                    handleTicketSelect(result);
                    setOrderSearch("");
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              {todaySession?.status || "No Session"}
            </span>

            {todaySession?.openingCash !== undefined && (
              <span className="text-sm opacity-80">
                Opening Cash: ₹{formatMoney(todaySession.openingCash)}
              </span>
            )}

            <button
              type="button"
              className="opacity-80"
              onClick={() => window.location.reload()}
            >
              ↺
            </button>

            <button
              type="button"
              onClick={goToSettingsPage}
              className="opacity-80 transition hover:opacity-100"
              title="Settings"
              aria-label="Open settings"
            >
              ⚙
            </button>

            <button type="button" className="opacity-80">
              👤
            </button>

            <button
              type="button"
              onClick={() => setShowCloseSaleModal(true)}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
            >
              Close Sale
            </button>

            <button
              type="button"
              onClick={goToOrdersPage}
              className="rounded-lg border border-white/30 px-6 py-2 text-sm font-bold"
            >
              Orders
            </button>
          </div>
        </header>

        <main className="flex flex-1 overflow-hidden">
          {/* ── Left: Product catalogue ── */}
          <section className="flex w-[60%] flex-col border-r border-[#ded9d3]">
            <div className="border-b border-[#ded9d3] bg-white/50 p-4">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 w-full rounded-xl bg-[#ece7e1] px-4 text-[#3d0c02] placeholder:text-[#3d0c02]/40 focus:outline-none"
                placeholder="Search products..."
                type="text"
              />
            </div>

            <nav className="bg-white/50 p-4">
              <div className="flex gap-3 overflow-x-auto">
                {isLoading
                  ? [1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-11 w-28 animate-pulse rounded-full bg-[#ece7e1]"
                      />
                    ))
                  : categories.map((category) => (
                      <button
                        type="button"
                        key={category.id}
                        onClick={() => {
                          setSelectedCategoryId(category.id);
                          setSearchQuery("");
                        }}
                        className={`flex min-h-[44px] min-w-[96px] max-w-[140px] items-center justify-center rounded-full px-4 py-2 text-center text-sm font-semibold leading-tight break-words ${
                          selectedCategoryId === category.id
                            ? "bg-[#E8A020] text-white shadow-md"
                            : "border border-[#ded9d3] bg-white text-[#3d0c02]"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
              </div>
            </nav>

            <div className="grid flex-1 grid-cols-3 content-start gap-6 overflow-y-auto p-6">
              {isLoading &&
                [1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="aspect-square animate-pulse rounded-2xl bg-[#ece7e1]"
                  />
                ))}

              {isError && (
                <div className="col-span-3 flex h-full items-center justify-center text-red-500">
                  Failed to load products. Please refresh.
                </div>
              )}

              {!isLoading && !isError && visibleProducts.length === 0 && (
                <div className="col-span-3 flex h-40 items-center justify-center text-[#3d0c02]/40">
                  No products found
                </div>
              )}

              {!isLoading &&
                visibleProducts.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => addToCart(product.id, product)}
                    className="relative flex aspect-square flex-col items-center justify-center gap-4 rounded-2xl bg-white p-6 text-center shadow-[0_4px_12px_rgba(61,12,2,0.08)] active:scale-[0.97]"
                  >
                    {cartQtyMap[product.id] > 0 && (
                      <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#E8A020] text-sm font-bold text-white">
                        {cartQtyMap[product.id]}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold leading-tight">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="mt-1 text-xs text-[#3d0c02]/50">
                          {product.description}
                        </p>
                      )}
                      <p className="mt-2 font-bold text-[#E8A020]">
                        ₹{formatMoney(product.price)}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          </section>

          {/* ── Right: Cart ── */}
          <section className="flex w-[40%] flex-col bg-white">
            {/* Order type tabs */}
            <div className="border-b border-[#ded9d3] bg-[#f8f3ec]/50 p-3">
              <div className="flex items-center overflow-hidden rounded-xl border border-[#ded9d3] bg-white">
                <button
                  type="button"
                  onClick={() => setOrderType("DINE_IN")}
                  className={`flex-1 py-2 text-xs font-bold ${
                    orderType === "DINE_IN"
                      ? "bg-[#E8A020] text-white"
                      : "text-[#3d0c02]/70"
                  }`}
                >
                  Dine in
                </button>
                <div className="h-5 w-px bg-[#ded9d3]" />
                <button
                  type="button"
                  onClick={() => setOrderType("DELIVERY")}
                  className={`flex-1 py-2 text-xs font-bold ${
                    orderType === "DELIVERY"
                      ? "bg-[#E8A020] text-white"
                      : "text-[#3d0c02]/70"
                  }`}
                >
                  Delivery
                </button>
                <div className="h-5 w-px bg-[#ded9d3]" />
                <button
                  type="button"
                  onClick={() => setOrderType("TAKEOUT")}
                  className={`flex-1 py-2 text-xs font-bold ${
                    orderType === "TAKEOUT"
                      ? "bg-[#E8A020] text-white"
                      : "text-[#3d0c02]/70"
                  }`}
                >
                  Takeout
                </button>
              </div>
            </div>

            {/* Cart header */}
            <div className="flex items-center justify-between border-b border-[#ded9d3] px-4 py-2">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold">Cart ({totalCartQty})</h2>
                <button
                  type="button"
                  onClick={() => setShowOrderNote((prev) => !prev)}
                  className="text-xs font-bold text-[#E8A020]"
                >
                  ✎ Add Note
                </button>
              </div>
              <button
                type="button"
                onClick={resetCurrentOrderFlow}
                className="text-xs font-bold text-red-600"
              >
                Clear All
              </button>
            </div>

            {/* Order note textarea */}
            {showOrderNote && (
              <div className="border-b border-[#ded9d3] bg-white px-4 py-2">
                <label className="mb-1 block text-xs font-bold text-[#3d0c02]">
                  Order Note
                </label>
                <textarea
                  rows="2"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Example: No onion, urgent order..."
                  className="w-full rounded-xl border border-[#ded9d3] bg-[#fef9f2] p-2 text-xs outline-none focus:border-[#E8A020]"
                />
              </div>
            )}

            {/* ── Cart items list — flex-1 so it takes all remaining space ── */}
            <div className="flex-1 space-y-2 overflow-y-auto bg-[#f8f3ec]/30 p-3">
              {cartItems.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#ded9d3] bg-white p-8 text-center text-gray-500 text-sm">
                  No items in cart
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#ded9d3] bg-white p-3 shadow-[0_2px_8px_rgba(61,12,2,0.06)]"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold leading-tight">
                          {item.name}
                        </h4>
                        {item.description ? (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-sm font-bold">
                        ₹{formatMoney(item.total)}
                      </span>
                    </div>

                    <div className="flex justify-end">
                      <div className="flex items-center gap-3 rounded-lg border border-[#ded9d3] bg-[#fef9f2] p-1">
                        <button
                          type="button"
                          onClick={() => decreaseQty(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-[#ded9d3] bg-white text-sm"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-base font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increaseQty(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-[#ded9d3] bg-white text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── Summary + buttons — compact, shrink-0 so it never grows ── */}
            <div className="shrink-0 border-t border-[#ded9d3] bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
              <div className="mb-2 space-y-1.5">
                {/* Order type row */}
                <div className="flex justify-between text-xs">
                  <span className="opacity-70">Order Type</span>
                  <span className="font-bold">
                    {orderType.replace("_", " ")}
                  </span>
                </div>

                {/* Subtotal */}
                <div className="flex justify-between text-xs">
                  <span className="opacity-70">Subtotal</span>
                  <span>₹{formatMoney(subtotal)}</span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70">Discount</span>
                    <button
                      type="button"
                      onClick={() => setShowDiscountEditor((prev) => !prev)}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-[#ded9d3] bg-[#f8f3ec] text-xs text-[#3d0c02]"
                      title="Edit discount"
                    >
                      ✎
                    </button>
                  </div>
                  <span className="font-semibold text-green-700">
                    -₹{formatMoney(discountAmount)}
                  </span>
                </div>

                {/* Discount editor */}
                {showDiscountEditor && (
                  <div className="rounded-xl border border-[#ded9d3] bg-[#f8f3ec] p-2">
                    <label className="mb-1 block text-xs font-bold text-[#3d0c02]">
                      Discount Amount
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        placeholder="Enter discount"
                        className="h-9 flex-1 rounded-xl border border-[#ded9d3] bg-white px-3 text-sm outline-none focus:border-[#E8A020]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextDiscount = Math.min(
                            Number(discountInput || 0),
                            Number(subtotal || 0),
                          );
                          setDiscountAmount(nextDiscount);
                          setShowDiscountEditor(false);
                        }}
                        className="rounded-xl bg-[#E8A020] px-3 text-sm font-bold text-white"
                      >
                        Save
                      </button>
                    </div>
                    {discountAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountAmount(0);
                          setDiscountInput("");
                          setShowDiscountEditor(false);
                        }}
                        className="mt-1.5 text-xs font-bold text-red-600"
                      >
                        Remove discount
                      </button>
                    )}
                  </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between border-t border-dashed border-[#ded9d3] pt-2">
                  <span className="text-base font-bold">Total</span>
                  <span className="text-2xl font-extrabold text-[#3d0c02]">
                    ₹{formatMoney(total)}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                {/* Print KOT */}
                <button
                  type="button"
                  onClick={handlePrintKOT}
                  disabled={
                    (cartItems.length === 0 && !lastSavedOrder?.id) ||
                    kotLoading
                  }
                  className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 text-sm font-bold ${
                    (cartItems.length === 0 && !lastSavedOrder?.id) ||
                    kotLoading
                      ? "cursor-not-allowed border-gray-300 text-gray-400"
                      : "border-[#3d0c02] text-[#3d0c02]"
                  }`}
                >
                  {kotLoading ? "Printing KOT..." : "Print KOT"}
                </button>

                {/* Collect Payment + Save */}
                <div className="flex h-12 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    disabled={cartItems.length === 0}
                    className={`flex-1 rounded-xl text-sm font-extrabold text-white shadow-lg ${
                      cartItems.length === 0
                        ? "cursor-not-allowed bg-gray-300"
                        : "bg-[#E8A020]"
                    }`}
                  >
                    Collect Payment
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveOrder}
                    disabled={cartItems.length === 0 || saveLoading}
                    className={`flex-1 rounded-xl text-sm font-extrabold text-white shadow-lg ${
                      cartItems.length === 0 || saveLoading
                        ? "cursor-not-allowed bg-gray-300"
                        : "bg-green-600"
                    }`}
                  >
                    {saveLoading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ── Close Sale Modal ── */}
        {showCloseSaleModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#3a0a01]/60 p-4">
            <div className="w-full max-w-[640px] rounded-2xl border border-[#ded9d3] bg-[#fef9f2] shadow-2xl">
              <div className="flex flex-col gap-6 p-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#3d0c02]">
                    Close Sale for Today?
                  </h2>
                  <p className="mt-1 text-sm text-[#54433f]">
                    Review summary, add note and expenses, then confirm.
                  </p>
                </div>

                <div className="space-y-3 rounded-xl border border-[#ded9d3]/50 bg-[#f8f3ec] p-4">
                  <div className="flex justify-between">
                    <span>Session Status</span>
                    <span className="font-bold">
                      {todaySession?.status || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Opening Cash</span>
                    <span className="font-bold">
                      ₹{formatMoney(todaySession?.openingCash)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cart Items</span>
                    <span className="font-bold">{totalCartQty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Cart Total</span>
                    <span className="font-bold">₹{formatMoney(total)}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#ded9d3] bg-white p-4">
                  <label className="mb-2 block text-sm font-bold text-[#3d0c02]">
                    Closing Note
                  </label>
                  <textarea
                    rows="3"
                    value={closingNote}
                    onChange={(e) => setClosingNote(e.target.value)}
                    placeholder="Cash counted and day closed..."
                    className="w-full rounded-xl border border-[#ded9d3] p-3 outline-none focus:border-[#E8A020]"
                  />
                </div>

                <div className="rounded-xl border border-[#ded9d3] bg-white p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold">Session Expenses</h3>
                    <button
                      type="button"
                      onClick={handleAddExpenseRow}
                      className="rounded-lg bg-[#E8A020] px-4 py-2 text-sm font-bold text-white"
                    >
                      Add Row
                    </button>
                  </div>

                  <div className="space-y-4">
                    {expenses.map((expense, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-[#ded9d3] bg-[#f8f3ec]/40 p-4"
                      >
                        <div className="grid gap-3 md:grid-cols-3">
                          <input
                            type="text"
                            value={expense.categoryName}
                            onChange={(e) =>
                              handleExpenseChange(
                                index,
                                "categoryName",
                                e.target.value,
                              )
                            }
                            placeholder="Category name"
                            className="rounded-xl border border-[#ded9d3] bg-white px-3 py-3 outline-none focus:border-[#E8A020]"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={expense.amount}
                            onChange={(e) =>
                              handleExpenseChange(
                                index,
                                "amount",
                                e.target.value,
                              )
                            }
                            placeholder="Amount"
                            className="rounded-xl border border-[#ded9d3] bg-white px-3 py-3 outline-none focus:border-[#E8A020]"
                          />
                          <input
                            type="text"
                            value={expense.note}
                            onChange={(e) =>
                              handleExpenseChange(index, "note", e.target.value)
                            }
                            placeholder="Note (optional)"
                            className="rounded-xl border border-[#ded9d3] bg-white px-3 py-3 outline-none focus:border-[#E8A020]"
                          />
                        </div>

                        {expenses.length > 1 && (
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveExpenseRow(index)}
                              className="text-sm font-bold text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {closeError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {closeError}
                  </div>
                ) : null}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetCloseModal}
                    className="h-14 flex-1 rounded-xl border-2 border-[#ded9d3] font-bold text-[#3d0c02]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCloseSale}
                    disabled={closeLoading}
                    className={`h-14 flex-1 rounded-xl text-lg font-extrabold text-white shadow-lg ${
                      closeLoading
                        ? "cursor-not-allowed bg-gray-400"
                        : "bg-red-600"
                    }`}
                  >
                    {closeLoading ? "Closing..." : "Confirm & Close Sale"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast ── */}
        {toast ? (
          <div className="pointer-events-none fixed right-6 top-20 z-[200]">
            <div
              className={`pointer-events-auto min-w-[320px] max-w-[420px] rounded-2xl border px-4 py-4 shadow-2xl backdrop-blur-sm transition-all ${
                toast.type === "success"
                  ? "border-emerald-200 bg-white text-[#3d0c02]"
                  : "border-red-200 bg-white text-[#3d0c02]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    toast.type === "success"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {toast.type === "success" ? "✓" : "✕"}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold">{toast.title}</h4>
                  <p className="mt-1 text-sm text-[#54433f]">{toast.message}</p>
                </div>

                <button
                  type="button"
                  onClick={clearToast}
                  className="text-lg leading-none text-[#3d0c02]/50 hover:text-[#3d0c02]"
                >
                  ×
                </button>
              </div>

              <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#f3eee8]">
                <div
                  className={`h-full rounded-full ${
                    toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
                  }`}
                  style={{ animation: "toastShrink 3s linear forwards" }}
                />
              </div>
            </div>
          </div>
        ) : null}

        <PaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handleConfirmPayment}
          loading={paymentLoading}
          total={total}
        />
      </div>
    </>
  );
}

export default POSPage;
