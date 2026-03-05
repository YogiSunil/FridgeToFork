import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { generateRecipeWithClaude } from '../../utils/claudeApi';
import { setJSON, getJSON } from '../../utils/storage';

function normalizeRecipe(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.map((ing, index) => ({
        name: typeof ing?.name === 'string' ? ing.name : `Ingredient ${index + 1}`,
        amount: typeof ing?.amount === 'string' ? ing.amount : 'as needed',
      }))
    : [];

  const steps = Array.isArray(raw.steps)
    ? raw.steps.map((step, index) => ({
        step: Number(step?.step) || index + 1,
        instruction: typeof step?.instruction === 'string'
          ? step.instruction
          : 'Follow this step.',
        duration: typeof step?.duration === 'string' ? step.duration : undefined,
      }))
    : [];

  return {
    id: raw.id || `recipe-${Date.now()}`,
    title: typeof raw.title === 'string' ? raw.title : 'Untitled Recipe',
    description: typeof raw.description === 'string' ? raw.description : '',
    cuisine: typeof raw.cuisine === 'string' ? raw.cuisine : 'Any',
    prepTime: raw.prepTime || 'N/A',
    cookTime: raw.cookTime || 'N/A',
    servings: Number(raw.servings) || 1,
    difficulty: raw.difficulty || 'Medium',
    calories: raw.calories,
    tips: typeof raw.tips === 'string' ? raw.tips : '',
    ingredients,
    steps,
  };
}

export const generateRecipeThunk = createAsyncThunk(
  'recipes/generate',
  async ({ ingredients, cuisine }, { rejectWithValue }) => {
    try {
      return normalizeRecipe(await generateRecipeWithClaude(ingredients, cuisine));
    } catch (e) {
      return rejectWithValue(e.message || 'Failed to generate recipe');
    }
  }
);

export const loadRecipesThunk = createAsyncThunk(
  'recipes/load',
  async () => {
    const stored = await getJSON('saved_recipes');
    if (!Array.isArray(stored)) return [];
    return stored.map(normalizeRecipe).filter(Boolean);
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
      const normalized = normalizeRecipe(action.payload);
      if (!normalized) return;

      const exists = state.saved.find(r => r.id === normalized.id);
      if (!exists) {
        state.saved.unshift(normalized);
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