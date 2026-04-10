import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { auth } from '../../lib/auth';
import { useStore } from '../../lib/store';
import { api } from '../../lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const { organization, setMember } = useStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/magic-link', {
        email,
        tenantSlug: organization?.slug,
      });

      // Navigate to verify screen
      router.push('/(auth)/verify');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send magic link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="flex-1 p-6 pt-16 justify-center">
        {organization && (
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-4">
              <Text className="text-primary font-bold text-3xl">
                {organization.name.charAt(0)}
              </Text>
            </View>
            <Text className="text-xl font-semibold text-gray-900">{organization.name}</Text>
          </View>
        )}

        <Text className="text-3xl font-bold text-gray-900 mb-2">Sign In</Text>
        <Text className="text-gray-600 mb-8">Enter your email to receive a magic link</Text>

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          {error ? (
            <Text className="text-red-500 text-sm">{error}</Text>
          ) : null}

          <TouchableOpacity
            className="bg-primary rounded-lg py-4 items-center"
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Send Magic Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-4"
            onPress={() => router.replace('/organization')}
          >
            <Text className="text-center text-gray-600">Switch Organization</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
