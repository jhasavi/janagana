import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, MapPin, Users } from 'lucide-react-native';

interface EventCardProps {
  event: any;
  compact?: boolean;
}

export function EventCard({ event, compact = false }: EventCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/events/${event.id}`);
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        className="bg-white rounded-xl shadow-sm overflow-hidden mr-3"
        style={{ width: 200 }}
      >
        {event.coverImageUrl && (
          <Image
            source={{ uri: event.coverImageUrl }}
            className="w-full h-24"
            resizeMode="cover"
          />
        )}
        <View className="p-3">
          <Text className="font-semibold text-gray-900 text-sm line-clamp-2" numberOfLines={2}>
            {event.title}
          </Text>
          <View className="flex items-center gap-1 mt-1">
            <Calendar size={12} color="#6b7280" />
            <Text className="text-xs text-gray-500">
              {new Date(event.startDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="bg-white rounded-xl shadow-sm overflow-hidden mb-3"
    >
      {event.coverImageUrl && (
        <Image
          source={{ uri: event.coverImageUrl }}
          className="w-full h-40"
          resizeMode="cover"
        />
      )}
      <View className="p-4">
        <Text className="font-bold text-gray-900 text-lg">{event.title}</Text>
        <Text className="text-gray-600 text-sm line-clamp-2 mb-3" numberOfLines={2}>
          {event.description}
        </Text>
        <View className="flex items-center gap-4 text-sm text-gray-500">
          <View className="flex items-center gap-1">
            <Calendar size={16} color="#6b7280" />
            <Text>{new Date(event.startDate).toLocaleDateString()}</Text>
          </View>
          <View className="flex items-center gap-1">
            <MapPin size={16} color="#6b7280" />
            <Text>{event.location || 'TBD'}</Text>
          </View>
          <View className="flex items-center gap-1">
            <Users size={16} color="#6b7280" />
            <Text>{event.registrationCount || 0} registered</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
