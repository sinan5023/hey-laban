// src/utils/printHelpers.js

/**
 * Transforms the raw order and KOT data into the exact structure
 * expected by the React Native app.
 */
const formatPayload = (printType, orderData, kotData = null) => {
  return {
    printType: printType, // "KOT" | "BILL" | "BOTH"
    shop: {
      name: "Hey Laban",
      address: "Edavannappara, Malappuram",
      phone: "+91 9876543210",
      email: "hello@heylaban.com"
    },
    // Fallback to "Cashier" if user data isn't in the order object
    cashierName: orderData.user?.name || orderData.cashier?.name || "Cashier",
    order: {
      id: orderData.id || "",
      orderNo: orderData.orderNo || "",
      tokenNo: orderData.tokenNo || "",
      orderType: orderData.orderType || "DINE_IN",
      createdAt: orderData.createdAt || new Date().toISOString(),
      printedAt: new Date().toISOString()
    },
    summary: (() => {
      const totalAmount = Number(orderData.totalAmount || 0);

      // Compute totalPaid from the payments array (most reliable source of truth)
      // Fall back to the totalPaid field if no payments array exists
      const paymentsArray = orderData.payments || [];
      const paidFromPayments = paymentsArray.reduce(
        (sum, p) => sum + Number(p.amount || 0), 0
      );
      const totalPaid = paidFromPayments > 0
        ? paidFromPayments
        : Number(orderData.totalPaid || 0);

      // Derive balanceDue from the computed values
      const balanceDue = totalAmount - totalPaid;

      return {
        subtotal: Number(orderData.subtotal || 0),
        discountAmount: Number(orderData.discountAmount || 0),
        tax: 0,
        totalAmount,
        totalPaid,
        balanceDue: balanceDue > 0 ? balanceDue : 0
      };
    })(),
    payment: {
      methodBreakdown: (orderData.payments || []).map(p => ({
        method: p.paymentMethod || p.method || "CASH",
        amount: Number(p.amount || 0)
      })),
      qrCodeValue: null
    },
    notes: orderData.note || orderData.orderNote || "",
    footerMessage: "Thank you for visiting!",
    items: (orderData.orderItems || []).map(item => {
      const qty = Number(item.quantity || 1);
      const total = Number(item.total || 0);
      return {
        name: item.name || "",
        qty: qty,
        // Calculate price if not directly provided
        price: item.price ? Number(item.price) : (total / qty),
        total: total,
        note: item.note || item.itemNote || item.specialInstructions || null
      };
    }),
    kot: {
      kotNo: kotData?.kotNo || "",
      status: kotData?.status === "REPRINTED" ? "REPRINTED" : "NEW"
    }
  };
};

/**
 * Sends a message to the React Native WebView bridge for printing.
 * @param {string} actionType The wrapper action (PRINT_KOT, PRINT_BILL, PRINT_BOTH)
 * @param {string} printType The payload printType (KOT, BILL, BOTH)
 * @param {Object} orderData The order details.
 * @param {Object} kotData The KOT details.
 */
export const sendPrintMessage = (actionType, printType, orderData, kotData = null) => {
  const requestId = `req-${Date.now()}`;
  const payload = formatPayload(printType, orderData, kotData);
  
  if (window.rnBridge && typeof window.rnBridge.send === 'function') {
    window.rnBridge.send({
      type: actionType,
      requestId: requestId,
      payload: payload
    });
    console.log(`[PRINT_REQ] Sent request ${requestId} of type ${actionType}`);
  } else {
    // Fallback if testing in web browser
    console.log(`[PRINT_REQ] (not in RN) Request ${requestId} of type ${actionType}`, payload);
  }
};

/**
 * Sends a request to print only the KOT.
 */
export const printKOT = (kotData, orderData) => {
  sendPrintMessage("PRINT_KOT", "KOT", orderData, kotData);
};

/**
 * Sends a request to print only the bill.
 */
export const printBill = (orderData) => {
  sendPrintMessage("PRINT_BILL", "BILL", orderData, null);
};

/**
 * Sends a request to print both the KOT and the bill.
 */
export const printBoth = (kotData, orderData) => {
  sendPrintMessage("PRINT_BOTH", "BOTH", orderData, kotData);
};

// --- Setup Global Listener for RN Messages ---
if (typeof window !== 'undefined') {
  window.addEventListener('rnMessage', (event) => {
    const response = event.detail;

    // Filter out messages we don't care about
    if (!response || !response.requestId) return;

    if (response.type === 'PRINT_ACK') {
      console.log(`✅ Bridge Confirmed: The RN app received the payload for request: ${response.requestId}`);
    }
    
    if (response.type === 'PRINT_RESULT') {
      if (response.success) {
        console.log(`🖨️ Physical Print Finished: Request ${response.requestId} completed!`);
      } else {
        console.error(`❌ Print Failed: Request ${response.requestId} - ${response.message}`);
      }
    }
    
    if (response.type === 'PRINTER_STATUS') {
      console.log(`ℹ️ Printer state changed: ${response.message}`);
    }
  });
}
