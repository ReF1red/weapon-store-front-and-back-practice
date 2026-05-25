import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  pendingQueue = [];
}

function clearLocalSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

function hasRefreshToken() {
  return Boolean(localStorage.getItem('refreshToken'));
}

async function requestTokenRefresh() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const response = await axios.post('http://localhost:3000/api/auth/refresh', {}, {
    headers: {
      'Content-Type': 'application/json',
      'x-refresh-token': refreshToken
    }
  });

  if (response.data.accessToken) {
    localStorage.setItem('accessToken', response.data.accessToken);
  }

  if (response.data.refreshToken) {
    localStorage.setItem('refreshToken', response.data.refreshToken);
  }

  return response.data.accessToken;
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    if (!localStorage.getItem('refreshToken')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newAccessToken = await requestTokenRefresh();
      processQueue(null, newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearLocalSession();
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
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response.data;
  },

  refresh: async () => {
    const token = await requestTokenRefresh();
    return { accessToken: token, refreshToken: localStorage.getItem('refreshToken') };
  },

  restoreSession: async () => {
    if (!hasRefreshToken() && !localStorage.getItem('accessToken')) {
      throw new Error('No saved session');
    }

    if (!localStorage.getItem('accessToken') && hasRefreshToken()) {
      await requestTokenRefresh();
    }

    try {
      return await api.getMe();
    } catch (error) {
      if (!hasRefreshToken()) {
        throw error;
      }

      await requestTokenRefresh();
      return api.getMe();
    }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await apiClient.post('/auth/logout', {}, {
        headers: {
          'x-refresh-token': refreshToken || ''
        }
      });
    } catch (error) {
      // Ignore logout transport errors and clear local session anyway.
    } finally {
      clearLocalSession();
    }
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
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
