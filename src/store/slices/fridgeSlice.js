import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { scanFridgeWithClaude } from '../../utils/claudeApi';
import { setJSON, getJSON } from '../../utils/storage';

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
      });
  },
});

export const { addIngredient, removeIngredient, clearFridge } = fridgeSlice.actions;
export default fridgeSlice.reducer;