import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ListingProvider } from './context/ListingContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy-loaded pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const FeatureDetailPage = lazy(() => import('./pages/FeatureDetailPage'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/Auth/VerifyEmail'));
const FarmerDashboard = lazy(() => import('./pages/FarmerDashboard'));
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard'));
const IntelligenceHub = lazy(() => import('./pages/IntelligenceHub'));
const WeatherPage = lazy(() => import('./pages/WeatherPage'));
const MarketPricePage = lazy(() => import('./pages/MarketPricePage'));
const ChatTest = lazy(() => import('./pages/ChatTest'));
const AIChatbot = lazy(() => import('./pages/AIChatbot'));
const ListingDetails = lazy(() => import('./pages/ListingDetails'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const PendingOrdersPage = lazy(() => import('./pages/PendingOrdersPage'));
const DeliveryAgentDashboard = lazy(() => import('./pages/DeliveryAgentDashboard'));
const StateCropsPage = lazy(() => import('./pages/StateCropsPage'));
const GovernmentSchemesPage = lazy(() => import('./pages/GovernmentSchemesPage'));

import AgriChatWidget from './components/chat/AgriChatWidget';

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
        <span className="text-xs text-neutral-400 font-medium">Loading KisanBazaar...</span>
      </div>
    </div>
  );
}

function ThemeWrapper({ children }) {
  const location = useLocation();
  const path = location.pathname;
  
  let themeClass = 'theme-default';
  if (path.includes('/farmer')) {
    themeClass = 'theme-farmer';
  } else if (path.includes('/buyer') || path.includes('/cart') || path.includes('/checkout') || path.includes('/state/')) {
    themeClass = 'theme-buyer';
  } else if (path.includes('/intelligence') || path.includes('/chat')) {
    themeClass = 'theme-ai';
  }

  // selection colors can also adapt to theme later, for now keeping it neutral/green
  return (
    <div className={`ds-page-bg ${themeClass} min-h-screen flex flex-col font-sans relative`}>
      {children}
      <AgriChatWidget />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="max-w-md w-full p-8 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Something went wrong. Reload the page.</h2>
            <p className="text-sm text-gray-500">An unexpected error occurred while rendering this section.</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <Router>
        <AuthProvider>
          <ListingProvider>
            <CartProvider>
              <ThemeWrapper>
                <main className="flex-1 flex flex-col">
                  <Suspense fallback={<PageLoader />}>
                    <ErrorBoundary>
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<LandingPage />} />
                      <Route path="/features/:featureId" element={<FeatureDetailPage />} />
                      <Route path="/chat-test" element={<ChatTest />} />
                      <Route path="/login/:role" element={<AuthPage mode="login" />} />
                      <Route path="/register/:role" element={<AuthPage mode="register" />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/verify-email/:token" element={<VerifyEmail />} />

                      {/* Protected Farmer Routes */}
                      <Route element={<ProtectedRoute roleRequired="farmer" />}>
                        <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
                      </Route>

                      {/* Delivery Agent / Driver Routes */}
                      <Route element={<ProtectedRoute roleRequired="delivery_agent" />}>
                        <Route path="/delivery/dashboard" element={<DeliveryAgentDashboard />} />
                      </Route>

                      {/* Protected Buyer Routes */}
                      <Route element={<ProtectedRoute roleRequired="buyer" />}>
                        <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
                        <Route path="/buyer/pending-orders" element={<PendingOrdersPage />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/checkout" element={<CheckoutPage />} />
                        <Route path="/state/:stateName" element={<StateCropsPage />} />
                      </Route>

                      {/* Protected Common Routes */}
                      <Route element={<ProtectedRoute />}>
                        <Route path="/schemes" element={<GovernmentSchemesPage />} />
                        <Route path="/chat" element={<AIChatbot />} />
                        <Route path="/intelligence" element={<IntelligenceHub />} />
                        <Route path="/weather" element={<WeatherPage />} />
                        <Route path="/market-prices" element={<MarketPricePage />} />
                        <Route path="/listing/:id" element={<ListingDetails />} />
                        <Route path="/crop/:id" element={<ListingDetails />} />
                      </Route>

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </ErrorBoundary>
                </Suspense>
                </main>
              </ThemeWrapper>
            </CartProvider>
          </ListingProvider>
        </AuthProvider>
    </Router>
  );
}

export default App;
