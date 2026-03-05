import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { setJSON, getJSON } from '../../utils/storage';

const initialState = {
  username: 'Chef',
  notificationsEnabled: false,
  streak: 0,
  lastLoggedDate: null,
  weeklySummary: '',
};

export const loadSettingsThunk = createAsyncThunk(
  'settings/load',
  async () => {
    const stored = await getJSON('settings');
    return stored ?? initialState;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setUsername(state, action) {
      state.username = action.payload;
      setJSON('settings', state);
    },
    setNotifications(state, action) {
      state.notificationsEnabled = action.payload;
      setJSON('settings', state);
    },
    incrementStreak(state) {
      const today = new Date().toDateString();
      if (state.lastLoggedDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        state.streak =
          state.lastLoggedDate === yesterday.toDateString()
            ? state.streak + 1
            : 1;
        state.lastLoggedDate = today;
        setJSON('settings', state);
      }
    },
    setWeeklySummary(state, action) {
      state.weeklySummary = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadSettingsThunk.fulfilled, (state, action) => {
      return { ...state, ...action.payload };
    });
  },
});

export const {
  setUsername,
  setNotifications,
  incrementStreak,
  setWeeklySummary,
} = settingsSlice.actions;

export default settingsSlice.reducer;