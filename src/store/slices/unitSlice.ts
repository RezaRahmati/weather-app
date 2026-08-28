import { createSlice } from '@reduxjs/toolkit';

export type Unit = 'C' | 'F';

const UNIT_LS_KEY = 'unit';

const getInitialUnit = (): Unit => {
  const stored = localStorage.getItem(UNIT_LS_KEY);
  return stored === 'F' ? 'F' : 'C';
};

type UnitState = {
  unit: Unit;
};

const initialState: UnitState = {
  unit: getInitialUnit(),
};

const unitSlice = createSlice({
  name: 'unit',
  initialState,
  reducers: {
    setUnit(state, action: { payload: Unit }) {
      state.unit = action.payload;
      localStorage.setItem(UNIT_LS_KEY, state.unit);
    },
    toggleUnit(state) {
      state.unit = state.unit === 'C' ? 'F' : 'C';
      localStorage.setItem(UNIT_LS_KEY, state.unit);
    },
  },
});

export default unitSlice.reducer;
export const { setUnit, toggleUnit } = unitSlice.actions;
