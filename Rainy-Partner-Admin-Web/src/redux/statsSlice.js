import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axiosInstence";

export const fetchStats = createAsyncThunk(
  "stats/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(`/coordinator/stats`);
      return res.data; 
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || "Failed to fetch stats"
      );
    }
  }
);

const statsSlice = createSlice({
  name: "stats",
  initialState: {
    plumbers: { approved: 0, pending: 0, rejected: 0 },
    orders: { 
      total: 0, 
      todayOrders: 0, 
      todayRevenue: 0, 
      awaitingDispatch: 0,
      ordersList: [] 
    },
    leads: { 
      total: 0, 
      openInstallations: 0,
      unassigned: [] 
    },
    loading: false,
    error: null,
    hasFetched: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.loading = false;
        state.hasFetched = true;
        state.plumbers = action.payload.plumbers || state.plumbers;
        state.orders = {
          ...action.payload.orders,
          ordersList: action.payload.ordersList || []
        };
        state.leads = {
          total: action.payload.leads?.total || 0,
          openInstallations: action.payload.leads?.openInstallations || 0,
          unassigned: action.payload.leads?.unassigned || [] 
        };
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default statsSlice.reducer;
