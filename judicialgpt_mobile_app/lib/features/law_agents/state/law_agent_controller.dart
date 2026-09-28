import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../conversations/data/conversation_recorder.dart';
import '../data/law_agent_repository.dart';
import '../domain/law_agent_kind.dart';

class LawExchange {
  const LawExchange({required this.id, required this.query, required this.answer, required this.timestamp});

  final String id;
  final String query;
  final LawAnswer answer;
  final DateTime timestamp;
}

class LawAgentState {
  const LawAgentState({this.exchanges = const [], this.isAsking = false, this.error});

  final List<LawExchange> exchanges;
  final bool isAsking;
  final String? error;

  LawAgentState copyWith({List<LawExchange>? exchanges, bool? isAsking, String? error, bool clearError = false}) =>
      LawAgentState(
        exchanges: exchanges ?? this.exchanges,
        isAsking: isAsking ?? this.isAsking,
        error: clearError ? null : (error ?? this.error),
      );
}

final lawAgentControllerProvider = NotifierProvider.autoDispose.family<LawAgentController, LawAgentState, LawAgentKind>(
  LawAgentController.new,
);

class LawAgentController extends Notifier<LawAgentState> {
  LawAgentController(this.kind);

  final LawAgentKind kind;
  late final ConversationRecorder _recorder = ConversationRecorder(ref, titlePrefix: '${kind.name} Law');
  String? _sessionId;

  @override
  LawAgentState build() => const LawAgentState();

  void clearError() => state = state.copyWith(clearError: true);

  Future<void> ask(String query) async {
    final text = query.trim();
    if (text.isEmpty || state.isAsking) return;
    state = state.copyWith(isAsking: true, clearError: true);

    try {
      final answer = await ref.read(lawAgentRepositoryProvider).ask(kind, text, sessionId: _sessionId);
      _sessionId = answer.sessionId ?? _sessionId;
      if (!ref.mounted) return;
      state = state.copyWith(
        exchanges: [
          ...state.exchanges,
          LawExchange(
            id: 'law_${DateTime.now().microsecondsSinceEpoch}',
            query: text,
            answer: answer,
            timestamp: DateTime.now(),
          ),
        ],
      );
      await _recorder.record(query: text, answer: answer.answer);
    } catch (e) {
      if (ref.mounted) state = state.copyWith(error: e.toString());
    } finally {
      if (ref.mounted) state = state.copyWith(isAsking: false);
    }
  }
}
