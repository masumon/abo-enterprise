export interface ApiConfig {
  baseURL: string;
  timeout: number;
}

export class ApiService {
  private baseURL: string;
  private timeout: number;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor(config: ApiConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout;
  }

  async get(endpoint: string, options: any = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Check cache
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return { data: cached.data, cached: true };
    }

    try {
      const response = await this.fetchWithTimeout(url, {
        method: "GET",
        headers: this.getHeaders(),
        ...options,
      });

      const data = await response.json();
      this.cache.set(url, { data, timestamp: Date.now() });
      return { data, cached: false };
    } catch (error) {
      throw new Error(`GET ${endpoint} failed: ${error}`);
    }
  }

  async post(endpoint: string, payload: any = {}, options: any = {}) {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await this.fetchWithTimeout(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        ...options,
      });

      const data = await response.json();
      this.cache.clear(); // Clear cache on mutation
      return { data };
    } catch (error) {
      throw new Error(`POST ${endpoint} failed: ${error}`);
    }
  }

  async patch(endpoint: string, payload: any = {}, options: any = {}) {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await this.fetchWithTimeout(url, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        ...options,
      });

      const data = await response.json();
      this.cache.clear();
      return { data };
    } catch (error) {
      throw new Error(`PATCH ${endpoint} failed: ${error}`);
    }
  }

  async delete(endpoint: string, options: any = {}) {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await this.fetchWithTimeout(url, {
        method: "DELETE",
        headers: this.getHeaders(),
        ...options,
      });

      const data = await response.json();
      this.cache.clear();
      return { data };
    } catch (error) {
      throw new Error(`DELETE ${endpoint} failed: ${error}`);
    }
  }

  private getHeaders() {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.getToken()}`,
    };
  }

  private getToken(): string {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token") || "";
    }
    return "";
  }

  private fetchWithTimeout(url: string, options: any): Promise<Response> {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), this.timeout)
      ),
    ]);
  }

  clearCache() {
    this.cache.clear();
  }
}

export const api = new ApiService({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1",
  timeout: 10000,
});
