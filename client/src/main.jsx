import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

import Home from "./pages/home/index.jsx";
import Login from "./pages/login/index.jsx";
import Error from "./pages/error/index.jsx";
import SpotifyAuth from "./components/spotifyAuth.jsx/index.jsx";
import SpotifyOverlay from "./pages/spotifyOverlay/index.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <Error />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/auth",
        element: <SpotifyAuth />,
      },
      {
        path: "/spotify-overlay",
        element: <SpotifyOverlay />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router}></RouterProvider>
);
