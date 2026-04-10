import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Calendar, MapPin, Users, Clock, ArrowLeft } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      const [eventRes, regRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/events/${id}/registration`),
      ]);
      setEvent(eventRes.data);
      setRegistration(regRes.data);
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setIsRegistering(true);
      await api.post(`/events/${id}/register`);
      await loadEvent();
    } catch (error) {
      console.error('Failed to register:', error);
    } finally {
      setIsRegistering(false);
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
      {event?.coverImageUrl && (
        <Image
          source={{ uri: event.coverImageUrl }}
          className="w-full h-56"
          resizeMode="cover"
        />
      )}

      <View className="p-4">
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-gray-900 mb-2">{event.title}</Text>
        <Text className="text-gray-600 mb-4">{event.description}</Text>

        {/* Event Details */}
        <View className="bg-white rounded-xl p-4 mb-4 space-y-3">
          <View className="flex-row items-center gap-3">
            <Calendar size={20} color="#667eea" />
            <View>
              <Text className="font-medium text-gray-900">
                {new Date(event.startDate).toLocaleDateString()}
              </Text>
              <Text className="text-sm text-gray-500">
                {event.startTime} - {event.endTime}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <MapPin size={20} color="#667eea" />
            <Text className="text-gray-900">{event.location || 'TBD'}</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Users size={20} color="#667eea" />
            <Text className="text-gray-900">
              {event.registrationCount || 0} registered
            </Text>
          </View>
          {event.capacity && (
            <View className="flex-row items-center gap-3">
              <Clock size={20} color="#667eea" />
              <Text className="text-gray-900">
                {event.capacity - event.registrationCount} spots left
              </Text>
            </View>
          )}
        </View>

        {/* Registration Status */}
        {registration ? (
          <View className="bg-green-50 rounded-xl p-4 mb-4 items-center">
            <Text className="text-green-700 font-semibold mb-3">You're Registered!</Text>
            <View className="bg-white rounded-xl p-4">
              <QRCode
                value={`orgflow://event-registration/${registration.id}`}
                size={150}
                color="#667eea"
                backgroundColor="white"
              />
              <Text className="text-gray-600 text-xs text-center mt-2">
                Scan for check-in
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            className="bg-primary rounded-xl p-4 items-center mb-4"
            onPress={handleRegister}
            disabled={isRegistering}
          >
            {isRegistering ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Register Now</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
