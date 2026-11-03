
import { useCallback, useEffect, useState } from "react";
import { sendHttpReq } from "../lib/httpHandler";

export function useCardTotals() {
    const [totalInventory, setTotalInventory] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [loadingTotals, setLoadingTotals] = useState(true);

    const fetchTotals = useCallback(async () => {
        setLoadingTotals(true);

        try {
            const [inventoryData, printedData] = await Promise.all([
                sendHttpReq("card-logs/total"),
                sendHttpReq("printLog/total-printed-cards"),
            ]);

            setTotalInventory(Number(inventoryData.totalQuantity) || 0);
            setTotalSpent(Number(printedData.totalPrintedCards) || 0);
        } catch (err) {
            console.error("Fetch card totals error:", err);
            throw err;
        } finally {
            setLoadingTotals(false);
        }
    }, []);

    useEffect(() => {
        fetchTotals().catch(() => {});
    }, [fetchTotals]);

    return {
        totalInventory,
        totalSpent,
        totalRemaining: totalInventory - totalSpent,
        loadingTotals,
        fetchTotals,
    };
}
