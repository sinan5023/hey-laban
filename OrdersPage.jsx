// src/pages/OrdersPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrdersQuery } from "../hooks/orders/useOrdersQuery";
import { fetchOrderById, cancelOrder } from "../services/orderService";
import { createKot } from "../services/kotService";
import {
  getOrdersParamsFromSearch,
  buildOrdersSearchParams,
} from "../utils/orderQueryParams";
import OrdersFilters from "../components/orders/OrdersFilters";
import OrdersList from "../components/orders/OrdersList";
import OrderDetailsPanel from "../components/orders/OrderDetailsPanel";
import { useCartStore } from "../store/cartStore";
import { printKOT, printBill } from "../utils/printHelpers";

function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const hydrateFromOrder = useCartStore((state) => state.hydrateFromOrder);

  const [actionState, setActionState] = useState({ orderId: null, type: "" });
  const [cancelModal, setCancelModal] = useState({ open: false, order: null });
  const [cancelReason, setCancelReason] = useState("");
  const [toast, setToast] = useState(null);

  const [orderDetailCache, setOrderDetailCache] = useState({});


  

  const params = useMemo(
    () => getOrdersParamsFromSearch(searchParams),
    [searchParams]
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (type, title, message) =>
    setToast({ id: Date.now(), type, title, message });

  const ordersQuery = useOrdersQuery(
    {
      page: params.page,
      limit: params.limit,
      status: params.status || undefined,
      kotStatus: params.kotStatus || undefined,
      orderType: params.orderType || undefined,
      search: params.search || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
    },
    { refetchOnMount: "always" }
  );

 const selectedOrderQuery = useQuery({
  queryKey: ["order", params.selectedOrderId],
  queryFn: () => fetchOrderById(params.selectedOrderId),
  enabled: !!params.selectedOrderId,
  refetchOnMount: "always",
  staleTime: 0,
});

  useEffect(() => {
  const selected = selectedOrderQuery.data;
  if (!selected?.id) return;

  setOrderDetailCache((prev) => ({
    ...prev,
    [selected.id]: selected,
  }));
}, [selectedOrderQuery.data]);

  const rawOrders = ordersQuery.data?.data || [];
  const pagination = ordersQuery.data?.pagination || null;

 const orders = useMemo(() => {
  return rawOrders.map((o) => {
    const cached = orderDetailCache[o.id];
    if (!cached) return o;

    return {
      ...o,
      totalPaid: cached.totalPaid ?? o.totalPaid,
      balanceDue: cached.balanceDue ?? o.balanceDue,
      payments: cached.payments ?? o.payments ?? [],
      status: cached.status ?? o.status,
      kotStatus: cached.kotStatus ?? o.kotStatus,
    };
  });
}, [rawOrders, orderDetailCache]);

  useEffect(() => {
    if (!params.selectedOrderId && orders.length > 0) {
      const query = buildOrdersSearchParams({
        ...params,
        selectedOrderId: orders[0].id,
        selectedOrderNo: orders[0].orderNo,
      });
      navigate(`/orders?${query.toString()}`, { replace: true });
    }
  }, [params, orders, navigate]);

  const handleParamsChange = (patch) => {
    const nextParams = { ...params, ...patch };
    const query = buildOrdersSearchParams(nextParams);
    navigate(`/orders?${query.toString()}`);
  };

  const handleSelectOrder = (order) =>
    handleParamsChange({
      selectedOrderId: order.id,
      selectedOrderNo: order.orderNo,
    });

  const handlePageChange = (page) => handleParamsChange({ page });
  const handleLimitChange = (limit) => handleParamsChange({ limit, page: 1 });

  const refetchOrder = async (orderId) => {
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
    await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
  };

  // ─── Go to Cart ───────────────────────────────────────────────────────────
  const handleGoToCart = async (order) => {
    if (order.status === "CANCELLED") return;
    const balance = Number(order.balanceDue ?? 0);
    const paid = Number(order.totalPaid ?? 0);
    const total = Number(order.totalAmount ?? 0);
    const isFullyPaid = total > 0 && (balance <= 0 || total - paid <= 0);
    if (isFullyPaid) return;

    setActionState({ orderId: order.id, type: "cart" });
    try {
      const fullOrder =
        selectedOrderQuery.data?.id === order.id
          ? selectedOrderQuery.data
          : await fetchOrderById(order.id);

      hydrateFromOrder(fullOrder);
      navigate("/pos");
    } finally {
      setActionState({ orderId: null, type: "" });
    }
  };

  const handleCompletePayment = (order) => handleGoToCart(order);

  // ─── KOT Print / Reprint ─────────────────────────────────────────────────
  const printKotMutation = useMutation({
    mutationFn: ({ orderId, note }) => createKot(orderId, { note: note || null }),
    onSuccess: async (kot, variables) => {
      await refetchOrder(variables.orderId);
      const isReprint = kot?.status === "REPRINTED";
      showToast(
        "success",
        isReprint ? "KOT Reprinted" : "KOT Printed",
        `${kot?.kotNo || "KOT"} • Times printed: ${kot?.timesPrinted ?? 1}`
      );
    },
    onError: (err) => {
      showToast(
        "error",
        "KOT Failed",
        err?.response?.data?.message || err?.message || "Failed to print KOT."
      );
    },
  });

  const handlePrintKot = async (order) => {
    if (order.status === "CANCELLED") return;
    setActionState({ orderId: order.id, type: "kot" });
    try {
      const kot = await printKotMutation.mutateAsync({
        orderId: order.id,
        note: order.note || null,
      });
      // Send message to RN app to print KOT
      printKOT(kot, order);
    } finally {
      setActionState({ orderId: null, type: "" });
    }
  };

  const handlePrintBill = (order) => {
    if (order.status === "CANCELLED") return;
    printBill(order);
  };

  // ─── Cancel Order ─────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: ({ orderId, payload }) => cancelOrder(orderId, payload),
    onSuccess: async (_, variables) => {
      await refetchOrder(variables.orderId);
      setCancelModal({ open: false, order: null });
      setCancelReason("");
      showToast("success", "Order Cancelled", "Order has been cancelled successfully.");
    },
    onError: (err) => {
      showToast(
        "error",
        "Cancel Failed",
        err?.response?.data?.message || "Failed to cancel order."
      );
    },
  });

  const handleCancelOrderClick = (order) => {
    if (order.status === "CANCELLED") return;
    const paid = Number(order.totalPaid ?? 0);
    if (paid > 0) {
      showToast(
        "error",
        "Cannot Cancel",
        "This order has payments recorded. Apply a refund first."
      );
      return;
    }
    setCancelModal({ open: true, order });
    setCancelReason("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal.order) return;
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      showToast("error", "Reason Required", "Please enter at least 3 characters for the cancel reason.");
      return;
    }
    setActionState({ orderId: cancelModal.order.id, type: "cancel" });
    try {
      await cancelMutation.mutateAsync({
        orderId: cancelModal.order.id,
        payload: { reason: trimmedReason },
      });
    } finally {
      setActionState({ orderId: null, type: "" });
    }
  };

  return (
    <div className="min-h-screen bg-[#fef9f2] p-6 text-[#3d0c02]">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">Orders</h1>
            <p className="mt-1 text-sm text-[#54433f]">
              View all orders and inspect full order details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/pos")}
            className="rounded-xl border border-[#ded9d3] bg-white px-5 py-3 text-sm font-bold shadow-sm"
          >
            Back to POS
          </button>
        </div>

        <OrdersFilters params={params} onChange={handleParamsChange} />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto rounded-2xl pr-1">
            <OrdersList
              orders={orders}    // ← must be `orders`, not `rawOrders`
              loading={ordersQuery.isLoading}
              error={ordersQuery.isError}
              selectedOrderId={params.selectedOrderId}
              pagination={pagination}
              onSelectOrder={handleSelectOrder}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>

          <OrderDetailsPanel
            order={selectedOrderQuery.data || null}
            loading={selectedOrderQuery.isLoading}
            onGoToCart={handleGoToCart}
            onCompletePayment={handleCompletePayment}
            onPrintKot={handlePrintKot}
            onPrintBill={handlePrintBill}
            onCancelOrder={handleCancelOrderClick}
            actionLoading={!!actionState.orderId}
          />
        </div>
      </div>

      {/* ─── Cancel Modal ─────────────────────────────────────────────────── */}
      {cancelModal.open && cancelModal.order && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#3a0a01]/60 p-4">
          <div className="w-full max-w-[440px] rounded-2xl border border-[#ded9d3] bg-[#fef9f2] shadow-2xl">
            <div className="flex flex-col gap-5 p-6">
              <div>
                <h2 className="text-2xl font-bold text-[#3d0c02]">
                  Cancel {cancelModal.order.orderNo}?
                </h2>
                <p className="mt-1 text-sm text-[#54433f]">
                  This order will be marked as Cancelled and remain visible in
                  order history. This action cannot be undone.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#3d0c02]">
                  Cancel Reason{" "}
                  <span className="font-normal text-red-500">* required (min 3 chars)</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Customer changed mind, Wrong order..."
                  className="w-full rounded-xl border border-[#ded9d3] bg-white p-3 text-sm outline-none focus:border-[#E8A020]"
                />
              </div>

              {cancelMutation.isError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {cancelMutation.error?.response?.data?.message || "Failed to cancel order."}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCancelModal({ open: false, order: null });
                    setCancelReason("");
                  }}
                  className="h-14 flex-1 rounded-xl border-2 border-[#ded9d3] font-bold text-[#3d0c02]"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  disabled={cancelMutation.isPending}
                  onClick={handleConfirmCancel}
                  className={`h-14 flex-1 rounded-xl text-lg font-extrabold text-white shadow-lg ${cancelMutation.isPending
                      ? "cursor-not-allowed bg-gray-300"
                      : "bg-red-600"
                    }`}
                >
                  {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="pointer-events-none fixed right-6 top-20 z-[200]">
          <div
            className={`pointer-events-auto min-w-[320px] max-w-[420px] rounded-2xl border px-4 py-4 shadow-2xl backdrop-blur-sm transition-all ${toast.type === "success"
                ? "border-emerald-200 bg-white text-[#3d0c02]"
                : "border-red-200 bg-white text-[#3d0c02]"
              }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toast.type === "success"
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
                onClick={() => setToast(null)}
                className="text-lg leading-none text-[#3d0c02]/50 hover:text-[#3d0c02]"
              >
                ×
              </button>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#f3eee8]">
              <div
                className={`h-full animate-[toastShrink_3s_linear_forwards] rounded-full ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
                  }`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersPage;