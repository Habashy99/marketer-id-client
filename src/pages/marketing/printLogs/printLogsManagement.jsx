
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

import Header from "../../../components/header";
import { sendHttpReq } from "../../../lib/httpHandler";

import PrintLogFilters from "../../../components/printLog/PrintLogFilters";
import PrintLogHeader from "../../../components/printLog/PrintLogHeader";
import PrintLogActions from "../../../components/printLog/PrintLogActions";
import PrintLogMessages from "../../../components/printLog/PrintLogMessages";
import PrintLogTable from "../../../components/printLog/PrintLogTable";

function getDateString(value) {
    if (!value) return "";

    const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("ar-EG");
}

export default function PrintLogManagment() {
    const navigate = useNavigate();

    const [logs, setLogs] = useState([]);
    const [selectedType, setSelectedType] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadLogs = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await sendHttpReq("printLog");

            if (!Array.isArray(data.logs)) {
                throw new Error(
                    "استجابة الخادم لا تحتوي على سجل الطباعة."
                );
            }

            setLogs(data.logs);
        } catch (err) {
            setError(err.message || "تعذر تحميل سجل الطباعة.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const matchesType =
                !selectedType ||
                String(log.type ?? "").trim() === selectedType;

            const date = getDateString(log.date);

            const matchesFrom =
                !fromDate || (date && date >= fromDate);

            const matchesTo =
                !toDate || (date && date <= toDate);

            return matchesType && matchesFrom && matchesTo;
        });
    }, [logs, selectedType, fromDate, toDate]);

    async function handleDelete(log) {
        const id = log.id;

        if (id == null) {
            setError("لا يمكن حذف السجل: لا يوجد معرّف للسجل.");
            return;
        }

        const confirmed = window.confirm(
            `هل تريد حذف سجل الطباعة الخاص بالموظف ${log.name}?`
        );

        if (!confirmed) return;

        setDeletingId(id);
        setError("");
        setNotice("");

        try {
            const data = await sendHttpReq(
                "printLog/deleteLog",
                "DELETE",
                { id }
            );

            setLogs((previous) =>
                previous.filter(
                    (item) => Number(item.id) !== Number(id)
                )
            );

            setNotice(data.message || "تم حذف السجل بنجاح.");
        } catch (err) {
            setError(
                err.message ||
                    "فشل حذف السجل. تأكد من إعداد مسار الحذف في الخادم."
            );
        } finally {
            setDeletingId(null);
        }
    }

    function exportToExcel() {
        const excelRows = filteredLogs.map((log) => ({
            "كود الموظف": log.code ?? "",
            "اسم الموظف": log.name ?? "",
            النوع: log.type ?? "",
            "تم بواسطة": log.created_by ?? "",
            التاريخ: log.date ? formatDate(log.date) : "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelRows);

        worksheet["!cols"] = [
            { wch: 18 },
            { wch: 28 },
            { wch: 18 },
            { wch: 22 },
            { wch: 24 },
        ];

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "سجل الطباعه"
        );

        XLSX.writeFile(workbook, "سجل الطباعه.xlsx");
    }

    function clearDateSearch() {
        setFromDate("");
        setToDate("");
    }

    return (
        <div dir="rtl" className="min-h-screen bg-gray-100">
            <Header />

            <main className="mx-auto max-w-[1800px] p-4 sm:p-6">
                <PrintLogHeader
                    navigate={navigate}
                    loadLogs={loadLogs}
                    loading={loading}
                />

                <PrintLogMessages
                    error={error}
                    notice={notice}
                />

                <PrintLogFilters
                    selectedType={selectedType}
                    setSelectedType={setSelectedType}
                    fromDate={fromDate}
                    setFromDate={setFromDate}
                    toDate={toDate}
                    setToDate={setToDate}
                    clearDateSearch={clearDateSearch}
                />

                <section className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <PrintLogActions
                        count={filteredLogs.length}
                        loading={loading}
                        onExport={exportToExcel}
                    />

                    <PrintLogTable
                        logs={filteredLogs}
                        loading={loading}
                        deletingId={deletingId}
                        onDelete={handleDelete}
                    />
                </section>
            </main>
        </div>
    );
}
