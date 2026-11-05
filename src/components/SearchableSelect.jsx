import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { sendHttpReq } from "../lib/httpHandler";

export default function SearchableSelect({
    value = "",
    onChange,
    placeholder = "ابحث...",
    endpoint,
    options: localOptions = [],
    isDisabled = false,
    isClearable = true,
    initialOption = null,
}) {
    const [remoteOptions, setRemoteOptions] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);

    // Normalize local options
    const normalizedLocalOptions = useMemo(
        () =>
            localOptions.map((option) => ({
                value: String(option.value),
                label: String(option.label ?? ""),
            })),
        [localOptions]
    );

    // Sync selected value with local options or preserve remote selection
    useEffect(() => {
        if (value === "" || value === null || value === undefined) {
            setSelectedOption(null);
            return;
        }

        const stringValue = String(value);

        if (initialOption && String(initialOption.value) === stringValue) {
            setSelectedOption({
                value: stringValue,
                label: initialOption.label,
            });
            return;
        }

        if (!endpoint) {
            const selected = normalizedLocalOptions.find(
                (option) => option.value === stringValue
            );

            setSelectedOption(selected || null);
            return;
        }

        setSelectedOption((current) =>
            current?.value === stringValue ? current : null
        );
    }, [value, endpoint, normalizedLocalOptions, initialOption]);

    // Search remote options
    useEffect(() => {
        if (!endpoint) {
            setRemoteOptions([]);
            setLoading(false);
            return;
        }

        const searchText = inputValue.trim();

        if (searchText.length < 2) {
            setRemoteOptions([]);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const timeout = setTimeout(async () => {
            try {
                setLoading(true);

                const result = await sendHttpReq(
                    `${endpoint}?search=${encodeURIComponent(searchText)}`
                );

                if (cancelled) return;

                const rows = Array.isArray(result)
                    ? result
                    : result?.data ?? [];

                setRemoteOptions(
                    rows.map((item) => ({
                        value: String(item.id),
                        label: String(item.a_name),
                    }))
                );
            } catch (error) {
                if (!cancelled) {
                    console.error("Search error:", error);
                    setRemoteOptions([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [inputValue, endpoint]);

    // Choose local or remote options
    const availableOptions = useMemo(() => {
        const currentOptions = endpoint
            ? remoteOptions
            : normalizedLocalOptions;

        if (
            selectedOption &&
            !currentOptions.some(
                (option) => option.value === selectedOption.value
            )
        ) {
            return [selectedOption, ...currentOptions];
        }

        return currentOptions;
    }, [
        endpoint,
        remoteOptions,
        normalizedLocalOptions,
        selectedOption,
    ]);

    // Handle selection
    function handleChange(option) {
        setSelectedOption(option);

        // Pass both the selected value and the complete option
        onChange?.(option?.value ?? "", option);

        setInputValue("");
    }

    return (
        <Select
            options={availableOptions}
            value={selectedOption}
            inputValue={inputValue}
            onInputChange={(nextValue, action) => {
                if (action.action === "input-change") {
                    setInputValue(nextValue);
                }

                return nextValue;
            }}
            onChange={handleChange}
            isLoading={loading}
            isDisabled={isDisabled}
            isSearchable
            isClearable={isClearable}
            closeMenuOnSelect
            placeholder={placeholder}
            noOptionsMessage={() =>
                endpoint && inputValue.trim().length < 2
                    ? "اكتب حرفين على الأقل للبحث"
                    : "لا توجد نتائج"
            }
            loadingMessage={() => "جاري البحث..."}
            menuPortalTarget={
                typeof document !== "undefined"
                    ? document.body
                    : undefined
            }
            styles={{
                menuPortal: (base) => ({
                    ...base,
                    zIndex: 99999,
                }),
                menu: (base) => ({
                    ...base,
                    zIndex: 99999,
                }),
            }}
        />
    );
}