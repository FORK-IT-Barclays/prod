/**
 * useApi — Generic data-fetching hook with loading, error, and refetch support.
 * Usage:
 *   const { data, loading, error, refetch } = useApi(apiFn, [...args], { deps? });
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const useApi = (apiFn, args = [], options = {}) => {
    const { enabled = true, initialData = null } = options;
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);
    // Use a ref for args to avoid stale closure without re-running effect every render
    const argsRef = useRef(args);
    argsRef.current = args;

    const execute = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFn(...argsRef.current);
            setData(result.data ?? result);
        } catch (err) {
            setError(err.message || 'Request failed');
        } finally {
            setLoading(false);
        }
    }, [apiFn]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (enabled) execute();
    }, [execute, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

    return { data, loading, error, refetch: execute };
};

export default useApi;
