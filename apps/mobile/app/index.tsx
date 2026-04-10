import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { auth } from '../lib/auth';
import { useStore } from '../lib/store';

export default function IndexScreen() {
  const router = useRouter();
  const { organization, setLoading } = useStore();

  useEffect(() => {
    async function checkAuth() {
      setLoading(true);
      const isAuthenticated = await auth.isAuthenticated();
      const savedOrg = await auth.getTenantSlug();

      if (isAuthenticated && savedOrg) {
        // Already logged in, go to tabs
        router.replace('/(tabs)');
      } else if (savedOrg) {
        // Has org but not logged in, go to login
        router.replace('/(auth)/login');
      } else {
        // No org, show organization selection
        router.replace('/organization');
      }
      setLoading(false);
    }

    checkAuth();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <ActivityIndicator size="large" color="white" />
    </View>
  );
}
