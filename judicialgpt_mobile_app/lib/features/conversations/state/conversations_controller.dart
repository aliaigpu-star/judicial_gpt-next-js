import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/state/auth_controller.dart';
import '../data/conversation_repository.dart';
import '../domain/conversation.dart';

final conversationsControllerProvider = AsyncNotifierProvider<ConversationsController, List<Conversation>>(
  ConversationsController.new,
);

/// The chat history shown in the sidebar (pinned first).
class ConversationsController extends AsyncNotifier<List<Conversation>> {
  ConversationRepository get _repo => ref.read(conversationRepositoryProvider);

  @override
  Future<List<Conversation>> build() async {
    final user = await ref.watch(authControllerProvider.future);
    if (user == null) return const [];
    return _sorted(await _repo.list());
  }

  Future<void> refresh() async {
    state = await AsyncValue.guard(() async => _sorted(await _repo.list()));
  }

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

  Future<void> archive(String id) async {
    _update((list) => list.where((c) => c.id != id).toList());
    await _repo.toggleArchive(id);
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
