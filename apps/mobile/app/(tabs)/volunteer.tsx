import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { OpportunityCard } from '../../components/OpportunityCard';
import { api } from '../../lib/api';
import { Plus, Clock } from 'lucide-react-native';

export default function VolunteerScreen() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'my-shifts' | 'calendar'>('opportunities');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'opportunities') {
        const response = await api.get('/volunteer/opportunities?status=OPEN');
        setOpportunities(response.data.data || []);
      } else if (activeTab === 'my-shifts') {
        const response = await api.get('/volunteer/my-shifts');
        setMyShifts(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load volunteer data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'opportunities' ? 'border-b-2 border-primary' : ''}`}
          onPress={() => setActiveTab('opportunities')}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === 'opportunities' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            Opportunities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'my-shifts' ? 'border-b-2 border-primary' : ''}`}
          onPress={() => setActiveTab('my-shifts')}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === 'my-shifts' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            My Shifts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'calendar' ? 'border-b-2 border-primary' : ''}`}
          onPress={() => setActiveTab('calendar')}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === 'calendar' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            Calendar
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
        ) : activeTab === 'opportunities' ? (
          opportunities.length === 0 ? (
            <Text className="text-center text-gray-500 mt-8">No open opportunities</Text>
          ) : (
            opportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))
          )
        ) : activeTab === 'my-shifts' ? (
          myShifts.length === 0 ? (
            <Text className="text-center text-gray-500 mt-8">No scheduled shifts</Text>
          ) : (
            myShifts.map((shift) => (
              <OpportunityCard key={shift.id} shift={shift} />
            ))
          )
        ) : (
          <View className="items-center justify-center mt-16">
            <Clock size={48} color="#6b7280" />
            <Text className="text-gray-500 mt-4">Calendar view coming soon</Text>
          </View>
        )}
      </ScrollView>

      {/* Log Hours Button */}
      {activeTab === 'my-shifts' && (
        <TouchableOpacity className="bg-primary m-4 p-4 rounded-xl items-center">
          <Text className="text-white font-semibold">Log Volunteer Hours</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
