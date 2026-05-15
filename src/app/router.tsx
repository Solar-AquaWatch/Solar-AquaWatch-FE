import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { AlertPage } from "../pages/AlertPage";
import { DashboardPage } from "../pages/DashboardPage";
import { DeviceDetailPage } from "../pages/DeviceDetailPage";
import { DeviceListPage } from "../pages/DeviceListPage";
import { ImageUploadPage } from "../pages/ImageUploadPage";
import { SolarOperationPage } from "../pages/SolarOperationPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "devices", element: <DeviceListPage /> },
      { path: "devices/:deviceId", element: <DeviceDetailPage /> },
      { path: "upload", element: <ImageUploadPage /> },
      { path: "solar", element: <SolarOperationPage /> },
      { path: "alerts", element: <AlertPage /> },
    ],
  },
]);
