// src/components/orders/OrderDetailsPanel.jsx
function Badge({ value, className = "" }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
      {value}
    </span>
  );
}

function getStatusClass(value) {
  const map = {
    OPEN:      "bg-blue-50 text-blue-700 border-blue-200",
    DUE:       "bg-yellow-50 text-yellow-700 border-yellow-200",
    COMPLETED: "bg-green-50 text-green-700 border-green-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
    NEW:       "bg-gray-50 text-gray-700 border-gray-200",
    PRINTED:   "bg-purple-50 text-purple-700 border-purple-200",
    REPRINTED: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return map[value] || "bg-gray-50 text-gray-700 border-gray-200";
}

function derivePaymentMeta(order) {
  const total   = Number(order.totalAmount || 0);
  const paid    = Number(order.totalPaid   || 0);
  const balance = Number(order.balanceDue  ?? total - paid);
  

  if (order.status === "CANCELLED") {
    return { label: "Cancelled", className: "bg-red-50 text-red-700 border-red-200", isPaid: false, code: "CANCELLED" };
  }
  if (total > 0 && balance <= 0) {
    return { label: "Payment Completed", className: "bg-green-50 text-green-700 border-green-200", isPaid: true, code: "PAID" };
  }
  if (paid > 0) {
    return { label: "Partially Paid", className: "bg-yellow-50 text-yellow-700 border-yellow-200", isPaid: false, code: "PARTIALLY_PAID" };
  }
  return { label: "Not Paid", className: "bg-orange-50 text-orange-700 border-orange-200", isPaid: false, code: "NOT_PAID" };
}

function OrderDetailsPanel({
  order,
  loading,
  onGoToCart,
  onCompletePayment,
  onPrintKot,
  onPrintBill,
  onCancelOrder,
  actionLoading,
}) {
  if (loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-white" />;
  }

  if (!order) {
    return (
      <div className="rounded-2xl border border-dashed border-[#ded9d3] bg-white p-8 text-center text-[#3d0c02]/50">
        Select an order to view details.
      </div>
    );
  }

  const payMeta     = derivePaymentMeta(order);
  const isCancelled = order.status === "CANCELLED";
  const canPay      = !isCancelled && !payMeta.isPaid;
  const canEdit     = !isCancelled && !payMeta.isPaid;
  const canKot      = !isCancelled;
  const canCancel   = !isCancelled && !payMeta.isPaid;
 const kotLabel =
  order.kotStatus === "PRINTED" || order.kotStatus === "REPRINTED" || order.kot?.kotNo
    ? "KOT Reprint"
    : "Print KOT";

  return (
    <div className="sticky top-6 rounded-2xl border border-[#ded9d3] bg-white p-5 shadow-sm">
      <div className="border-b border-[#ded9d3] pb-4">
        <h2 className="text-2xl font-extrabold">{order.orderNo}</h2>
        <p className="mt-1 text-sm text-[#54433f]">Token #{order.tokenNo}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge value={payMeta.label} className={payMeta.className} />
          <Badge value={order.status} className={getStatusClass(order.status)} />
          {order.kotStatus && (
            <Badge value={order.kotStatus} className={getStatusClass(order.kotStatus)} />
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
       {[
  ["KOT No",     order.kot?.kotNo || "—"],
  ["Order Type", order.orderType?.replace(/_/g, " ") || "—"],
  ["Subtotal",   `₹${Number(order.subtotal       || 0).toFixed(2)}`],
  ["Discount",   `₹${Number(order.discountAmount  || 0).toFixed(2)}`],
  ["Total",      `₹${Number(order.totalAmount     || 0).toFixed(2)}`],
  ["Paid",       `₹${Number(order.totalPaid       || 0).toFixed(2)}`],
  ["Balance",    `₹${Number(order.balanceDue      || 0).toFixed(2)}`],
].map(([label, value]) => (
  <div key={label} className="flex justify-between">
    <span className="opacity-70">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
))}
        {order.cancelReason && (
          <div className="flex justify-between gap-4">
            <span className="opacity-70">Cancel Reason</span>
            <span className="text-right font-bold">{order.cancelReason}</span>
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="mt-5 flex flex-wrap gap-3">
        {payMeta.isPaid ? (
          <span className="inline-flex items-center rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-700 ring-1 ring-green-200">
            ✓ Payment Completed
          </span>
        ) : (
          <button
            type="button"
            disabled={!canPay || actionLoading}
            onClick={() => onCompletePayment(order)}
            className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${
              !canPay || actionLoading
                ? "cursor-not-allowed bg-gray-300"
                : "bg-[#E8A020]"
            }`}
          >
            {payMeta.code === "PARTIALLY_PAID" ? "Complete Payment" : "Go to Cart"}
          </button>
        )}

        <button
          type="button"
          disabled={!canEdit || actionLoading}
          onClick={() => onGoToCart(order)}
          title={payMeta.isPaid ? "Paid orders cannot be edited" : isCancelled ? "Cancelled orders cannot be edited" : ""}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            !canEdit || actionLoading
              ? "cursor-not-allowed border border-[#ded9d3] bg-gray-100 text-gray-400"
              : "border border-[#ded9d3] bg-white text-[#3d0c02] hover:bg-[#f8f3ec]"
          }`}
        >
          Edit / Go to Cart
        </button>

        <button
          type="button"
          disabled={!canKot || actionLoading}
          onClick={() => onPrintKot(order)}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            !canKot || actionLoading
              ? "cursor-not-allowed border border-[#ded9d3] bg-gray-100 text-gray-400"
              : "border border-[#ded9d3] bg-white text-[#3d0c02] hover:bg-[#f8f3ec]"
          }`}
        >
          {kotLabel}
        </button>
         <button
          type="button"
          disabled={actionLoading}
          onClick={() => onPrintBill && onPrintBill(order)}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            !canKot || actionLoading
              ? "cursor-not-allowed border border-[#ded9d3] bg-gray-100 text-gray-400"
              : "border border-[#ded9d3] bg-white text-[#3d0c02] hover:bg-[#f8f3ec]"
          }`}
        >
          Print Bill
        </button>

        {!isCancelled && (
          <button
            type="button"
            disabled={!canCancel || actionLoading}
            onClick={() => onCancelOrder(order)}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              !canCancel || actionLoading
                ? "cursor-not-allowed borer border-[#ded9d3] bg-gray-100 text-gray-400"
                : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            Cancel Order
          </button>
        )}
      </div>

      {/* ── Items ── */}
      <div className="mt-6">
        <h3 className="mb-3 text-lg font-bold">Items</h3>
        <div className="space-y-3">
         {order.orderItems?.map((item) => (
  <div key={item.id} className="rounded-xl bg-[#f8f3ec]/40 p-3">
    <div className="flex justify-between">
      <span className="font-semibold">{item.name}</span>
      <span className="font-bold">₹{Number(item.total || 0).toFixed(2)}</span>
    </div>

    <p className="text-sm text-[#54433f]">Qty: {item.quantity}</p>

    {(item.note || item.itemNote || item.specialInstructions) && (
      <p className="text-sm text-[#54433f]">
        Note: {item.note || item.itemNote || item.specialInstructions}
      </p>
    )}
  </div>
))}
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsPanel;