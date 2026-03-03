import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { generateRecipeWithClaude } from '../../utils/claudeApi';
import { setJSON, getJSON } from '../../utils/storage';

export const generateRecipeThunk = createAsyncThunk(
  'recipes/generate',
  async ({ ingredients, cuisine }, { rejectWithValue }) => {
    try {
      return await generateRecipeWithClaude(ingredients, cuisine);
    } catch (e) {
      return rejectWithValue(e.message || 'Failed to generate recipe');
    }
  }
);

export const loadRecipesThunk = createAsyncThunk(
  'recipes/load',
  async () => {
    const stored = await getJSON('saved_recipes');
    return stored ?? [];
  }
);

const recipesSlice = createSlice({
  name: 'recipes',
  initialState: {
    generated: null,
    saved: [],
    loading: false,
    error: null,
    selectedCuisine: 'Any',
  },
  reducers: {
    saveRecipe(state, action) {
      const exists = state.saved.find(r => r.id === action.payload.id);
      if (!exists) {
        state.saved.unshift(action.payload);
        setJSON('saved_recipes', state.saved);
      }
    },
    deleteRecipe(state, action) {
      state.saved = state.saved.filter(r => r.id !== action.payload);
      setJSON('saved_recipes', state.saved);
    },
    setSelectedCuisine(state, action) {
      state.selectedCuisine = action.payload;
    },
    clearGenerated(state) {
      state.generated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateRecipeThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.generated = null;
      })
      .addCase(generateRecipeThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.generated = action.payload;
      })
      .addCase(generateRecipeThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loadRecipesThunk.fulfilled, (state, action) => {
        state.saved = action.payload;
      });
  },
});

export const {
  saveRecipe,
  deleteRecipe,
  setSelectedCuisine,
  clearGenerated,
} = recipesSlice.actions;

export default recipesSlice.reducer;