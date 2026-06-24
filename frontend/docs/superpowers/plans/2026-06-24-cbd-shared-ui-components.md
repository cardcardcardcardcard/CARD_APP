# CBD Shared UI Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract 3 repeated UI patterns (SafeAreaView wrapper, full-screen loading spinner, empty list state) into shared components, and replace all 14 screen files' inline usages with those components.

**Architecture:** Three new files under `components/ui/` — `ScreenContainer`, `LoadingView`, `EmptyState` — each with a single responsibility. Screen files import from those components, removing inline style duplicates. No logic changes, purely structural.

**Tech Stack:** React Native, TypeScript, expo-router, react-native-safe-area-context

## Global Constraints

- All new files live under `frontend/components/ui/`
- No business logic changes — only structural/import replacement
- `ScreenContainer` default: `flex:1, backgroundColor:'#fff'`; `battle/[battleId].tsx` overrides with `backgroundColor:'#0f172a'`
- `LoadingView`: always full-screen (`flex:1, justifyContent:'center', alignItems:'center'`)
- `EmptyState`: only for `ListEmptyComponent` pattern; form screens (create/edit) do not get `EmptyState`
- Commit once at the end, covering all files together

---

### Task 1: Create shared UI components

**Files:**
- Create: `frontend/components/ui/ScreenContainer.tsx`
- Create: `frontend/components/ui/LoadingView.tsx`
- Create: `frontend/components/ui/EmptyState.tsx`

**Interfaces:**
- Produces:
  - `ScreenContainer({ children: React.ReactNode, style?: ViewStyle }): JSX.Element`
  - `LoadingView(): JSX.Element`
  - `EmptyState({ message: string }): JSX.Element`

- [ ] **Step 1: Create ScreenContainer.tsx**

```tsx
// frontend/components/ui/ScreenContainer.tsx
import { ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenContainer({ children, style }: Props) {
  return (
    <SafeAreaView style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
```

- [ ] **Step 2: Create LoadingView.tsx**

```tsx
// frontend/components/ui/LoadingView.tsx
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export function LoadingView() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});
```

- [ ] **Step 3: Create EmptyState.tsx**

```tsx
// frontend/components/ui/EmptyState.tsx
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  message: string;
}

export function EmptyState({ message }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  text: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
```

---

### Task 2: Refactor `explore/index.tsx`

**Files:**
- Modify: `frontend/app/(tabs)/explore/index.tsx`

**Interfaces:**
- Consumes: `ScreenContainer`, `LoadingView`, `EmptyState` from Task 1

- [ ] **Step 1: Apply replacements**

Replace SafeAreaView import → ScreenContainer, ActivityIndicator (conditional) → LoadingView, ListEmptyComponent Text → EmptyState.

Final file:

```tsx
import { useEffect, useState } from 'react';
import { Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { listPublicGames } from '../../../lib/api';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { GameOut } from '../../../types/api';

export default function Explore() {
  const [games, setGames] = useState<GameOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setGames(await listPublicGames()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <ScreenContainer>
      <Text style={styles.heading}>게임 탐색</Text>
      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={games}
          keyExtractor={g => g.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/explore/${item.id}`)}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.ruleset.swap_interval}턴마다 스왑 · 덱 {item.ruleset.deck_size}장</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<EmptyState message="공개 게임이 없습니다." />}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', padding: 20, paddingBottom: 12 },
  card: { marginHorizontal: 16, marginBottom: 10, padding: 16, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
```

---

### Task 3: Refactor `explore/[gameId].tsx`

**Files:**
- Modify: `frontend/app/(tabs)/explore/[gameId].tsx`

**Interfaces:**
- Consumes: `ScreenContainer`, `LoadingView` from Task 1

- [ ] **Step 1: Apply replacements**

`if (loading) return <ActivityIndicator ...>` → `if (loading) return <LoadingView />;`
SafeAreaView → ScreenContainer. No EmptyState needed (no list).

Final file:

```tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { getGame } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import type { GameOut } from '../../../types/api';

export default function GameDetail() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [game, setGame] = useState<GameOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGame(gameId).then(setGame).catch(() => Alert.alert('오류', '게임을 찾을 수 없습니다')).finally(() => setLoading(false));
  }, [gameId]);

  if (loading) return <LoadingView />;
  if (!game) return null;

  const rs = game.ruleset;

  return (
    <>
      <Stack.Screen options={{ title: game.title }} />
      <ScreenContainer>
        <ScrollView>
          <Text style={styles.title}>{game.title}</Text>
          {game.description ? <Text style={styles.desc}>{game.description}</Text> : null}

          <Text style={styles.sectionTitle}>룰셋</Text>
          <View style={styles.ruleGrid}>
            {([
              ['덱 크기', rs.deck_size],
              ['손패 제한', rs.hand_limit],
              ['스왑 주기', `${rs.swap_interval} 턴`],
              ['승리 조건', rs.win_condition],
              ['자원', rs.resource_system],
              ['초기 자원', rs.initial_resource],
            ] as [string, string | number][]).map(([k, v]) => (
              <View key={k} style={styles.ruleRow}>
                <Text style={styles.ruleKey}>{k}</Text>
                <Text style={styles.ruleVal}>{String(v)}</Text>
              </View>
            ))}
          </View>

          <Button
            title="덱 만들고 배틀하기"
            onPress={() => router.push(`/(tabs)/battle?game_id=${game.id}`)}
            style={{ margin: 16 }}
          />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 20, paddingBottom: 4 },
  desc: { fontSize: 14, color: '#6b7280', paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  ruleGrid: { paddingHorizontal: 20 },
  ruleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  ruleKey: { fontSize: 13, color: '#6b7280' },
  ruleVal: { fontSize: 13, fontWeight: '500', color: '#111827' },
});
```

---

### Task 4: Refactor `my-games/index.tsx`

**Files:**
- Modify: `frontend/app/(tabs)/my-games/index.tsx`

**Interfaces:**
- Consumes: `ScreenContainer`, `LoadingView` from Task 1
- Note: `ListEmptyComponent` here has a custom View with a link button, NOT a plain text — do not replace with EmptyState

- [ ] **Step 1: Apply replacements**

SafeAreaView → ScreenContainer, conditional ActivityIndicator → LoadingView. Keep the custom `emptyBox` (it has a link), remove `styles.container`.

Final file:

```tsx
// frontend/app/(tabs)/my-games/index.tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listMyGames } from '../../../lib/api';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import type { GameOut } from '../../../types/api';

