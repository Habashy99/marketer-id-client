import { hasPermission } from "../../helpers/permissions";
import { useAuth } from "../../context/authContext";
import {
    formatDate,
    isCertificateExpired,
    getPhotoUrl,
} from "../../helpers/coordinatorHelpers";

export default function CoordinatorsTable({
    coordinators,
    loading,
    onSelectCoordinator,
    onPrintCoordinator,
}) {
    if (loading) {
        return (
            <p className="py-8 text-center text-gray-500">
                جاري تحميل بيانات المنسقين...
            </p>
        );
    }

    if (coordinators.length === 0) {
        return (
            <p className="py-8 text-center text-gray-500">
                لا توجد بيانات لعرضها.
            </p>
        );
    }
    const { user } = useAuth();

    // Use 16 for the marketing employees' card system.
    const canPrintCard = hasPermission(user, 24);
    return (
        <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="min-w-350 w-full border-collapse text-right text-sm">
                <thead className="bg-orange-600 text-white">
                    <tr>
                        {[
                            "الكود",
                            "الاسم",
                            "الوظيفة",
                            "الشركة",
                            "شركة الدعاية",
                            "الفرع",
                            "الهاتف",
                            "المحافظة",
                            "الحالة",
                            "الموقف الأمني",
                            "انتهاء الشهادة الصحية",
                            "الصورة الشخصية",
                            "الاستثناءات",
                            "خصم ايميل",
                            "طباعة الكارت",
                        ].map((heading) => (
                            <th
                                key={heading}
                                className="whitespace-nowrap p-3"
                            >
                                {heading}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {coordinators.map((coordinator) => {
                        const inactive =
                            String(coordinator.states ?? "").trim() ===
                            "غير مفعل";

                        const expired = isCertificateExpired(coordinator);

                        const rowClass =
                            inactive || expired
                                ? "bg-red-50 hover:bg-red-100"
                                : "hover:bg-orange-50";

                        const profilePicture =
                            coordinator.profile_picture;

                        return (
                            <tr
                                key={coordinator.id}
                                onClick={() =>
                                    onSelectCoordinator?.(coordinator)
                                }
                                className={`${rowClass} cursor-pointer border-b border-gray-200`}
                                title="اضغط لعرض كل بيانات المنسق"
                            >
                                <td className="whitespace-nowrap p-3">
                                    {coordinator.code ?? "—"}
                                </td>

                                <td className="whitespace-nowrap p-3 font-semibold">
                                    {coordinator.name ?? "—"}
                                </td>

                                <td className="whitespace-nowrap p-3">
                                    {coordinator.job ?? "—"}
                                </td>

                                <td className="p-3">
                                    {coordinator.supplier_name  ?? "—"}
                                </td>

                                <td className="whitespace-nowrap p-3">
                                    {coordinator.advertising_company_name ?? "—"}
                                </td>

                                <td className="whitespace-nowrap p-3">
                                    {coordinator.branch_name ?? "—"}
                                </td>

                                <td className="whitespace-nowrap p-3">
                                    {coordinator.mobile ?? "—"}
                                </td>

                                <td className="p-3">
                                    {coordinator.governorate ?? "—"}
                                </td>

                                <td className="whitespace-nowrap p-3">
                                    <span
                                        className={`rounded-full px-2 py-1 ${inactive
                                            ? "bg-red-200 text-red-800"
                                            : "bg-green-100 text-green-800"
                                            }`}
                                    >
                                        {coordinator.states || "—"}
                                    </span>
                                </td>

                                <td className="p-3">
                                    {coordinator.security_situation ?? "—"}
                                </td>

                                <td
                                    className={`whitespace-nowrap p-3 ${expired
                                        ? "font-bold text-red-700"
                                        : ""
                                        }`}
                                >
                                    {formatDate(
                                        coordinator.health_certificate_expiry_date
                                    )}

                                    {expired && (
                                        <span className="mr-1">
                                            (منتهية)
                                        </span>
                                    )}
                                </td>

                                <td
                                    className="min-w-32 p-3"
                                    onClick={(event) =>
                                        event.stopPropagation()
                                    }
                                >
                                    {profilePicture ? (
                                        <img
                                            src={getPhotoUrl(profilePicture)}
                                            alt={`صورة ${coordinator.name ?? "المنسق"}`}
                                            loading="lazy"
                                            className="h-16 w-16 cursor-pointer rounded-lg border border-gray-200 object-cover transition hover:scale-105"
                                            onClick={() =>
                                                onSelectCoordinator?.(
                                                    coordinator
                                                )
                                            }
                                            onError={(event) => {
                                                event.currentTarget.style.display =
                                                    "none";
                                            }}
                                        />
                                    ) : (
                                        <span className="text-gray-400">
                                            لا توجد صورة
                                        </span>
                                    )}
                                </td>

                                <td className="max-w-56 p-3">
                                    {coordinator.exceptions?.length ? (
                                        <div className="flex flex-col gap-1">
                                            {coordinator.exceptions.map(
                                                (exception) => (
                                                    <span
                                                        key={exception.exception_id}
                                                        className="rounded bg-blue-50 px-2 py-1 text-blue-800"
                                                    >
                                                        {exception.exception_name ||
                                                            "استثناء"}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        "لا توجد استثناءات"
                                    )}
                                </td>
                                <td className="p-3">
                                    {coordinator.email_discount ?? "لا"}
                                </td>

                                {/* Print card */}
                                <td className="whitespace-nowrap p-3">
                                    {canPrintCard && (
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onPrintCoordinator?.(coordinator);
                                            }}
                                            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                        >
                                            طباعة كارت
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
