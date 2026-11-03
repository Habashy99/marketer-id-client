import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/authContext";

import Home from "./pages/home.jsx";
import Login from "./pages/login.jsx";
import MarketingHome from "./pages/marketing/marketingHome.jsx";
import UsersManagement from "./pages/users/usersManagement.jsx";
import CoordinatorsManagement from "./pages/marketing/coordinators/coordinatorsManagement.jsx";
import PricingHome from "./pages/pricing/pricingHome.jsx";
import PrintLogManagment from "./pages/marketing/printLogs/printLogsManagement.jsx";
import CardDesigner from "./pages/marketing/cardDesigner/cardDesigner.jsx";
import CardManagement from "./pages/marketing/cardManagement/cardManagement.jsx";
import TemporaryCoordinators from "./pages/marketing/temporaryCoordinator/temporaryCoordinator.jsx";

function App() {
    return (
        <AuthProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/marketing" element={<MarketingHome />} />
                    <Route
                        path="/users"
                        element={<UsersManagement />}
                    />
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
                    <Route
                        path="/marketing/coordinators"
                        element={<CoordinatorsManagement />}
                    />
                    <Route
                        path="/marketing/card-designer"
                        element={<CardDesigner />}
                    />
                    <Route path="/pricing" element={<PricingHome />} />
                </Routes>
            </HashRouter>
        </AuthProvider>
    );
}

export default App;
