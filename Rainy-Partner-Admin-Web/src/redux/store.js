import { configureStore } from "@reduxjs/toolkit";
import statsReducer from "./statsSlice";

const store = configureStore({
  reducer: {
    stats: statsReducer,
  },
});

export default store;
