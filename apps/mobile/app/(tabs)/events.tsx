import { View, Text, ScrollView, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { EventCard } from '../../components/EventCard';
import { api } from '../../lib/api';

export default function EventsScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-events'>('discover');

  useEffect(() => {
    loadEvents();
  }, [activeTab]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const endpoint = activeTab === 'discover'
        ? '/events'
        : '/events/registrations';
      const response = await api.get(endpoint);
      if (activeTab === 'discover') {
        setEvents(response.data.data || []);
      } else {
        setMyRegistrations(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadEvents();
    setIsRefreshing(false);
  };

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search Bar */}
      <View className="p-4 bg-white border-b border-gray-200">
        <TextInput
          className="bg-gray-100 rounded-lg px-4 py-3 text-gray-900"
          placeholder="Search events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'discover' ? 'border-b-2 border-primary' : ''}`}
          onPress={() => setActiveTab('discover')}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === 'discover' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'my-events' ? 'border-b-2 border-primary' : ''}`}
          onPress={() => setActiveTab('my-events')}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === 'my-events' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            My Events
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <Text className="text-center text-gray-500 mt-8">Loading...</Text>
        ) : activeTab === 'discover' ? (
          filteredEvents.length === 0 ? (
            <Text className="text-center text-gray-500 mt-8">No events found</Text>
          ) : (
            filteredEvents.map((event) => <EventCard key={event.id} event={event} />)
          )
        ) : myRegistrations.length === 0 ? (
          <Text className="text-center text-gray-500 mt-8">No registered events</Text>
        ) : (
          myRegistrations.map((reg) => (
            <EventCard key={reg.event.id} event={reg.event} />
          ))
        )}
      </ScrollView>
    </View>
  );
}
