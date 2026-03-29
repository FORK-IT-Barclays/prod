/**
 * VECTOR Terminal — API Service Layer
 * Central axios-like fetch wrapper for all backend calls.
 * Import functions from here in React components instead of using mockData directly.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Generic fetcher ──────────────────────────────────────────────────
const apiFetch = async (path, options = {}) => {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'API error');
    return data;
};

// ─── Build query string helper ────────────────────────────────────────
const qs = (params = {}) => {
    const q = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    return q ? `?${q}` : '';
};

// ═══════════════════════════════════════════════════════════════════════
//  LOAN ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Fetch paginated list of loan accounts with optional filters.
 * @param {{ tier?, diagnosis?, search?, page?, limit?, sortBy?, sortDir? }} params
 */
export const getAccounts = (params = {}) =>
    apiFetch(`/accounts${qs(params)}`);

/**
 * Fetch a single loan account by VEC-id or LA-id.
 */
export const getAccount = (id) =>
    apiFetch(`/accounts/${id}`);

/**
 * Fetch aggregated portfolio statistics for the Dashboard.
 */
export const getPortfolioStats = () =>
    apiFetch('/accounts/stats/portfolio');

/**
 * Add an intervention to an account.
 * @param {string} accountId  e.g. "VEC-9021"
 * @param {{ type: string, outcome: string }} payload
 */
export const addIntervention = (accountId, payload) =>
    apiFetch(`/accounts/${accountId}/interventions`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

// ═══════════════════════════════════════════════════════════════════════
//  TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Fetch paginated transactions with optional filters.
 * @param {{ status?, type?, channel?, loanAccountId?, page?, limit? }} params
 */
export const getTransactions = (params = {}) =>
    apiFetch(`/transactions${qs(params)}`);

/**
 * Fetch transaction aggregate stats (for TransactionLog header cards).
 */
export const getTransactionStats = () =>
    apiFetch('/transactions/stats');

/**
 * Fetch a single transaction by txId.
 */
export const getTransaction = (txId) =>
    apiFetch(`/transactions/${txId}`);

/**
 * Manually inject a transaction (TransactionLog mock-inject feature).
 */
export const injectTransaction = (payload) =>
    apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
    });

// ═══════════════════════════════════════════════════════════════════════
//  BATCHES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Fetch the most recent completed batch (Dashboard widget).
 */
export const getLatestBatch = () =>
    apiFetch('/batches/latest');

/**
 * Fetch all recent batches.
 */
export const getBatches = () =>
    apiFetch('/batches');

// ═══════════════════════════════════════════════════════════════════════
//  HEALTH
// ═══════════════════════════════════════════════════════════════════════
export const healthCheck = () =>
    apiFetch('/health');
