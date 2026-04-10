import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const MEMBER_ID_KEY = 'member_id';
const TENANT_SLUG_KEY = 'tenant_slug';
const ORGANIZATION_CODE_KEY = 'organization_code';

export const auth = {
  async setToken(token: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async setRefreshToken(token: string) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async setMemberId(memberId: string) {
    await SecureStore.setItemAsync(MEMBER_ID_KEY, memberId);
  },

  async getMemberId(): Promise<string | null> {
    return await SecureStore.getItemAsync(MEMBER_ID_KEY);
  },

  async setTenantSlug(slug: string) {
    await SecureStore.setItemAsync(TENANT_SLUG_KEY, slug);
  },

  async getTenantSlug(): Promise<string | null> {
    return await SecureStore.getItemAsync(TENANT_SLUG_KEY);
  },

  async setOrganizationCode(code: string) {
    await SecureStore.setItemAsync(ORGANIZATION_CODE_KEY, code);
  },

  async getOrganizationCode(): Promise<string | null> {
    return await SecureStore.getItemAsync(ORGANIZATION_CODE_KEY);
  },

  async clear() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(MEMBER_ID_KEY);
    await SecureStore.deleteItemAsync(TENANT_SLUG_KEY);
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  },
};
