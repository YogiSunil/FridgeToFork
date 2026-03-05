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

const normalizeReceipt = (receipt) => {
  const safeItems = normalizeReceiptItems(receipt?.items);
  return {
    id: String(receipt?.id || Date.now()),
    items: safeItems,
    swaps: Array.isArray(receipt?.swaps) ? receipt.swaps : [],
    total: safeItems.reduce((sum, item) => sum + item.price, 0),
    scannedAt: receipt?.scannedAt || new Date().toISOString(),
  };
};

export const scanReceiptThunk = createAsyncThunk(
  'cart/scanReceipt',
  async (receiptInput, { rejectWithValue }) => {
    try {
      return await scanReceiptWithClaude(receiptInput);
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
      const receipt = normalizeReceipt({
        id: Date.now().toString(),
        items: action.payload?.items,
        swaps: action.payload?.swaps,
        scannedAt: new Date().toISOString(),
      });
      state.receipts.unshift(receipt);
      setJSON('receipts', state.receipts);

      const monthly = getMonthlySpend(state.receipts);
      if (monthly >= state.budgetGoal * 0.9) {
        sendBudgetAlert(monthly, state.budgetGoal);
      }
    },
    updateReceipt(state, action) {
      const { id, items } = action.payload || {};
      const index = state.receipts.findIndex((receipt) => receipt.id === id);
      if (index < 0) return;

      const current = state.receipts[index];
      state.receipts[index] = normalizeReceipt({
        ...current,
        items,
      });

      setJSON('receipts', state.receipts);
    },
    deleteReceipt(state, action) {
      state.receipts = state.receipts.filter((receipt) => receipt.id !== action.payload);
      setJSON('receipts', state.receipts);
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
        state.receipts = Array.isArray(action.payload.receipts)
          ? action.payload.receipts.map(normalizeReceipt)
          : [];
        state.budgetGoal = action.payload.budgetGoal;
      });
  },
});

export const {
  saveReceipt,
  updateReceipt,
  deleteReceipt,
  setBudgetGoal,
  clearCurrentItems,
} = cartSlice.actions;

export default cartSlice.reducer;