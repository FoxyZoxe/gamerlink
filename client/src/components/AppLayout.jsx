import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/connexion" replace />;

  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