export default function MyGames() {
  const [games, setGames] = useState<GameOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setGames(await listMyGames()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.heading}>내 게임</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/my-games/create')}>
          <Ionicons name="add-circle" size={28} color="#6366f1" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={games}
          keyExtractor={g => g.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/my-games/${item.id}`)}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.is_public ? '공개' : '비공개'} · Swap/{item.ruleset.swap_interval}t</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.empty}>게임이 없습니다.</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/my-games/create')}>
                <Text style={styles.createLink}>첫 게임 만들기 →</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827' },
  card: { marginHorizontal: 16, marginBottom: 10, padding: 16, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  empty: { color: '#9ca3af', fontSize: 14 },
  createLink: { color: '#6366f1', marginTop: 8, fontSize: 14 },
});
```

---

### Task 5: Refactor `my-games/create.tsx`

**Files:**
- Modify: `frontend/app/(tabs)/my-games/create.tsx`

**Interfaces:**
- Consumes: `ScreenContainer` from Task 1
- Note: form screen — no LoadingView, no EmptyState

- [ ] **Step 1: Apply replacements**

SafeAreaView → ScreenContainer, remove SafeAreaView import, remove `styles.container`.

Final file:

```tsx
// frontend/app/(tabs)/my-games/create.tsx
import { useState } from 'react';
import { ScrollView, Text, StyleSheet, Alert, Switch, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { createGame } from '../../../lib/api';
import type { Ruleset } from '../../../types/api';

const DEFAULT_RULESET: Ruleset = {
  deck_size: 20,
  hand_limit: 5,
  swap_interval: 3,
  win_condition: 'hp_zero',
  turn_phases: ['draw', 'main', 'battle', 'end'],
  resource_system: 'mana',
  initial_resource: 1,
  resource_per_turn: 1,
};

export default function CreateGame() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [ruleset, setRuleset] = useState<Ruleset>(DEFAULT_RULESET);
  const [loading, setLoading] = useState(false);

  const setR = <K extends keyof Ruleset>(key: K, val: Ruleset[K]) =>
    setRuleset(r => ({ ...r, [key]: val }));

  const submit = async () => {
    if (!title.trim()) { Alert.alert('오류', '제목을 입력해주세요'); return; }
    setLoading(true);
    try {
      const game = await createGame({ title: title.trim(), description: description.trim() || undefined, is_public: isPublic, ruleset });
      router.replace(`/(tabs)/my-games/${game.id}`);
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '게임 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '새 게임' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="제목" value={title} onChangeText={setTitle} placeholder="나만의 카드 게임" />
          <Input label="설명 (선택)" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>공개</Text>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: '#6366f1' }} />
          </View>

          <Text style={styles.section}>룰셋</Text>
          <Input label="덱 크기" value={String(ruleset.deck_size)} onChangeText={v => setR('deck_size', Number(v) || 20)} keyboardType="numeric" />
          <Input label="손패 제한" value={String(ruleset.hand_limit)} onChangeText={v => setR('hand_limit', Number(v) || 5)} keyboardType="numeric" />
          <Input label="스왑 주기 (턴)" value={String(ruleset.swap_interval)} onChangeText={v => setR('swap_interval', Number(v) || 3)} keyboardType="numeric" />
          <Input label="초기 자원" value={String(ruleset.initial_resource)} onChangeText={v => setR('initial_resource', Number(v) || 1)} keyboardType="numeric" />
          <Input label="턴당 자원" value={String(ruleset.resource_per_turn)} onChangeText={v => setR('resource_per_turn', Number(v) || 1)} keyboardType="numeric" />

          <Button title="게임 생성" onPress={submit} loading={loading} style={{ marginTop: 16 }} />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
  section: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12, marginTop: 8 },
});
```

---

### Task 6: Refactor `my-games/[gameId]/index.tsx`

**Files:**
- Modify: `frontend/app/(tabs)/my-games/[gameId]/index.tsx`

**Interfaces:**
- Consumes: `ScreenContainer`, `LoadingView` from Task 1

- [ ] **Step 1: Apply replacements**

`if (loading) return <ActivityIndicator ...>` → `if (loading) return <LoadingView />;`
SafeAreaView → ScreenContainer. Remove unused imports.

Final file:

```tsx
// frontend/app/(tabs)/my-games/[gameId]/index.tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGame } from '../../../../lib/api';
import { ScreenContainer } from '../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../components/ui/LoadingView';
import type { GameOut } from '../../../../types/api';

export default function GameOverview() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [game, setGame] = useState<GameOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGame(gameId).then(setGame).finally(() => setLoading(false));
  }, [gameId]);

  if (loading) return <LoadingView />;
  if (!game) return null;

  return (
    <>
      <Stack.Screen options={{ title: game.title }} />
      <ScreenContainer>
        <ScrollView>
          <Text style={styles.title}>{game.title}</Text>
          {game.description ? <Text style={styles.desc}>{game.description}</Text> : null}

          <View style={styles.actions}>
            <ActionRow
              icon="create-outline"
              label="룰셋 수정"
              onPress={() => router.push(`/(tabs)/my-games/${gameId}/edit`)}
            />
            <ActionRow
              icon="albums-outline"
              label="카드 관리"
              onPress={() => router.push(`/(tabs)/my-games/${gameId}/cards`)}
            />
            <ActionRow
              icon="layers-outline"
              label="내 덱"
              onPress={() => router.push(`/(tabs)/my-games/${gameId}/decks`)}
            />
          </View>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

function ActionRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons name={icon as any} size={22} color="#6366f1" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 20, paddingBottom: 4 },
  desc: { fontSize: 14, color: '#6b7280', paddingHorizontal: 20, marginBottom: 8 },
  actions: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  rowLabel: { flex: 1, fontSize: 15, color: '#111827' },
});
```

---

### Task 7: Refactor `my-games/[gameId]/edit.tsx`

**Files:**
- Modify: `frontend/app/(tabs)/my-games/[gameId]/edit.tsx`

**Interfaces:**
- Consumes: `ScreenContainer`, `LoadingView` from Task 1

- [ ] **Step 1: Apply replacements**

`if (loading || !ruleset) return <ActivityIndicator ...>` → `if (loading || !ruleset) return <LoadingView />;`
SafeAreaView → ScreenContainer.

Final file:

```tsx
// frontend/app/(tabs)/my-games/[gameId]/edit.tsx
import { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, Alert, Switch, View } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { ScreenContainer } from '../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../components/ui/LoadingView';
import { getGame, updateGame } from '../../../../lib/api';
import type { GameOut, Ruleset } from '../../../../types/api';

export default function EditGame() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [game, setGame] = useState<GameOut | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGame(gameId).then(g => {
      setGame(g);
      setTitle(g.title);
      setDescription(g.description ?? '');
      setIsPublic(g.is_public);
      setRuleset(g.ruleset);
    }).finally(() => setLoading(false));
  }, [gameId]);

  const setR = <K extends keyof Ruleset>(key: K, val: Ruleset[K]) =>
    setRuleset(r => r ? { ...r, [key]: val } : r);

  const save = async () => {
    if (!ruleset) return;
    setSaving(true);
    try {
      await updateGame(gameId, { title: title.trim(), description: description.trim() || undefined, is_public: isPublic, ruleset });
      router.back();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !ruleset) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ title: '게임 수정' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="제목" value={title} onChangeText={setTitle} />
          <Input label="설명" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>공개</Text>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: '#6366f1' }} />
          </View>

          <Text style={styles.section}>룰셋</Text>
          <Input label="덱 크기" value={String(ruleset.deck_size)} onChangeText={v => setR('deck_size', Number(v) || 20)} keyboardType="numeric" />
          <Input label="손패 제한" value={String(ruleset.hand_limit)} onChangeText={v => setR('hand_limit', Number(v) || 5)} keyboardType="numeric" />
          <Input label="스왑 주기 (턴)" value={String(ruleset.swap_interval)} onChangeText={v => setR('swap_interval', Number(v) || 3)} keyboardType="numeric" />
          <Input label="초기 자원" value={String(ruleset.initial_resource)} onChangeText={v => setR('initial_resource', Number(v) || 1)} keyboardType="numeric" />
          <Input label="턴당 자원" value={String(ruleset.resource_per_turn)} onChangeText={v => setR('resource_per_turn', Number(v) || 1)} keyboardType="numeric" />

          <Button title="변경 저장" onPress={save} loading={saving} style={{ marginTop: 16 }} />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
  section: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12, marginTop: 8 },
});
```

---

### Task 8: Refactor `my-games/[gameId]/cards/index.tsx`

**Files:**
- Modify: `frontend/app/(tabs)/my-games/[gameId]/cards/index.tsx`

**Interfaces:**
- Consumes: `ScreenContainer`, `LoadingView`, `EmptyState` from Task 1

- [ ] **Step 1: Apply replacements**

Conditional `{loading ? <ActivityIndicator ...> : <FlatList>}` → `{loading ? <LoadingView /> : <FlatList>}`
SafeAreaView → ScreenContainer, ListEmptyComponent Text → `<EmptyState message="카드가 없습니다. +를 눌러 추가하세요." />`

Final file:

```tsx
// frontend/app/(tabs)/my-games/[gameId]/cards/index.tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listCards, deleteCard } from '../../../../../lib/api';
import { ScreenContainer } from '../../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../../components/ui/LoadingView';
import { EmptyState } from '../../../../../components/ui/EmptyState';
import type { CardOut } from '../../../../../types/api';

export default function CardList() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [cards, setCards] = useState<CardOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listCards(gameId).then(setCards).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [gameId]);

  const remove = (card: CardOut) =>
    Alert.alert('카드 삭제', `"${card.name}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteCard(gameId, card.id);
        load();
      }},
    ]);

  return (
    <>
      <Stack.Screen options={{
        title: '카드',
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push(`/(tabs)/my-games/${gameId}/cards/create`)}>
            <Ionicons name="add" size={24} color="#6366f1" />
          </TouchableOpacity>
        ),
      }} />
      <ScreenContainer>
        {loading ? <LoadingView /> : (
          <FlatList
            data={cards}
            keyExtractor={c => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/my-games/${gameId}/cards/${item.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{item.effects.length} 효과</Text>
                </View>
                <TouchableOpacity onPress={() => remove(item)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<EmptyState message="카드가 없습니다. +를 눌러 추가하세요." />}
          />
        )}
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  name: { fontSize: 15, fontWeight: '500', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
```

---

### Task 9: Refactor `my-games/[gameId]/cards/create.tsx`

**Files:**
- Modify: `frontend/app/(tabs)/my-games/[gameId]/cards/create.tsx`

**Interfaces:**
- Consumes: `ScreenContainer` from Task 1
- Note: form screen — no LoadingView, no EmptyState

- [ ] **Step 1: Apply replacements**

SafeAreaView → ScreenContainer, remove SafeAreaView import, remove `styles.container`.

Final file:

```tsx
// frontend/app/(tabs)/my-games/[gameId]/cards/create.tsx
import { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { BlockBuilder } from '../../../../../components/BlockBuilder';
import { ScreenContainer } from '../../../../../components/ui/ScreenContainer';
import { createCard } from '../../../../../lib/api';
import type { CardEffect } from '../../../../../types/api';

export default function CreateCard() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [name, setName] = useState('');
  const [effects, setEffects] = useState<CardEffect[]>([]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) { Alert.alert('오류', '카드 이름을 입력해주세요'); return; }
    setLoading(true);
    try {
      await createCard(gameId, { name: name.trim(), attributes: {}, effects });
      router.back();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '카드 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '새 카드' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="카드 이름" value={name} onChangeText={setName} placeholder="번개 화살" />
          <BlockBuilder effects={effects} onChange={setEffects} />
          <Button title="카드 생성" onPress={submit} loading={loading} style={{ marginTop: 16 }} />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20 },
});
```

---

### Task 10: Refactor `my-games/[gameId]/cards/[cardId].tsx`

**Files:**
- Modify: `frontend/app/(tabs)/my-games/[gameId]/cards/[cardId].tsx`

**Interfaces:**
- Consumes: `ScreenContainer`, `LoadingView` from Task 1

- [ ] **Step 1: Apply replacements**

`if (loading) return <ActivityIndicator ...>` → `if (loading) return <LoadingView />;`
SafeAreaView → ScreenContainer.

Final file:

```tsx
// frontend/app/(tabs)/my-games/[gameId]/cards/[cardId].tsx
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { BlockBuilder } from '../../../../../components/BlockBuilder';
import { ScreenContainer } from '../../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../../components/ui/LoadingView';
import { listCards, updateCard } from '../../../../../lib/api';
import type { CardOut, CardEffect } from '../../../../../types/api';

export default function EditCard() {
  const { gameId, cardId } = useLocalSearchParams<{ gameId: string; cardId: string }>();
  const [name, setName] = useState('');
  const [effects, setEffects] = useState<CardEffect[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCards(gameId).then(cards => {
      const card = cards.find(c => c.id === cardId);
      if (card) { setName(card.name); setEffects(card.effects); }
    }).finally(() => setLoading(false));
  }, [gameId, cardId]);

  const save = async () => {
    if (!name.trim()) { Alert.alert('오류', '이름을 입력해주세요'); return; }
    setSaving(true);
    try {
      await updateCard(gameId, cardId, { name: name.trim(), effects });
      router.back();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ title: '카드 수정' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="카드 이름" value={name} onChangeText={setName} />
          <BlockBuilder effects={effects} onChange={setEffects} />
          <Button title="카드 저장" onPress={save} loading={saving} style={{ marginTop: 16 }} />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20 },
});
```

---

### Task 11: Refactor `my-games/[gameId]/decks/index.tsx`

**Files:**
- Modify: `frontend/app/(tabs)/my-games/[gameId]/decks/index.tsx`

**Interfaces:**
- Consumes: `ScreenContainer`, `LoadingView`, `EmptyState` from Task 1

- [ ] **Step 1: Apply replacements**

Conditional `{loading ? <ActivityIndicator ...> : <FlatList>}` → `{loading ? <LoadingView /> : <FlatList>}`
SafeAreaView → ScreenContainer, ListEmptyComponent Text → `<EmptyState message="덱이 없습니다. +를 눌러 만드세요." />`

Final file:

```tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listMyDecks, getGame } from '../../../../../lib/api';
import { ScreenContainer } from '../../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../../components/ui/LoadingView';
import { EmptyState } from '../../../../../components/ui/EmptyState';
import type { DeckOut, GameOut } from '../../../../../types/api';

