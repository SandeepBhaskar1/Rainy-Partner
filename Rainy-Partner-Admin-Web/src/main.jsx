import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { Provider } from "react-redux";
import store from "./redux/store.js";
import { AuthProvider } from "./context/AuthContext.jsx";
import axios from "axios";

axios.defaults.baseURL = import.meta.env.VITE_APP_BACKEND_URL;
axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
    <AuthProvider>
      <App />
    </AuthProvider>
    </Provider>
  </StrictMode>
);
