import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Calendar, Clock, MapPin, ArrowLeft, Check } from 'lucide-react-native';

export default function VolunteerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    loadOpportunity();
  }, [id]);

  const loadOpportunity = async () => {
    try {
      setIsLoading(true);
      const [oppRes, appRes] = await Promise.all([
        api.get(`/volunteer/opportunities/${id}`),
        api.get(`/volunteer/opportunities/${id}/application`),
      ]);
      setOpportunity(oppRes.data);
      setApplication(appRes.data);
    } catch (error) {
      console.error('Failed to load opportunity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    try {
      setIsApplying(true);
      await api.post(`/volunteer/opportunities/${id}/apply`);
      await loadOpportunity();
    } catch (error) {
      console.error('Failed to apply:', error);
    } finally {
      setIsApplying(false);
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
      <View className="p-4 pt-16">
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-gray-900 mb-2">{opportunity?.title}</Text>
        <Text className="text-gray-600 mb-4">{opportunity?.description}</Text>

        {/* Opportunity Details */}
        <View className="bg-white rounded-xl p-4 mb-4 space-y-3">
          <View className="flex-row items-center gap-3">
            <Calendar size={20} color="#667eea" />
            <View>
              <Text className="font-medium text-gray-900">
                {opportunity?.startDate ? new Date(opportunity.startDate).toLocaleDateString() : 'Ongoing'}
              </Text>
              <Text className="text-sm text-gray-500">
                {opportunity?.startTime} - {opportunity?.endTime}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <Clock size={20} color="#667eea" />
            <Text className="text-gray-900">{opportunity?.hoursPerShift || 2} hours per shift</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <MapPin size={20} color="#667eea" />
            <Text className="text-gray-900">{opportunity?.location || 'Various'}</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Check size={20} color="#667eea" />
            <Text className="text-gray-900">{opportunity?.requiredSkills || 'No specific skills required'}</Text>
          </View>
        </View>

        {/* Application Status */}
        {application ? (
          <View className="bg-green-50 rounded-xl p-4 mb-4">
            <Text className="text-green-700 font-semibold">Application Status: {application.status}</Text>
          </View>
        ) : (
          <TouchableOpacity
            className="bg-primary rounded-xl p-4 items-center mb-4"
            onPress={handleApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Apply Now</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
