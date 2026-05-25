import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

let isRefreshing = false;
let pendingQueue = [];

function processQueue(error) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  pendingQueue = [];
}

async function requestMe() {
  const response = await apiClient.get('/auth/me');
  return response.data;
}

async function refreshSession() {
  await apiClient.post('/auth/refresh');
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login')
      || originalRequest?.url?.includes('/auth/register')
      || originalRequest?.url?.includes('/auth/refresh');

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then(() => apiClient(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await refreshSession();
      processQueue(null);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const api = {
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  refresh: async () => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  restoreSession: async () => {
    try {
      return await requestMe();
    } catch (error) {
      if (error.response?.status !== 401) {
        throw error;
      }

      await refreshSession();
      return requestMe();
    }
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    return requestMe();
  },

  getUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  getUser: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
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

  getProduct: async (id) => {
    const response = await apiClient.get(`/products/${id}`);
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
  }
};
