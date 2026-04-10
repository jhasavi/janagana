import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { ClubCard } from '../../components/ClubCard';
import { api } from '../../lib/api';

export default function ClubsScreen() {
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [discoverClubs, setDiscoverClubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      setIsLoading(true);
      const [myRes, discoverRes] = await Promise.all([
        api.get('/clubs/my-clubs'),
        api.get('/clubs?discover=true'),
      ]);
      setMyClubs(myRes.data.data || []);
      setDiscoverClubs(discoverRes.data.data || []);
    } catch (error) {
      console.error('Failed to load clubs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadClubs();
    setIsRefreshing(false);
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <View className="p-4">
        {/* My Clubs */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">My Clubs</Text>
          {myClubs.length === 0 ? (
            <Text className="text-gray-500 text-sm">You haven't joined any clubs yet</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
              {myClubs.map((club) => (
                <ClubCard key={club.id} club={club} compact />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Discover Clubs */}
        <View>
          <Text className="text-lg font-semibold text-gray-900 mb-3">Discover Clubs</Text>
          {isLoading ? (
            <Text className="text-gray-500 text-sm">Loading...</Text>
          ) : discoverClubs.length === 0 ? (
            <Text className="text-gray-500 text-sm">No clubs available</Text>
          ) : (
            discoverClubs.map((club) => <ClubCard key={club.id} club={club} />)
          )}
        </View>
      </View>
    </ScrollView>
  );
}
