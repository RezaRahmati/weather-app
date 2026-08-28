import { configureStore } from '@reduxjs/toolkit';
import savedSlice from './slices/savedSlice';
import weatherSlice from './slices/weatherSlice';
import unitSlice from './slices/unitSlice';

const store = configureStore({
  reducer: {
    weather: weatherSlice,
    saved: savedSlice,
    unit: unitSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;