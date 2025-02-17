// const API_HOST = 'https://dandenchik.pythonanywhere.com/';
const API_HOST = 'http://127.0.0.1:8000/';
export const API_ENDPOINTS = {
    REGISTER: `${API_HOST}/api/users/users/register/`,
    LOGIN: `${API_HOST}/api/token/`,
    REFRESH_TOKEN: `${API_HOST}/api/token/update/`,
    MY_PROFILE: `${API_HOST}/api/users/profile/`,
    TOP_USERS: `${API_HOST}/api/users/top-users/`,
    NEW_CHAT: `${API_HOST}/api/core/chats/`,
    SEND_MESSAGE: (chatId: number) => `${API_HOST}/api/core/chats/${chatId}/send_message/`,
    END_GAME: (chatId: number) => `${API_HOST}/api/core/chats/${chatId}/end_game/`,
    PAST_GAMES: `${API_HOST}/api/core/chats/`,
    CHATS: `${API_HOST}/api/core/chats/`,
};

export default API_ENDPOINTS;