export default function MyDecks() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [decks, setDecks] = useState<DeckOut[]>([]);
  const [game, setGame] = useState<GameOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listMyDecks(gameId), getGame(gameId)])
      .then(([d, g]) => { setDecks(d); setGame(g); })
      .finally(() => setLoading(false));
  }, [gameId]);

  return (
    <>
      <Stack.Screen options={{
        title: '내 덱',
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push(`/(tabs)/my-games/${gameId}/decks/create`)}>
            <Ionicons name="add" size={24} color="#6366f1" />
          </TouchableOpacity>
        ),
      }} />
      <ScreenContainer>
        {loading ? <LoadingView /> : (
          <FlatList
            data={decks}
            keyExtractor={d => d.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.card_ids.length}/{game?.ruleset.deck_size ?? '?'} 장</Text>
              </View>
            )}
            ListEmptyComponent={<EmptyState message="덱이 없습니다. +를 눌러 만드세요." />}
          />
        )}
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  name: { fontSize: 15, fontWeight: '500', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
```

---

### Task 12: Refactor `my-games/[gameId]/decks/create.tsx`

**Files:**
- Modify: `frontend/app/(tabs)/my-games/[gameId]/decks/create.tsx`

**Interfaces:**
- Consumes: `ScreenContainer`, `LoadingView`, `EmptyState` from Task 1

- [ ] **Step 1: Apply replacements**

`if (loading) return <ActivityIndicator ...>` → `if (loading) return <LoadingView />;`
SafeAreaView → ScreenContainer, ListEmptyComponent Text → `<EmptyState message="이 게임에 카드가 없습니다." />`

Final file:

```tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listCards, getGame, createDeck } from '../../../../../lib/api';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { ScreenContainer } from '../../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../../components/ui/LoadingView';
import { EmptyState } from '../../../../../components/ui/EmptyState';
import type { CardOut, GameOut } from '../../../../../types/api';

