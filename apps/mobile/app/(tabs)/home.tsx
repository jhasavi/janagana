import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useStore } from '../../lib/store';
import { MembershipCard } from '../../components/MembershipCard';
import { EventCard } from '../../components/EventCard';
import { OpportunityCard } from '../../components/OpportunityCard';
import { PostCard } from '../../components/PostCard';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function HomeScreen() {
  const { member, organization } = useStore();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [eventsRes, shiftsRes, postsRes] = await Promise.all([
        api.get('/events?upcoming=true&limit=5'),
        api.get('/volunteer/my-shifts?upcoming=true&limit=5'),
        api.get('/clubs/posts/recent?limit=5'),
      ]);

      setUpcomingEvents(eventsRes.data.data || []);
      setUpcomingShifts(shiftsRes.data.data || []);
      setRecentPosts(postsRes.data.data || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            Welcome, {member?.firstName}
          </Text>
          <Text className="text-gray-600">{organization?.name}</Text>
        </View>

        {/* Membership Card */}
        <MembershipCard member={member} organization={organization} />

        {/* Upcoming Events */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Upcoming Events
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
            {upcomingEvents.length === 0 ? (
              <Text className="text-gray-500 text-sm">No upcoming events</Text>
            ) : (
              upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} compact />
              ))
            )}
          </ScrollView>
        </View>

        {/* Upcoming Volunteer Shifts */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Your Shifts
          </Text>
          <View className="space-y-3">
            {upcomingShifts.length === 0 ? (
              <Text className="text-gray-500 text-sm">No upcoming shifts</Text>
            ) : (
              upcomingShifts.map((shift) => (
                <OpportunityCard key={shift.id} shift={shift} />
              ))
            )}
          </View>
        </View>

        {/* Recent Club Activity */}
        <View className="mt-6 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Recent Activity
          </Text>
          <View className="space-y-3">
            {recentPosts.length === 0 ? (
              <Text className="text-gray-500 text-sm">No recent activity</Text>
            ) : (
              recentPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
