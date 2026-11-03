
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import Header from "../../../components/header";
import CardStatistics from "../../../components/cardManagement/CardStatistics";
import CardLogsSection from "../../../components/cardManagement/CardLogsSection";
import { useCardLogs } from "../../../hooks/useCardLogs";
import { useCardTotals } from "../../../hooks/useCardTotals";
import { useAuth } from "../../../context/authContext";
import { hasPermission } from "../../../helpers/permissions";

function CardManagement() {
    const navigate = useNavigate();
    const totals = useCardTotals();
    const { user } = useAuth();

    const canAddQuantity = hasPermission(user, 14);
    const logs = useCardLogs(totals.fetchTotals);

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800">
            <div className="sticky top-0 z-40">
                <Header />
            </div>

            <main
                dir="rtl"
                className="mx-auto w-full max-w-[1700px] p-4 md:p-6"
            >
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                            إدارة البطاقات
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            تسجيل كميات البطاقات ومتابعة بياناتها.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
                    >
                        <ArrowRight size={18} />
                        رجوع
                    </button>
                </div>

                <CardStatistics
                    totalInventory={totals.totalInventory}
                    totalSpent={totals.totalSpent}
                    totalRemaining={totals.totalRemaining}
                    loadingTotals={totals.loadingTotals}
                />

                <CardLogsSection
                    logs={logs.cardLogs}
                    fromDate={logs.logsFromDate}
                    setFromDate={logs.setLogsFromDate}
                    toDate={logs.logsToDate}
                    setToDate={logs.setLogsToDate}
                    newQuantity={logs.newQuantity}
                    setNewQuantity={logs.setNewQuantity}
                    error={logs.error}
                    success={logs.success}
                    loading={logs.loadingLogs}
                    saving={logs.saving}
                    deletingId={logs.deletingId}
                    onFilter={logs.handleLogsDateFilter}
                    onClearFilter={logs.clearLogsDateFilter}
                    onAdd={logs.handleAddQuantity}
                    onDelete={logs.handleDeleteLog}
                    setError={logs.setError}
                    setSuccess={logs.setSuccess}
                    canAddQuantity={canAddQuantity}
                />
            </main>
        </div>
    );
}

export default CardManagement;