export default function CreateDeck() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [cards, setCards] = useState<CardOut[]>([]);
  const [game, setGame] = useState<GameOut | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listCards(gameId), getGame(gameId)])
      .then(([c, g]) => { setCards(c); setGame(g); })
      .finally(() => setLoading(false));
  }, [gameId]);

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const save = async () => {
    const deckSize = game?.ruleset.deck_size ?? 20;
    if (!name.trim()) { Alert.alert('오류', '덱 이름을 입력해주세요'); return; }
    if (selected.length !== deckSize) {
      Alert.alert('오류', `정확히 ${deckSize}장을 선택해주세요 (현재 ${selected.length}장)`);
      return;
    }
    setSaving(true);
    try {
      await createDeck(gameId, { name: name.trim(), card_ids: selected });
      router.back();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '덱 생성 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView />;
  const deckSize = game?.ruleset.deck_size ?? 20;

  return (
    <>
      <Stack.Screen options={{ title: '덱 빌드' }} />
      <ScreenContainer>
        <View style={styles.header}>
          <Input label="덱 이름" value={name} onChangeText={setName} style={{ flex: 1, marginBottom: 0 }} />
          <Text style={styles.count}>{selected.length}/{deckSize}</Text>
        </View>
        <FlatList
          data={cards}
          keyExtractor={c => c.id}
          renderItem={({ item }) => {
            const active = selected.includes(item.id);
            return (
              <TouchableOpacity style={[styles.card, active && styles.cardActive]} onPress={() => toggle(item.id)}>
                <Text style={[styles.name, active && styles.nameActive]}>{item.name}</Text>
                <Text style={styles.meta}>{item.effects.length} 효과</Text>
                {active && <Ionicons name="checkmark-circle" size={20} color="#6366f1" style={styles.check} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<EmptyState message="이 게임에 카드가 없습니다." />}
        />
        <View style={styles.footer}>
          <Button title={`덱 저장 (${selected.length}/${deckSize})`} onPress={save} loading={saving} />
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  count: { fontSize: 16, fontWeight: '700', color: '#6366f1', paddingBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cardActive: { backgroundColor: '#eef2ff' },
  name: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  nameActive: { color: '#6366f1' },
  meta: { fontSize: 12, color: '#9ca3af', marginRight: 8 },
  check: {},
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
});
```

---

### Task 13: Refactor `battle/index.tsx`

**Files:**
- Modify: `frontend/app/(tabs)/battle/index.tsx`

**Interfaces:**
- Consumes: `ScreenContainer`, `LoadingView` from Task 1
- Note: `empty` Text elements here are inline within `step` blocks, not ListEmptyComponent — keep them as-is (they have contextual messages tied to step flow). Only replace the top-level `pageLoading` guard and SafeAreaView.

- [ ] **Step 1: Apply replacements**

`if (pageLoading) return <ActivityIndicator ...>` → `if (pageLoading) return <LoadingView />;`
SafeAreaView → ScreenContainer.

Final file:

```tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import { listPublicGames, listMyDecks, createBattle, getBattle, joinBattle } from '../../../lib/api';
import type { GameOut, DeckOut } from '../../../types/api';

type Step = 'pick_game' | 'pick_deck' | 'lobby' | 'join';

export default function BattleLobby() {
  const [step, setStep] = useState<Step>('pick_game');
  const [games, setGames] = useState<GameOut[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameOut | null>(null);
  const [decks, setDecks] = useState<DeckOut[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<DeckOut | null>(null);
  const [battleId, setBattleId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    listPublicGames().then(setGames).finally(() => setPageLoading(false));
  }, []);

  const pickGame = async (game: GameOut) => {
    setSelectedGame(game);
    setLoading(true);
    try {
      setDecks(await listMyDecks(game.id));
      setStep('pick_deck');
    } catch { Alert.alert('오류', '덱 로드 실패'); }
    setLoading(false);
  };

  const createLobby = async () => {
    if (!selectedGame || !selectedDeck) return;
    setLoading(true);
    try {
      const battle = await createBattle({ game_id: selectedGame.id, deck_id: selectedDeck.id });
      setBattleId(battle.id);
      setStep('lobby');
    } catch (e: any) { Alert.alert('오류', e?.response?.data?.detail ?? '실패'); }
    setLoading(false);
  };

  const joinLobby = async () => {
    if (!selectedDeck || !joinCode.trim()) return;
    setLoading(true);
    try {
      const battle = await getBattle(joinCode.trim());
      await joinBattle(battle.id, { deck_id: selectedDeck.id });
      router.push(`/(tabs)/battle/${battle.id}`);
    } catch (e: any) { Alert.alert('오류', e?.response?.data?.detail ?? '배틀을 찾을 수 없습니다'); }
    setLoading(false);
  };

  if (pageLoading) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ title: '배틀' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content}>
          {step === 'pick_game' && (
            <>
              <Text style={styles.heading}>게임 선택</Text>
              {games.map(g => (
                <Button key={g.id} title={g.title} onPress={() => pickGame(g)} variant="secondary" style={styles.item} />
              ))}
              {games.length === 0 && <Text style={styles.empty}>공개 게임이 없습니다. 먼저 게임을 만드세요.</Text>}
            </>
          )}

          {step === 'pick_deck' && (
            <>
              <Text style={styles.heading}>덱 선택</Text>
              <Text style={styles.sub}>게임: {selectedGame?.title}</Text>
              {decks.map(d => (
                <Button
                  key={d.id}
                  title={d.name}
                  onPress={() => { setSelectedDeck(d); }}
                  variant={selectedDeck?.id === d.id ? 'primary' : 'secondary'}
                  style={styles.item}
                />
              ))}
              {decks.length === 0 && <Text style={styles.empty}>이 게임에 덱이 없습니다. 먼저 덱을 만드세요.</Text>}
              {selectedDeck && (
                <>
                  <Button title="배틀 방 만들기" onPress={createLobby} loading={loading} style={{ marginTop: 16 }} />
                  <Text style={styles.orText}>— 또는 기존 방 참가 —</Text>
                  <Input label="참가할 배틀 ID" value={joinCode} onChangeText={setJoinCode} autoCapitalize="none" />
                  <Button title="배틀 참가" onPress={joinLobby} loading={loading} variant="secondary" />
                </>
              )}
              <Button title="← 뒤로" onPress={() => setStep('pick_game')} variant="secondary" style={{ marginTop: 12 }} />
            </>
          )}

          {step === 'lobby' && (
            <>
              <Text style={styles.heading}>상대방 대기 중</Text>
              <Text style={styles.sub}>이 배틀 ID를 공유하세요:</Text>
              <Text style={styles.battleId}>{battleId}</Text>
              <Button title="배틀 입장" onPress={() => router.push(`/(tabs)/battle/${battleId}`)} style={{ marginTop: 24 }} />
              <Button title="← 뒤로" onPress={() => setStep('pick_game')} variant="secondary" style={{ marginTop: 8 }} />
            </>
          )}
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  sub: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  item: { marginBottom: 8 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
  orText: { textAlign: 'center', color: '#9ca3af', marginVertical: 12 },
  battleId: { fontSize: 18, fontWeight: '700', color: '#6366f1', textAlign: 'center', padding: 16, backgroundColor: '#eef2ff', borderRadius: 8, marginTop: 8 },
});
```

---

### Task 14: Refactor `battle/[battleId].tsx`

**Files:**
- Modify: `frontend/app/(tabs)/battle/[battleId].tsx`

**Interfaces:**
- Consumes: `ScreenContainer` from Task 1
- Note: background color is `#0f172a`, use `style` prop override. The "connecting" guard has a custom layout with both ActivityIndicator AND a Text beneath — keep ActivityIndicator there inline with `style={{ flex: 1 }}` since it's a compound layout, not a simple full-screen loader.

- [ ] **Step 1: Apply replacements**

Replace all three `<SafeAreaView style={styles.container}>` → `<ScreenContainer style={{ backgroundColor: '#0f172a' }}>`. Remove SafeAreaView import.

Final file:

```tsx
// frontend/app/(tabs)/battle/[battleId].tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAuthStore } from '../../../store/auth';
import { useBattle } from '../../../hooks/useBattle';
import { getBattle } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import type { BattleOut } from '../../../types/api';

export default function BattleScreen() {
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  const { token, user } = useAuthStore();
  const { state, swapped, winner, error, connected, sendAttack, sendEndTurn } = useBattle(battleId, token ?? '');

  const [actor, setActor] = useState<'a' | 'b' | null>(null);

  useEffect(() => {
    getBattle(battleId).then((b: BattleOut) => {
      setActor(b.player_a_id === user?.id ? 'a' : 'b');
    });
  }, [battleId, user]);

  if (!connected && !state) {
    return (
      <ScreenContainer style={{ backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#6366f1" style={{ flex: 1 }} />
        <Text style={styles.connectingText}>연결 중…</Text>
      </ScreenContainer>
    );
  }

  if (winner) {
    return (
      <ScreenContainer style={{ backgroundColor: '#0f172a' }}>
        <Text style={styles.winnerText}>{winner === 'a' ? '플레이어 A 승리!' : '플레이어 B 승리!'}</Text>
        <Button title="로비로 돌아가기" onPress={() => router.replace('/(tabs)/battle')} style={{ margin: 24 }} />
      </ScreenContainer>
    );
  }

  if (!state) return null;

  const myHp = actor === 'a' ? state.hp_a : state.hp_b;
  const opHp = actor === 'a' ? state.hp_b : state.hp_a;
  const myHand = actor === 'a' ? state.hand_a : state.hand_b;
  const opHand = actor === 'a' ? state.hand_b : state.hand_a;
  const myDeckLabel = actor === 'a' ? state.deck_for_a : state.deck_for_b;
  const opDeckLabel = actor === 'a' ? state.deck_for_b : state.deck_for_a;
  const myResources = actor === 'a' ? state.resources_a : state.resources_b;
  const myDeckRemaining = actor === 'a' ? state.deck_remaining_a : state.deck_remaining_b;
  const opDeckRemaining = actor === 'a' ? state.deck_remaining_b : state.deck_remaining_a;

  const isMyTurn = state.active_player === actor;

  return (
    <>
      <Stack.Screen options={{ title: '배틀', headerShown: false }} />
      <ScreenContainer style={{ backgroundColor: '#0f172a' }}>
        {swapped && (
          <View style={styles.swapBanner}>
            <Text style={styles.swapText}>🔄 덱이 교체됐습니다!</Text>
          </View>
        )}

        {/* Opponent */}
        <View style={styles.playerZone}>
          <Text style={styles.playerLabel}>상대방</Text>
          <View style={styles.hpBar}>
            <View style={[styles.hpFill, { width: `${(opHp / state.initial_hp) * 100}%`, backgroundColor: '#ef4444' }]} />
          </View>
          <Text style={styles.hpText}>HP: {opHp}/{state.initial_hp}</Text>
          <Text style={styles.deckText}>덱 ({opDeckLabel.toUpperCase()}): {opDeckRemaining.length}장</Text>
          <Text style={styles.handText}>손패: {opHand.length}장</Text>
        </View>

        {/* Turn info */}
        <View style={styles.turnBar}>
          <Text style={styles.turnText}>{state.turn_number}턴</Text>
          <Text style={styles.activeText}>{isMyTurn ? '내 차례' : '상대방 차례'}</Text>
          <Text style={styles.phaseText}>페이즈: {state.phase}</Text>
        </View>

        {/* Your zone */}
        <View style={styles.playerZone}>
          <Text style={styles.playerLabel}>나</Text>
          <View style={styles.hpBar}>
            <View style={[styles.hpFill, { width: `${(myHp / state.initial_hp) * 100}%`, backgroundColor: '#22c55e' }]} />
          </View>
          <Text style={styles.hpText}>HP: {myHp}/{state.initial_hp}</Text>
          <Text style={styles.deckText}>덱 ({myDeckLabel.toUpperCase()}): {myDeckRemaining.length}장</Text>
          <Text style={styles.handText}>손패: {myHand.length}장</Text>
          <Text style={styles.resourceText}>자원: {myResources}</Text>
        </View>

        {/* Actions */}
        {isMyTurn && (
          <View style={styles.actions}>
            <Button title="공격 (10)" onPress={() => sendAttack(10)} style={styles.actionBtn} />
            <Button title="공격 (20)" onPress={() => sendAttack(20)} style={styles.actionBtn} />
            <Button title="턴 종료" onPress={sendEndTurn} variant="secondary" style={styles.actionBtn} />
          </View>
        )}

        {!isMyTurn && (
          <View style={styles.waiting}>
            <Text style={styles.waitingText}>상대방 대기 중…</Text>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  connectingText: { textAlign: 'center', color: '#94a3b8', marginBottom: 40 },
  winnerText: { fontSize: 28, fontWeight: '800', color: '#fbbf24', textAlign: 'center', marginTop: 120 },
  swapBanner: { backgroundColor: '#fbbf24', padding: 10 },
  swapText: { textAlign: 'center', fontWeight: '700', color: '#111827' },
  playerZone: { flex: 1, padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  playerLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' },
  hpBar: { height: 8, backgroundColor: '#1e293b', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  hpFill: { height: '100%', borderRadius: 4 },
  hpText: { fontSize: 14, color: '#e2e8f0', fontWeight: '600' },
  deckText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  handText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  resourceText: { fontSize: 12, color: '#818cf8', marginTop: 2 },
  turnBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#1e293b' },
  turnText: { fontSize: 13, color: '#94a3b8' },
  activeText: { fontSize: 13, fontWeight: '700', color: '#818cf8' },
  phaseText: { fontSize: 11, color: '#64748b' },
  actions: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#0f172a' },
  actionBtn: { flex: 1 },
  waiting: { padding: 16, alignItems: 'center' },
  waitingText: { color: '#94a3b8', fontSize: 14 },
  errorText: { color: '#ef4444', textAlign: 'center', padding: 8 },
});
```

---

### Task 15: Refactor `profile/index.tsx`

**Files:**
- Modify: `frontend/app/(tabs)/profile/index.tsx`

**Interfaces:**
- Consumes: `ScreenContainer` from Task 1

- [ ] **Step 1: Apply replacements**

SafeAreaView → ScreenContainer. Profile screen uses `padding: 24` on the container — pass as `style` prop since ScreenContainer has no padding by default.

Final file:

```tsx
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/auth';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';

export default function Profile() {
  const { user, clearAuth } = useAuthStore();

  const logout = async () => {
    await clearAuth();
    router.replace('/(auth)/login');
  };

  return (
    <ScreenContainer style={styles.container}>
      <Text style={styles.heading}>프로필</Text>
      {user && (
        <>
          <Text style={styles.name}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </>
      )}
      <Button title="로그아웃" onPress={logout} variant="danger" style={{ marginTop: 24 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },
  name: { fontSize: 18, fontWeight: '600', color: '#374151' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4 },
});
```

---

### Task 16: Commit

- [ ] **Step 1: Stage and commit all changes**

```bash
cd /Users/comodoflow/Documents/project/cardcard
git add frontend/
git commit -m "refactor: CBD 원칙 - 공유 UI 컴포넌트 추출 (ScreenContainer, LoadingView, EmptyState)"
```
