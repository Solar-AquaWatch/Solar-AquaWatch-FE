import { Navigate, Outlet } from "react-router-dom";
import { useAppData } from "../../app/AppDataContext";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const { selectedInstitution } = useAppData();

  if (!selectedInstitution) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div className="min-h-screen lg:pl-72">
        <Header />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
