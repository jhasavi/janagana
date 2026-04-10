import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';

interface OpportunityCardProps {
  shift?: any;
  opportunity?: any;
}

export function OpportunityCard({ shift, opportunity }: OpportunityCardProps) {
  const item = shift || opportunity;
  const date = item?.shiftDate || item?.startDate;
  const startTime = item?.startTime;
  const endTime = item?.endTime;

  return (
    <View className="bg-white rounded-xl shadow-sm p-4 mb-3">
      <Text className="font-semibold text-gray-900">{item?.title || item?.opportunity?.title}</Text>
      <View className="flex items-center gap-4 mt-2 text-sm text-gray-500">
        <View className="flex items-center gap-1">
          <Calendar size={16} color="#6b7280" />
          <Text>{date ? new Date(date).toLocaleDateString() : 'TBD'}</Text>
        </View>
        <View className="flex items-center gap-1">
          <Clock size={16} color="#6b7280" />
          <Text>
            {startTime && endTime ? `${startTime} - ${endTime}` : 'TBD'}
          </Text>
        </View>
      </View>
      {item?.location && (
        <Text className="text-sm text-gray-600 mt-1">{item.location}</Text>
      )}
    </View>
  );
}
