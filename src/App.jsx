import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/authContext";

import Home from "./pages/home.jsx";
import Login from "./pages/login.jsx";

import MarketingHome from "./pages/marketing/marketingHome.jsx";
import UsersManagement from "./pages/users/usersManagement.jsx";

import CoordinatorsManagement from "./pages/marketing/coordinators/coordinatorsManagement.jsx";
import PrintLogManagment from "./pages/marketing/printLogs/printLogsManagement.jsx";
import CardDesigner from "./pages/marketing/cardDesigner/cardDesigner.jsx";
import CardManagement from "./pages/marketing/cardManagement/cardManagement.jsx";
import TemporaryCoordinators from "./pages/marketing/temporaryCoordinator/temporaryCoordinator.jsx";
import SecurityManagement from "./pages/marketing/security/securityManagement.jsx";
import DashboardMarketingCoordinators from "./pages/marketing/dashboardMarketingCoordinators.jsx";

// Pricing
import PricingHome from "./pages/pricing/pricingHome.jsx";

import ChickenManagement from "./pages/pricing/chicken/chickenManagement.jsx";
import EggManagement from "./pages/pricing/egg/eggManagement.jsx";
import FishManagement from "./pages/pricing/fish/fishManagement.jsx";

import DailyExchange from "./components/pricing/chicken/DailyExchange.jsx";
import SupplierFactors from "./components/pricing/chicken/SupplierFactors.jsx";
import ManufacturingCost from "./components/pricing/chicken/ManufacturingCost.jsx";
import SellingPrices from "./components/pricing/chicken/SellingPrices.jsx";
import PoultryDashboard from "./pages/pricing/dashboardPricing.jsx";

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Marketing */}
          <Route path="/marketing" element={<MarketingHome />} />
          <Route path="/users" element={<UsersManagement />} />

          <Route
            path="/marketing/printer-log"
            element={<PrintLogManagment />}
          />

          <Route
            path="/marketing/temporary-coordinators"
            element={<TemporaryCoordinators />}
          />

          <Route
            path="/marketing/card-management"
            element={<CardManagement />}
          />

          <Route path="/pricing/dashboard" element={<PoultryDashboard />} />

          <Route
            path="/marketing/dashboard-coordinators"
            element={<DashboardMarketingCoordinators />}
          />

          <Route
            path="/marketing/coordinators"
            element={<CoordinatorsManagement />}
          />

          <Route path="/marketing/card-designer" element={<CardDesigner />} />

          <Route path="/marketing/security" element={<SecurityManagement />} />

          {/* Pricing Home */}
          <Route path="/pricing" element={<PricingHome />} />

          {/* Pricing Sections */}
          <Route path="/pricing/poultry" element={<ChickenManagement />} />

          <Route path="/pricing/eggs" element={<EggManagement />} />

          <Route path="/pricing/fish" element={<FishManagement />} />

          {/* Poultry Management Pages */}
          <Route path="/pricing/exchange" element={<DailyExchange />} />

          <Route path="/pricing/suppliers" element={<SupplierFactors />} />

          <Route
            path="/pricing/manufacturing"
            element={<ManufacturingCost />}
          />

          <Route path="/pricing/selling-prices" element={<SellingPrices />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
