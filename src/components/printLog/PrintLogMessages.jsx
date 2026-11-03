
export default function PrintLogMessages({ error, notice }) {
    return (
        <>
            {error && (
                <div
                    role="alert"
                    className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700"
                >
                    {error}
                </div>
            )}

            {notice && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
                    {notice}
                </div>
            )}
        </>
    );
}
