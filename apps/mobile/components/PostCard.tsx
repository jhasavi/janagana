import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare, Heart } from 'lucide-react-native';

interface PostCardProps {
  post: any;
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/clubs/${post.clubId}`);
  };

  return (
    <TouchableOpacity onPress={handlePress} className="bg-white rounded-xl shadow-sm p-4 mb-3">
      <View className="flex-row items-center gap-3 mb-2">
        <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
          <Text className="text-primary font-bold">{post.author?.name?.charAt(0) || 'A'}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">{post.author?.name || 'Unknown'}</Text>
          <Text className="text-xs text-gray-500">{post.club?.name}</Text>
        </View>
      </View>
      <Text className="text-gray-700 mb-3">{post.content}</Text>
      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          className="w-full h-40 rounded-lg mb-3"
          resizeMode="cover"
        />
      )}
      <View className="flex items-center gap-4 text-gray-500">
        <View className="flex items-center gap-1">
          <Heart size={16} color="#6b7280" />
          <Text className="text-sm">{post.likeCount || 0}</Text>
        </View>
        <View className="flex items-center gap-1">
          <MessageSquare size={16} color="#6b7280" />
          <Text className="text-sm">{post.commentCount || 0}</Text>
        </View>
        <Text className="text-sm ml-auto">
          {new Date(post.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
