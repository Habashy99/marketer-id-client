
const API_URL = "http://127.0.0.1:3000";

export async function sendHttpReq(url, method = "GET", data = null) {
    const normalizedUrl = url.replace(/^\/+/, "");

    const isFormData =
        typeof FormData !== "undefined" && data instanceof FormData;

    const options = {
        method,
        credentials: "include",
    };

    if (data !== null && data !== undefined) {
        if (isFormData) {
            options.body = data;
        } else {
            options.headers = {
                "Content-Type": "application/json",
            };
            options.body = JSON.stringify(data);
        }
    }

    const response = await fetch(
        `${API_URL}/${normalizedUrl}`,
        options
    );

    const contentType = response.headers.get("content-type");

    const result = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        throw new Error(
            typeof result === "object" && result !== null
                ? result.message || `HTTP error ${response.status}`
                : result || `HTTP error ${response.status}`
        );
    }

    return result;
}
