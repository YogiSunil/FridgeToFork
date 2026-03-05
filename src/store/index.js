import { configureStore } from '@reduxjs/toolkit';
import fridgeReducer from './slices/fridgeSlice';
import recipesReducer from './slices/recipesSlice';
import cartReducer from './slices/cartSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    fridge: fridgeReducer,
    recipes: recipesReducer,
    cart: cartReducer,
    settings: settingsReducer,
  },
});
