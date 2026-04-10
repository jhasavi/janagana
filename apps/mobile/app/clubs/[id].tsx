import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ArrowLeft, Users, MessageSquare, Send } from 'lucide-react-native';
import { PostCard } from '../../components/PostCard';

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [club, setClub] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    loadClub();
  }, [id]);

  const loadClub = async () => {
    try {
      setIsLoading(true);
      const [clubRes, postsRes, memberRes] = await Promise.all([
        api.get(`/clubs/${id}`),
        api.get(`/clubs/${id}/posts`),
        api.get(`/clubs/${id}/membership`),
      ]);
      setClub(clubRes.data);
      setPosts(postsRes.data.data || []);
      setIsMember(memberRes.data.isMember || false);
    } catch (error) {
      console.error('Failed to load club:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      setIsJoining(true);
      await api.post(`/clubs/${id}/join`);
      await loadClub();
    } catch (error) {
      console.error('Failed to join club:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    try {
      await api.post(`/clubs/${id}/posts`, { content: newPost });
      setNewPost('');
      await loadClub();
    } catch (error) {
      console.error('Failed to create post:', error);
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

        {/* Club Info */}
        <View className="bg-white rounded-xl p-4 mb-4 items-center">
          <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-3">
            <Text className="text-primary font-bold text-3xl">{club?.name.charAt(0)}</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900">{club?.name}</Text>
          <Text className="text-gray-600 text-center mb-3">{club?.description}</Text>
          <View className="flex-row items-center gap-2">
            <Users size={16} color="#6b7280" />
            <Text className="text-gray-500">{club?.memberCount || 0} members</Text>
          </View>
        </View>

        {/* Join Button */}
        {!isMember && (
          <TouchableOpacity
            className="bg-primary rounded-xl p-4 items-center mb-4"
            onPress={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Join Club</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Create Post */}
        {isMember && (
          <View className="bg-white rounded-xl p-4 mb-4">
            <TextInput
              className="bg-gray-100 rounded-lg px-4 py-3 mb-3"
              placeholder="Write a post..."
              value={newPost}
              onChangeText={setNewPost}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              className="bg-primary rounded-lg py-2 flex-row items-center justify-center gap-2"
              onPress={handlePost}
            >
              <Send size={16} color="white" />
              <Text className="text-white font-semibold">Post</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Posts */}
        <View>
          <View className="flex-row items-center gap-2 mb-3">
            <MessageSquare size={20} color="#374151" />
            <Text className="font-semibold text-gray-900">Posts</Text>
          </View>
          {posts.length === 0 ? (
            <Text className="text-gray-500 text-center py-8">No posts yet</Text>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </View>
      </View>
    </ScrollView>
  );
}
