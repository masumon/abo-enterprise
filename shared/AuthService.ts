import { api } from "./ApiService";
import { storage } from "./StorageService";

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
}

export class AuthService {
  private currentUser: User | null = null;
  private isAuthenticated = false;

  async init(): Promise<void> {
    const token = await storage.getItem("auth_token");
    const user = await storage.getItem("user");

    if (token && user) {
      this.isAuthenticated = true;
      this.currentUser = user;
    }
  }

  async login(credentials: AuthCredentials): Promise<User> {
    try {
      const response = await api.post("/auth/login", credentials);
      const { access_token, user, expires_in } = response.data;

      await storage.setItem("auth_token", access_token, expires_in / 60);
      await storage.setItem("user", user);

      this.isAuthenticated = true;
      this.currentUser = user;

      return user;
    } catch (error) {
      throw new Error(`Login failed: ${error}`);
    }
  }

  async signup(data: any): Promise<User> {
    try {
      const response = await api.post("/auth/signup", data);
      const { access_token, user, expires_in } = response.data;

      await storage.setItem("auth_token", access_token, expires_in / 60);
      await storage.setItem("user", user);

      this.isAuthenticated = true;
      this.currentUser = user;

      return user;
    } catch (error) {
      throw new Error(`Signup failed: ${error}`);
    }
  }

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }

    await storage.removeItem("auth_token");
    await storage.removeItem("user");

    this.isAuthenticated = false;
    this.currentUser = null;
  }

  async refreshToken(): Promise<string> {
    try {
      const response = await api.post("/auth/refresh");
      const { access_token, expires_in } = response.data;

      await storage.setItem("auth_token", access_token, expires_in / 60);
      return access_token;
    } catch (error) {
      await this.logout();
      throw new Error("Token refresh failed");
    }
  }

  async updateProfile(data: any): Promise<User> {
    try {
      const response = await api.patch("/auth/profile", data);
      const user = response.data.user || response.data;

      await storage.setItem("user", user);
      this.currentUser = user;

      return user;
    } catch (error) {
      throw new Error(`Profile update failed: ${error}`);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
    } catch (error) {
      throw new Error(`Password change failed: ${error}`);
    }
  }

  getUser(): User | null {
    return this.currentUser;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  async getToken(): Promise<string | null> {
    return await storage.getItem("auth_token");
  }
}

export const auth = new AuthService();
