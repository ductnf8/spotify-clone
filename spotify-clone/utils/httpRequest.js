const axios = window.axios;

class HttpRequest {
    constructor() {
        this.baseURL = 'https://spotify.f8team.dev/api/';
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // ✅ Interceptor thêm Authorization header có điều kiện
        this.client.interceptors.request.use((config) => {
            const accessToken = localStorage.getItem('access_token');
            const isAuthRoute =
                config.url.includes('auth/login') || config.url.includes('auth/register');

            // Cho phép 2 route auth đi qua không cần token
            if (isAuthRoute) {
                console.log(`[HttpRequest] Skipping token for ${config.url}`);
                return config;
            }

            // Các request khác phải có token
            if (accessToken) {
                config.headers.Authorization = `Bearer ${accessToken}`;
                return config;
            }

            // ❌ Nếu không có token mà request đòi hỏi xác thực → chặn và hiển thị login
            console.warn('[HttpRequest] Missing token, blocking protected request:', config.url);
            document.querySelector('.auth-buttons')?.classList.add('show');
            document.querySelector('.user-info')?.classList.remove('show');
            throw new Error('Access token required for this request');
        });

        // ✅ Interceptor xử lý response và lỗi 401
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response) {
                    const {status, data} = error.response;

                    const customError = new Error(`HTTP error: ${status}`);
                    customError.status = status;
                    customError.response = data;

                    if (status === 401) {
                        console.warn('[HttpRequest] Unauthorized (401) → clearing session');
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('user');
                        document.querySelector('.auth-buttons')?.classList.add('show');
                        document.querySelector('.user-info')?.classList.remove('show');
                    }

                    throw customError;
                }

                // Lỗi khác (mạng, CORS, v.v.)
                console.error('[HttpRequest] Network error:', error);
                throw error;
            }
        );
    }

    // 🔧 Hàm xử lý chung có logging
    async _send(path, method, data = null, options = {}) {
        try {
            const config = {
                method,
                url: path,
                ...options,
            };

            if (data instanceof FormData) {
                config.data = data;
                if (config.headers) delete config.headers['Content-Type'];
                console.log('[HttpRequest] Sending FormData:', Array.from(data.entries()));
            } else if (data) {
                config.data = data;
            }

            console.log('[HttpRequest] Request:', {
                method,
                url: `${this.baseURL}${path}`,
                hasToken: !!localStorage.getItem('access_token'),
                data: data instanceof FormData ? 'FormData' : data,
            });

            const response = await this.client(config);

            console.log('[HttpRequest] Response:', {
                status: response.status,
                url: path,
                data: response.data,
            });

            return response.data;
        } catch (error) {
            console.error('[HttpRequest] Request failed:', {
                path,
                message: error.message,
                response: error.response,
            });
            throw error;
        }
    }

    // 📡 Các phương thức public
    async get(path, options) {
        return await this._send(path, 'get', null, options);
    }

    async post(path, data, options) {
        return await this._send(path, 'post', data, options);
    }

    async put(path, data, options) {
        return await this._send(path, 'put', data, options);
    }

    async patch(path, data, options) {
        return await this._send(path, 'patch', data, options);
    }

    async delete(path, options) {
        return await this._send(path, 'delete', null, options);
    }
}

const httpRequest = new HttpRequest();
export default httpRequest;
