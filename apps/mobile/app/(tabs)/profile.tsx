import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useStore } from '../../lib/store';
import { auth } from '../../lib/auth';
import { useRouter } from 'expo-router';
import { Settings, Bell, Shield, Moon, LogOut, Camera, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';

export default function ProfileScreen() {
  const { member, organization, logout } = useStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(member?.firstName || '');
  const [lastName, setLastName] = useState(member?.lastName || '');
  const [email, setEmail] = useState(member?.email || '');

  const handleLogout = async () => {
    await auth.clear();
    logout();
    router.replace('/(auth)/login');
  };

  const handleSave = async () => {
    // Save profile changes
    setEditing(false);
  };

  const menuItems = [
    { icon: Bell, label: 'Notifications', onPress: () => {} },
    { icon: Shield, label: 'Privacy', onPress: () => {} },
    { icon: Moon, label: 'Dark Mode', onPress: () => {} },
    { icon: Settings, label: 'App Settings', onPress: () => {} },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Profile Header */}
        <View className="bg-white rounded-xl p-6 items-center mb-4">
          <TouchableOpacity className="relative">
            <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center">
              <Text className="text-primary font-bold text-3xl">
                {member?.firstName?.charAt(0) || 'U'}
              </Text>
            </View>
            <View className="absolute bottom-0 right-0 bg-primary rounded-full p-2">
              <Camera size={16} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 mt-4">
            {member?.firstName} {member?.lastName}
          </Text>
          <Text className="text-gray-500">{member?.email}</Text>
          <TouchableOpacity
            className="mt-3 bg-primary/10 px-4 py-2 rounded-lg"
            onPress={() => setEditing(!editing)}
          >
            <Text className="text-primary font-medium">{editing ? 'Cancel' : 'Edit Profile'}</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Form */}
        {editing && (
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="font-semibold text-gray-900 mb-3">Edit Profile</Text>
            <View className="space-y-3">
              <View>
                <Text className="text-sm text-gray-600 mb-1">First Name</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View>
                <Text className="text-sm text-gray-600 mb-1">Last Name</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
              <TouchableOpacity
                className="bg-primary rounded-lg py-3 items-center"
                onPress={handleSave}
              >
                <Text className="text-white font-semibold">Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Membership Info */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="font-semibold text-gray-900 mb-3">Membership</Text>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-600">Status</Text>
            <Text className="font-medium text-gray-900">{member?.status || 'Active'}</Text>
          </View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-600">Tier</Text>
            <Text className="font-medium text-gray-900">
              {member?.membershipTier?.name || 'Standard'}
            </Text>
          </View>
          {member?.membershipTier?.expiresAt && (
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">Expires</Text>
              <Text className="font-medium text-gray-900">
                {new Date(member.membershipTier.expiresAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Menu Items */}
        <View className="bg-white rounded-xl overflow-hidden mb-4">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className="flex-row items-center justify-between p-4 border-b border-gray-100 last:border-0"
              onPress={item.onPress}
            >
              <View className="flex-row items-center gap-3">
                <item.icon size={20} color="#6b7280" />
                <Text className="text-gray-900">{item.label}</Text>
              </View>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Organization */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="font-semibold text-gray-900 mb-2">Organization</Text>
          <Text className="text-gray-600">{organization?.name}</Text>
          <TouchableOpacity
            className="mt-2 text-primary"
            onPress={() => router.replace('/organization')}
          >
            <Text className="text-sm">Switch Organization</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="bg-white rounded-xl p-4 flex-row items-center justify-center gap-2"
          onPress={handleLogout}
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="text-red-500 font-semibold">Log Out</Text>
        </TouchableOpacity>

        <Text className="text-center text-gray-400 text-xs mt-4">
          OrgFlow Member Portal v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
