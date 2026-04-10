import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/auth';
import { useStore } from '../../lib/store';
import { api } from '../../lib/api';

export default function VerifyScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { setMember, setLoading } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError('Invalid verification link');
        setIsLoading(false);
        return;
      }

      try {
        // Verify the magic link token
        const response = await api.post('/auth/verify-magic-link', { token });
        const { member, accessToken, refreshToken } = response.data;

        // Store tokens
        await auth.setToken(accessToken);
        await auth.setRefreshToken(refreshToken);
        await auth.setMemberId(member.id);

        // Store member in state
        setMember(member);

        // Navigate to tabs
        router.replace('/(tabs)');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid or expired link');
        setIsLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#667eea" />
        <Text className="mt-4 text-gray-600">Verifying...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-red-500 text-center mb-4">{error}</Text>
        <View className="space-y-2 w-full max-w-xs">
          <TouchableOpacity
            className="bg-primary rounded-lg py-3 items-center"
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}
