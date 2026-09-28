import '../../conversations/domain/chat_message.dart';

class ChatState {
  const ChatState({
    this.conversationId,
    this.title = 'New Chat',
    this.messages = const [],
    this.isLoading = false,
    this.isResponding = false,
    this.webSearch = false,
    this.error,
  });

  final String? conversationId;
  final String title;
  final List<ChatMessage> messages;

  /// Loading an existing conversation.
  final bool isLoading;

  /// Waiting for or streaming an assistant reply.
  final bool isResponding;

  /// Answer the next message with live web search instead of the model alone.
  final bool webSearch;
  final String? error;

  ChatState copyWith({
    String? conversationId,
    String? title,
    List<ChatMessage>? messages,
    bool? isLoading,
    bool? isResponding,
    bool? webSearch,
    String? error,
    bool clearError = false,
  }) => ChatState(
    conversationId: conversationId ?? this.conversationId,
    title: title ?? this.title,
    messages: messages ?? this.messages,
    isLoading: isLoading ?? this.isLoading,
    isResponding: isResponding ?? this.isResponding,
    webSearch: webSearch ?? this.webSearch,
    error: clearError ? null : (error ?? this.error),
  );
}
