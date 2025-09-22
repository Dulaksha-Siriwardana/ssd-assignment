import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  orderList: [],
  orderDetails: null,
  approvalURL: null,
  isLoading: false,
  placedOrderId: null,
};



const securityUtils = {
  // Sanitize input to prevent XSS
  sanitizeInput: (input) => {
    if (typeof input !== "string") return "";
    return input.replace(/[<>\"'&]/g, (match) => {
      const entities = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "&": "&amp;",
      };
      return entities[match];
    });
  },

  // Validate ID parameter (only allow alphanumeric and hyphens)
  validateId: (id) => {
    if (typeof id !== "string") return false;
    return /^[a-zA-Z0-9\-_]{1,50}$/.test(id);
  },
  // Validate blob content type
  validateContentType: (blob, expectedType) => {
    return blob.type === expectedType;
  },

  //* Safe file download function
  safeDownload: (blob, filename, expectedContentType) => {
    try {
      // Validate blob content type
      if (!securityUtils.validateContentType(blob, expectedContentType)) {
        throw new Error("Invalid content type received");
      }

      // Sanitize filename
      const safeFilename = securityUtils
        .sanitizeInput(filename)
        .replace(/[^a-zA-Z0-9.-]/g, "_"); // Allow only safe characters

      // Create blob URL
      const url = window.URL.createObjectURL(blob);

      // Create download link with security measures
      const link = document.createElement("a");

      // Set attributes safely
      link.style.display = "none"; // Hide link
      link.href = url;
      link.setAttribute("download", safeFilename);
      link.setAttribute("rel", "noopener noreferrer"); // Security measure

      // Add to DOM briefly for download
      document.body.appendChild(link);
      link.click();

      // Cleanup immediately
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Secure download failed:", error);
      throw error;
    }
  },
};
export const cancelPayment = createAsyncThunk(
  "/order/cancelPayment",
  async ({ orderId }, { getState }) => {
    const auth = getState().auth;
    const token = auth.token;
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}orders/cancel-payment`,
      { orderId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }
);

export const capturePayment = createAsyncThunk(
  "/order/confirmPayment",
  async ({ paymentId, payerId, orderId }, { getState }) => {
    const auth = getState().auth;
    const token = auth.token;
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}orders/capture-payment`,
      {
        paymentId,
        payerId,
        orderId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }
);

export const createNewOrder = createAsyncThunk(
  "/order/createNewOrder",
  async (orderData, { getState }) => {
    const auth = getState().auth;
    const token = auth.token;
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}orders/`,
      orderData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }
);

export const getAllOrders = createAsyncThunk(
  "/order/getAllOrders",
  async (_, { getState }) => {
    const auth = getState().auth;
    const token = auth.token;
    console.log(token, "token");
    const response = await axios.get(`${import.meta.env.VITE_API_URL}orders/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(response.data, "data");

    return response.data;
  }
);

export const getOrder = createAsyncThunk(
  "/order/getOrderDetails",
  async (id, { getState }) => {
    const auth = getState().auth;
    const token = auth.token;
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}orders/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }
);

export const updateOrderStatus = createAsyncThunk(
  "/order/updateOrderStatus",
  async ({ id, orderStatus }, { getState }) => {
    const auth = getState().auth;
    const token = auth.token;
    const response = await axios.put(
      `${import.meta.env.VITE_API_URL}orders/${id}`,
      {
        orderStatus,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }
);

export const deleteOrder = createAsyncThunk(
  "/order/deleteOrder",
  async (id, { getState }) => {
    const auth = getState().auth;
    const token = auth.token;
    const response = await axios.delete(
      `${import.meta.env.VITE_API_URL}orders/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }
);

export const getOrderReport = createAsyncThunk(
  "/order/getOrderReport",
  async (_, { getState, rejectWithValue }) => {
    try {
      const auth = getState().auth;
      const token = auth.token;

      if (!token) {
        return rejectWithValue("Authentication required");
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}orders/gen-report`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
          timeout: 30000, // ? Add custom timeout
        }
      );

      // Validate response
      if (!response.data || response.data.size === 0) {
        throw new Error("No data received");
      }

      // Use secure download function
      securityUtils.safeDownload(
        response.data,
        "orders_report.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      return { success: true };
    } catch (error) {
      console.error("Order report generation failed:", error);
      return rejectWithValue(error.message);
    }
  }
);

export const generateInvoice = createAsyncThunk(
  "/order/generateInvoice",
  async (id, { getState }) => {
    const auth = getState().auth;
    const token = auth.token;
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}orders/invoice/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      }
    );

    const blob = new Blob([response.data], {
      type: "application/pdf",
    });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "invoice.pdf");
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  }
);

const orderSlice = createSlice({
  name: "adminOrderSlice",
  initialState,
  reducers: {
    resetOrderDetails: (state) => {
      console.log("resetOrderDetails");

      state.orderDetails = null;
    },
    resetPlacedOrderId: (state) => {
      state.placedOrderId = null;
    },
    resetApprovalURL: (state) => {
      state.approvalURL = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllOrders.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAllOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orderList = action.payload;
      })
      .addCase(getAllOrders.rejected, (state) => {
        state.isLoading = false;
        state.orderList = [];
      })
      .addCase(getOrder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orderDetails = action.payload;
      })
      .addCase(getOrder.rejected, (state) => {
        state.isLoading = false;
        state.orderDetails = null;
      })
      .addCase(createNewOrder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createNewOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.approvalURL = action.payload.success
          ? action.payload.approvalURL
          : null;
        state.placedOrderId = action.payload.success
          ? action.payload.orderId
          : null;
      })
      .addCase(createNewOrder.rejected, (state) => {
        state.isLoading = false;
        state.approvalURL = null;
      });
  },
});

export const { resetOrderDetails, resetPlacedOrderId, resetApprovalURL } =
  orderSlice.actions;

export default orderSlice.reducer;
