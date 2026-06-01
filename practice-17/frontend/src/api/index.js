import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'https://localhost:3443/api',
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

export const api = {
    register: async (userData) => {
        const response = await apiClient.post('/auth/register', userData);
        return response.data;
    },

    login: async (credentials) => {
        const response = await apiClient.post('/auth/login', credentials);
        return response.data;
    },

    logout: async () => {
        const response = await apiClient.post('/auth/logout');
        return response.data;
    },

    getMe: async () => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },

    getUsers: async () => {
        const response = await apiClient.get('/users');
        return response.data;
    },

    updateUser: async (id, userData) => {
        const response = await apiClient.put(`/users/${id}`, userData);
        return response.data;
    },

    deleteUser: async (id) => {
        const response = await apiClient.delete(`/users/${id}`);
        return response.data;
    },

    getProducts: async () => {
        const response = await apiClient.get('/products');
        return response.data;
    },

    createProduct: async (product) => {
        const response = await apiClient.post('/products', product);
        return response.data;
    },

    updateProduct: async (id, product) => {
        const response = await apiClient.put(`/products/${id}`, product);
        return response.data;
    },

    deleteProduct: async (id) => {
        const response = await apiClient.delete(`/products/${id}`);
        return response.data;
    },

    subscribe: async (subscription) => {
        const response = await apiClient.post('/subscribe', subscription);
        return response.data;
    },

    unsubscribe: async (endpoint) => {
        const response = await apiClient.post('/unsubscribe', { endpoint });
        return response.data;
    },

    checkout: async () => {
        const response = await apiClient.post('/checkout');
        return response.data;
    },

    pushTest: async () => {
        const response = await apiClient.post('/push-test');
        return response.data;
    },

    createReminder: async (reminderData) => {
        const response = await apiClient.post('/reminders', reminderData);
        return response.data;
    },

    snoozeReminder: async (reminderId) => {
        const response = await apiClient.post(`/snooze?reminderId=${reminderId}`);
        return response.data;
    },

    createSale: async (saleData) => {
        const response = await apiClient.post('/sales', saleData);
        return response.data;
    }
};
