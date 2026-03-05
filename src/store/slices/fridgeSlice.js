import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { scanFridgeWithClaude } from '../../utils/claudeApi';
import { setJSON, getJSON } from '../../utils/storage';

const normalizeName = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const toInt = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value.replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const scanFridgeThunk = createAsyncThunk(
  'fridge/scan',
  async (base64Image, { rejectWithValue }) => {
    try {
      const ingredients = await scanFridgeWithClaude(base64Image);
      await setJSON('fridge_ingredients', ingredients);
      return ingredients;
    } catch (e) {
      return rejectWithValue(e.message || 'Failed to scan fridge');
    }
  }
);

export const loadFridgeThunk = createAsyncThunk(
  'fridge/load',
  async () => {
    const stored = await getJSON('fridge_ingredients');
    return stored ?? [];
  }
);

const fridgeSlice = createSlice({
  name: 'fridge',
  initialState: {
    ingredients: [],
    loading: false,
    error: null,
    lastScanned: null,
  },
  reducers: {
    addIngredient(state, action) {
      const exists = state.ingredients.find(
        i => i.name.toLowerCase() === action.payload.name.toLowerCase()
      );
      if (!exists) {
        state.ingredients.push(action.payload);
        setJSON('fridge_ingredients', state.ingredients);
      }
    },
    removeIngredient(state, action) {
      state.ingredients = state.ingredients.filter(
        i => i.name !== action.payload
      );
      setJSON('fridge_ingredients', state.ingredients);
    },
    clearFridge(state) {
      state.ingredients = [];
      setJSON('fridge_ingredients', []);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(scanFridgeThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scanFridgeThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.ingredients = action.payload;
        state.lastScanned = new Date().toISOString();
      })
      .addCase(scanFridgeThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loadFridgeThunk.fulfilled, (state, action) => {
        state.ingredients = action.payload;
      })
      .addMatcher(
        (action) => action.type === 'cart/saveReceipt',
        (state, action) => {
          const receiptItems = Array.isArray(action.payload?.items) ? action.payload.items : [];
          if (!receiptItems.length) return;

          const merged = [...state.ingredients];

          for (const item of receiptItems) {
            const itemName = normalizeName(item?.name);
            if (!itemName) continue;

            const existingIndex = merged.findIndex((ingredient) => normalizeName(ingredient?.name) === itemName);
            if (existingIndex >= 0) {
              const existing = merged[existingIndex];
              const nextQty = Math.max(toInt(existing?.quantity, 1), 1) + 1;
              merged[existingIndex] = {
                ...existing,
                quantity: String(nextQty),
                category: existing?.category || item?.category || 'other',
              };
              continue;
            }

            merged.push({
              name: item.name,
              quantity: '1',
              category: item?.category || 'other',
            });
          }

          state.ingredients = merged;
          setJSON('fridge_ingredients', state.ingredients);
      });
  },
});

export const { addIngredient, removeIngredient, clearFridge } = fridgeSlice.actions;
export default fridgeSlice.reducer;