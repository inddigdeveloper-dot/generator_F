import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";

const RegisterPage     = lazy(() => import("./pages/RegisterPage"));
const LoginPage        = lazy(() => import("./pages/LoginPage"));
const DashboardPage    = lazy(() => import("./pages/DashboardPage"));
const SmartReplyPage   = lazy(() => import("./pages/SmartReplyPage"));
const PricingPage      = lazy(() => import("./pages/PricingPage"));
const EditBusinessPage = lazy(() => import("./pages/EditBusinessPage"));
const OrderHistoryPage = lazy(() => import("./pages/OrderHistoryPage"));
const ReviewPage       = lazy(() => import("./pages/ReviewPage"));

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function AppContent() {
    const location = useLocation();
    const showNavbar = !location.pathname.startsWith("/r/");

    return (
        <>
            {showNavbar && <Navbar />}
            <Suspense fallback={null}>
                <Routes>
                    <Route path="/r/:username" element={<ReviewPage />} />

                    <Route path="/" element={<LandingPage />} />
                    <Route path="/pricing" element={<PricingPage />} />

                    <Route path="/register" element={
                        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                            <RegisterPage />
                        </GoogleOAuthProvider>
                    } />
                    <Route path="/login" element={
                        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                            <LoginPage />
                        </GoogleOAuthProvider>
                    } />

                    <Route path="/dashboard" element={
                        <ProtectedRoute><DashboardPage /></ProtectedRoute>
                    } />
                    <Route path="/smart-reply" element={
                        <ProtectedRoute><SmartReplyPage /></ProtectedRoute>
                    } />
                    <Route path="/edit-business" element={
                        <ProtectedRoute><EditBusinessPage /></ProtectedRoute>
                    } />
                    <Route path="/order-history" element={
                        <ProtectedRoute><OrderHistoryPage /></ProtectedRoute>
                    } />
                </Routes>
            </Suspense>
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter basename="/">
                <AppContent />
            </BrowserRouter>
        </AuthProvider>
    );
}
