import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { auth } from '../lib/auth';
import { useStore } from '../lib/store';
import { api } from '../lib/api';

export default function OrganizationScreen() {
  const router = useRouter();
  const { setOrganization, setLoading } = useStore();
  const [organizationCode, setOrganizationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentOrgs, setRecentOrgs] = useState<any[]>([]);

  const handleContinue = async () => {
    if (!organizationCode.trim()) {
      setError('Please enter an organization code or URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Resolve organization from code or URL
      const slug = organizationCode.toLowerCase().replace(/[^a-z0-9-]/g, '');
      const response = await api.get(`/tenants/by-slug/${slug}`);
      const org = response.data;

      await auth.setTenantSlug(org.slug);
      await auth.setOrganizationCode(organizationCode);
      setOrganization(org);

      // Go to login
      router.replace('/(auth)/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Organization not found');
    } finally {
      setIsLoading(false);
    }
  };

  const selectOrganization = (org: any) => {
    auth.setTenantSlug(org.slug);
    setOrganization(org);
    router.replace('/(auth)/login');
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        <View className="p-6 pt-16">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome to OrgFlow</Text>
          <Text className="text-gray-600 mb-8">Enter your organization code to get started</Text>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Organization Code or URL
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                placeholder="e.g., my-org or my-org.orgflow.app"
                value={organizationCode}
                onChangeText={setOrganizationCode}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {error ? (
              <Text className="text-red-500 text-sm">{error}</Text>
            ) : null}

            <TouchableOpacity
              className="bg-primary rounded-lg py-4 items-center"
              onPress={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Continue</Text>
              )}
            </TouchableOpacity>

            {recentOrgs.length > 0 && (
              <>
                <View className="h-px bg-gray-200 my-6" />
                <Text className="text-sm font-medium text-gray-700 mb-4">
                  Recent Organizations
                </Text>
                {recentOrgs.map((org) => (
                  <TouchableOpacity
                    key={org.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg mb-3"
                    onPress={() => selectOrganization(org)}
                  >
                    <View className="w-12 h-12 bg-primary/10 rounded-lg items-center justify-center">
                      <Text className="text-primary font-bold text-lg">
                        {org.name.charAt(0)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium text-gray-900">{org.name}</Text>
                      <Text className="text-sm text-gray-500">{org.slug}.orgflow.app</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
