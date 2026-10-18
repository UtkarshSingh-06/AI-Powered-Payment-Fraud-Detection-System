import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

const AUTH_SKIP_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshPromise = null;

function shouldSkipRefresh(config) {
  const url = config?.url || '';
  return AUTH_SKIP_REFRESH.some((path) => url.includes(path));
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then((res) => {
        const token = res.data?.token || res.data?.accessToken;
        if (token) localStorage.setItem('token', token);
        return res;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !shouldSkipRefresh(original)) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        localStorage.removeItem('token');
        const onAuthPage =
          window.location.pathname.startsWith('/login') ||
          window.location.pathname.startsWith('/register');
        if (!onAuthPage) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
