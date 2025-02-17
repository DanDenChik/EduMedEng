import API_ENDPOINTS from './apiEndpoints';

export async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    try {
        const response = await fetch(API_ENDPOINTS.REFRESH_TOKEN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();
        localStorage.setItem('accessToken', data.access);
        return data.access;
    } catch (error) {
        console.error('Failed to refresh token:', error);
        throw error;
    }
}

export function getAccessToken() {
    return localStorage.getItem('accessToken');
}

export function setAccessToken(token: string) {
    localStorage.setItem('accessToken', token);
}

export function removeTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
}

export function logout() {
    removeTokens();
    window.location.href = '/login';
}

export function setTokensAndRedirect(accessToken: string, refreshToken: string) {
    setAccessToken(accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    window.dispatchEvent(new Event('loginStatusChanged'));

    window.location.href = '/';
}