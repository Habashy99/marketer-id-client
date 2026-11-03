
import { useCallback, useEffect, useState } from "react";
import { sendHttpReq } from "../lib/httpHandler";

export function useCardLogs(onMutation) {
    const [cardLogs, setCardLogs] = useState([]);
    const [logsFromDate, setLogsFromDate] = useState("");
    const [logsToDate, setLogsToDate] = useState("");
    const [appliedDates, setAppliedDates] = useState({
        from: "",
        to: "",
    });

    const [newQuantity, setNewQuantity] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [loadingLogs, setLoadingLogs] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const fetchCardLogs = useCallback(async (from = "", to = "") => {
        setLoadingLogs(true);

        try {
            let url = "card-logs";

            if (from && to) {
                const params = new URLSearchParams({
                    fromDate: from,
                    toDate: to,
                });
                url += `?${params.toString()}`;
            }

            const data = await sendHttpReq(url);
            setCardLogs(Array.isArray(data.logs) ? data.logs : []);
            setError("");
        } catch (err) {
            console.error("Fetch card logs error:", err);
            setError(err.message || "حدث خطأ أثناء تحميل سجل البطاقات.");
        } finally {
            setLoadingLogs(false);
        }
    }, []);

    useEffect(() => {
        fetchCardLogs();
    }, [fetchCardLogs]);

    async function handleLogsDateFilter(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (
            (logsFromDate && !logsToDate) ||
            (!logsFromDate && logsToDate)
        ) {
            setError("يرجى تحديد تاريخ البداية وتاريخ النهاية معاً.");
            return;
        }

        if (logsFromDate && logsToDate && logsFromDate > logsToDate) {
            setError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو مساوياً له.");
            return;
        }

        setAppliedDates({
            from: logsFromDate,
            to: logsToDate,
        });

        await fetchCardLogs(logsFromDate, logsToDate);
    }

    async function clearLogsDateFilter() {
        setLogsFromDate("");
        setLogsToDate("");
        setAppliedDates({ from: "", to: "" });
        setError("");
        setSuccess("");
        await fetchCardLogs("", "");
    }

    async function refreshLogs() {
        await fetchCardLogs(appliedDates.from, appliedDates.to);
    }

    async function handleAddQuantity(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        const quantity = Number(newQuantity);

        if (
            newQuantity.trim() === "" ||
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            setError("أدخل كمية صحيحة أكبر من صفر.");
            return;
        }

        setSaving(true);

        try {
            const data = await sendHttpReq("card-logs", "POST", {
                quantity,
            });

            setNewQuantity("");
            setSuccess(data.message || "تمت إضافة كمية البطاقات بنجاح.");

            await Promise.all([
                refreshLogs(),
                onMutation(),
            ]);
        } catch (err) {
            console.error("Add card quantity error:", err);
            setError(err.message || "حدث خطأ أثناء إضافة الكمية.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteLog(id) {
        const confirmed = window.confirm("هل أنت متأكد من حذف سجل البطاقات?");
        if (!confirmed) return;

        setError("");
        setSuccess("");
        setDeletingId(id);

        try {
            const data = await sendHttpReq(`card-logs/${id}`, "DELETE");
            setSuccess(data.message || "تم حذف السجل بنجاح.");
            await Promise.all([
                refreshLogs(),
                onMutation(),
            ]);
        } catch (err) {
            console.error("Delete card log error:", err);
            setError(err.message || "حدث خطأ أثناء حذف السجل.");
        } finally {
            setDeletingId(null);
        }
    }

    return {
        cardLogs,
        logsFromDate,
        setLogsFromDate,
        logsToDate,
        setLogsToDate,
        newQuantity,
        setNewQuantity,
        error,
        setError,
        success,
        setSuccess,
        loadingLogs,
        saving,
        deletingId,
        handleLogsDateFilter,
        clearLogsDateFilter,
        handleAddQuantity,
        handleDeleteLog,
    };
}
