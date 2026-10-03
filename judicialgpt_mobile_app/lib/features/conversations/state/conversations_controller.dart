import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/state/auth_controller.dart';
import '../../settings/state/app_preferences.dart';
import '../data/conversation_repository.dart';
import '../domain/conversation.dart';

final conversationsControllerProvider = AsyncNotifierProvider<ConversationsController, List<Conversation>>(
  ConversationsController.new,
);

/// The chat history shown in the sidebar (pinned first). Archived chats are
/// included only when "Show archived chats" is on in Settings.
class ConversationsController extends AsyncNotifier<List<Conversation>> {
  ConversationRepository get _repo => ref.read(conversationRepositoryProvider);

  bool get _showArchived => ref.read(appPreferencesProvider).showArchived;

  @override
  Future<List<Conversation>> build() async {
    ref.watch(appPreferencesProvider.select((p) => p.showArchived));
    final user = await ref.watch(authControllerProvider.future);
    if (user == null) return const [];
    return _fetch();
  }

  Future<void> refresh() async {
    state = await AsyncValue.guard(_fetch);
  }

  Future<List<Conversation>> _fetch() async => _sorted(await _repo.list(includeArchived: _showArchived));

  /// Adds a newly created conversation to the top of the list.
  void add(Conversation conversation) =>
      _update((list) => [conversation, ...list.where((c) => c.id != conversation.id)]);

  Future<void> rename(String id, String title) async {
    _update((list) => [for (final c in list) c.id == id ? c.copyWith(title: title) : c]);
    await _repo.rename(id, title);
  }

  Future<void> togglePin(String id) async {
    _update((list) => [for (final c in list) c.id == id ? c.copyWith(isPinned: !c.isPinned) : c]);
    await _repo.togglePin(id);
  }

  /// Archives (or, for an archived chat, restores) a conversation.
  Future<void> archive(String id) async {
    _update(
      (list) => _showArchived
          ? [for (final c in list) c.id == id ? c.copyWith(isArchived: !c.isArchived, isPinned: false) : c]
          : list.where((c) => c.id != id).toList(),
    );
    await _repo.toggleArchive(id);
  }

  Future<void> archiveAll() async {
    await _repo.archiveAll();
    await refresh();
  }

  Future<void> unarchiveAll() async {
    await _repo.unarchiveAll();
    await refresh();
  }

  Future<void> delete(String id) async {
    _update((list) => list.where((c) => c.id != id).toList());
    await _repo.delete(id);
  }

  Future<void> deleteAll() async {
    state = const AsyncData([]);
    await _repo.deleteAll();
  }

  void _update(List<Conversation> Function(List<Conversation>) change) {
    final current = state.value ?? const <Conversation>[];
    state = AsyncData(_sorted(change(current)));
  }

  static List<Conversation> _sorted(List<Conversation> list) => [
    ...list.where((c) => c.isPinned),
    ...list.where((c) => !c.isPinned),
  ];
}
