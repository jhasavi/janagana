import { Tabs } from 'expo-router';
import { Home, Calendar, Users, User, LogOut } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { auth } from '../../lib/auth';
import { useStore } from '../../lib/store';
import { useRouter } from 'expo-router';

function TabBarIcon({ icon: Icon, color }: { icon: any; color: string }) {
  return <Icon size={24} color={color} />;
}

function LogoutButton() {
  const router = useRouter();
  const { logout } = useStore();

  const handleLogout = async () => {
    await auth.clear();
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <TouchableOpacity onPress={handleLogout} className="p-2">
      <LogOut size={24} color="#6b7280" />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon icon={Home} color={color} />,
          headerRight: () => <LogoutButton />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <TabBarIcon icon={Calendar} color={color} />,
        }}
      />
      <Tabs.Screen
        name="volunteer"
        options={{
          title: 'Volunteer',
          tabBarIcon: ({ color }) => <TabBarIcon icon={Users} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clubs"
        options={{
          title: 'Clubs',
          tabBarIcon: ({ color }) => <TabBarIcon icon={Users} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon icon={User} color={color} />,
        }}
      />
    </Tabs>
  );
}
