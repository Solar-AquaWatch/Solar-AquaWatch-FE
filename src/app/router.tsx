import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { AlertPage } from "../pages/AlertPage";
import { DashboardPage } from "../pages/DashboardPage";
import { DeviceDetailPage } from "../pages/DeviceDetailPage";
import { DeviceListPage } from "../pages/DeviceListPage";
import { ImageUploadPage } from "../pages/ImageUploadPage";
import { InstitutionSelectPage } from "../pages/InstitutionSelectPage";
import { SolarOperationPage } from "../pages/SolarOperationPage";

export const router = createBrowserRouter([
  { path: "/", element: <InstitutionSelectPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "devices", element: <DeviceListPage /> },
      { path: "devices/:deviceId", element: <DeviceDetailPage /> },
      { path: "upload", element: <ImageUploadPage /> },
      { path: "solar", element: <SolarOperationPage /> },
      { path: "alerts", element: <AlertPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
