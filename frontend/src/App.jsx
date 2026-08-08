import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { ListingProvider } from './context/ListingContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import VerifyEmail from './pages/Auth/VerifyEmail';
import FarmerDashboard from './pages/FarmerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import IntelligenceHub from './pages/IntelligenceHub';
import WeatherPage from './pages/WeatherPage';
import MarketPricePage from './pages/MarketPricePage';
import ChatTest from './pages/ChatTest';
import AIChatbot from './pages/AIChatbot';
import ListingDetails from './pages/ListingDetails';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import PendingOrdersPage from './pages/PendingOrdersPage';
import StateCropsPage from './pages/StateCropsPage';
import GovernmentSchemesPage from './pages/GovernmentSchemesPage';

import AgriChatWidget from './components/chat/AgriChatWidget';

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

function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <ListingProvider>
            <CartProvider>
              <ThemeWrapper>
                <main className="flex-1 flex flex-col">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
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
                      <Route path="/listing/:id" element={<ListingDetails />} />
                      <Route path="/crop/:id" element={<ListingDetails />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </ThemeWrapper>
            </CartProvider>
          </ListingProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
