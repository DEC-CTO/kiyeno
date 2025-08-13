/**
 * API 통신 서비스
 * 서버와의 HTTP 통신을 담당하는 기본 서비스
 */

class ApiService {
    constructor() {
        this.baseURL = window.location.origin + '/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    /**
     * HTTP 요청 공통 처리
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        try {
            console.log(`🌐 API 요청: ${config.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            console.log(`✅ API 응답 성공: ${url}`, data);
            return data;
            
        } catch (error) {
            console.error(`❌ API 요청 실패: ${url}`, error);
            throw error;
        }
    }

    /**
     * GET 요청
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return await this.request(url, {
            method: 'GET'
        });
    }

    /**
     * POST 요청
     */
    async post(endpoint, data = {}) {
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT 요청
     */
    async put(endpoint, data = {}) {
        return await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE 요청
     */
    async delete(endpoint) {
        return await this.request(endpoint, {
            method: 'DELETE'
        });
    }

    /**
     * 요청 취소를 위한 AbortController 지원
     */
    async requestWithAbort(endpoint, options = {}, signal = null) {
        if (signal) {
            options.signal = signal;
        }
        
        return await this.request(endpoint, options);
    }

    /**
     * 일괄 요청 처리
     */
    async batch(requests) {
        const promises = requests.map(req => 
            this.request(req.endpoint, req.options)
        );
        
        try {
            const results = await Promise.allSettled(promises);
            return results.map((result, index) => ({
                request: requests[index],
                success: result.status === 'fulfilled',
                data: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason : null
            }));
        } catch (error) {
            console.error('일괄 요청 처리 실패:', error);
            throw error;
        }
    }
}

export default ApiService;