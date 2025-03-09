import { Outlet } from "react-router-dom";
import "./App.css";

import ClearCache from "./components/clearCache";

function App() {
  return (
    <>
      <main>
        <Outlet />
      </main>
      <footer>
        <ClearCache />
      </footer>
    </>
  );
}

export default App;
