import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#6366f1' }}>
      <Tabs.Screen
        name="explore"
        options={{
          title: '탐색',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="my-decks"
        options={{
          title: '내 덱',
          tabBarIcon: ({ color, size }) => <Ionicons name="layers-outline" size={size} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="my-games"
        options={{
          title: '내 게임',
          tabBarIcon: ({ color, size }) => <Ionicons name="game-controller" color={color} size={size} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="battle"
        options={{
          title: '배틀',
          tabBarIcon: ({ color, size }) => <Ionicons name="flash" color={color} size={size} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
