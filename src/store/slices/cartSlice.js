import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { scanReceiptWithClaude, generateSwapsWithClaude } from '../../utils/claudeApi';
import { setJSON, getJSON } from '../../utils/storage';
import { sendBudgetAlert } from '../../utils/notifications';

const toPriceNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeReceiptItems = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      name: item?.name || 'Unknown item',
      category: item?.category || 'other',
      isHealthy: Boolean(item?.isHealthy),
      price: toPriceNumber(item?.price),
    }))
    .filter((item) => item.name);
};

export const scanReceiptThunk = createAsyncThunk(
  'cart/scanReceipt',
  async (base64Image, { rejectWithValue }) => {
    try {
      return await scanReceiptWithClaude(base64Image);
    } catch (e) {
      return rejectWithValue(e.message || 'Failed to scan receipt');
    }
  }
);

export const generateSwapsThunk = createAsyncThunk(
  'cart/generateSwaps',
  async (items, { rejectWithValue }) => {
    try {
      return await generateSwapsWithClaude(items);
    } catch (e) {
      return rejectWithValue(e.message || 'Failed to generate swaps');
    }
  }
);

export const loadCartThunk = createAsyncThunk(
  'cart/load',
  async () => {
    const receipts = await getJSON('receipts') ?? [];
    const budgetGoal = await getJSON('budget_goal') ?? 200;
    return { receipts, budgetGoal };
  }
);

const getMonthlySpend = (receipts) => {
  const now = new Date();
  return receipts
    .filter(r => {
      const d = new Date(r.scannedAt);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, r) => sum + r.total, 0);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    receipts: [],
    currentItems: [],
    currentSwaps: [],
    budgetGoal: 200,
    loading: false,
    swapsLoading: false,
    error: null,
  },
  reducers: {
    saveReceipt(state, action) {
      const safeItems = normalizeReceiptItems(action.payload.items);
      const receipt = {
        id: Date.now().toString(),
        items: safeItems,
        swaps: action.payload.swaps,
        total: safeItems.reduce((s, i) => s + i.price, 0),
        scannedAt: new Date().toISOString(),
      };
      state.receipts.unshift(receipt);
      setJSON('receipts', state.receipts);

      const monthly = getMonthlySpend(state.receipts);
      if (monthly >= state.budgetGoal * 0.9) {
        sendBudgetAlert(monthly, state.budgetGoal);
      }
    },
    setBudgetGoal(state, action) {
      state.budgetGoal = action.payload;
      setJSON('budget_goal', action.payload);
    },
    clearCurrentItems(state) {
      state.currentItems = [];
      state.currentSwaps = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(scanReceiptThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scanReceiptThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.currentItems = normalizeReceiptItems(action.payload);
      })
      .addCase(scanReceiptThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generateSwapsThunk.pending, (state) => {
        state.swapsLoading = true;
      })
      .addCase(generateSwapsThunk.fulfilled, (state, action) => {
        state.swapsLoading = false;
        state.currentSwaps = action.payload;
      })
      .addCase(generateSwapsThunk.rejected, (state, action) => {
        state.swapsLoading = false;
        state.error = action.payload;
      })
      .addCase(loadCartThunk.fulfilled, (state, action) => {
        state.receipts = action.payload.receipts;
        state.budgetGoal = action.payload.budgetGoal;
      });
  },
});

export const {
  saveReceipt,
  setBudgetGoal,
  clearCurrentItems,
} = cartSlice.actions;

export default cartSlice.reducer;