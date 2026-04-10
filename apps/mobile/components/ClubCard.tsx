import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';

interface ClubCardProps {
  club: any;
  compact?: boolean;
}

export function ClubCard({ club, compact = false }: ClubCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/clubs/${club.id}`);
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        className="bg-white rounded-xl shadow-sm overflow-hidden mr-3 items-center"
        style={{ width: 120 }}
      >
        <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mt-3">
          <Text className="text-primary font-bold text-2xl">{club.name.charAt(0)}</Text>
        </View>
        <Text className="font-medium text-gray-900 text-sm mt-2 px-2 text-center" numberOfLines={1}>
          {club.name}
        </Text>
        <View className="flex items-center gap-1 mb-3">
          <Users size={12} color="#6b7280" />
          <Text className="text-xs text-gray-500">{club.memberCount || 0}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="bg-white rounded-xl shadow-sm overflow-hidden mb-3"
    >
      <View className="p-4 flex-row items-center gap-4">
        <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center">
          <Text className="text-primary font-bold text-2xl">{club.name.charAt(0)}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 text-lg">{club.name}</Text>
          <Text className="text-gray-600 text-sm line-clamp-2" numberOfLines={2}>
            {club.description}
          </Text>
          <View className="flex items-center gap-1 mt-2">
            <Users size={14} color="#6b7280" />
            <Text className="text-sm text-gray-500">{club.memberCount || 0} members</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
