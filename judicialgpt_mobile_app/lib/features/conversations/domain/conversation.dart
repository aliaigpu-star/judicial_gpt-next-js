import 'chat_message.dart';

class Conversation {
  const Conversation({
    required this.id,
    required this.title,
    this.isPinned = false,
    this.isArchived = false,
    this.updatedAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
    id: json['id'].toString(),
    title: (json['title'] as String?)?.trim().isNotEmpty == true ? json['title'] as String : 'New Chat',
    isPinned: json['isPinned'] as bool? ?? false,
    isArchived: json['isArchived'] as bool? ?? false,
    updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? ''),
  );

  final String id;
  final String title;
  final bool isPinned;
  final bool isArchived;
  final DateTime? updatedAt;

  Conversation copyWith({String? title, bool? isPinned, bool? isArchived}) => Conversation(
    id: id,
    title: title ?? this.title,
    isPinned: isPinned ?? this.isPinned,
    isArchived: isArchived ?? this.isArchived,
    updatedAt: updatedAt,
  );
}

/// A conversation together with its messages.
class ConversationDetail {
  const ConversationDetail({required this.conversation, required this.messages});

  factory ConversationDetail.fromJson(Map<String, dynamic> json) => ConversationDetail(
    conversation: Conversation.fromJson(json),
    messages: [
      for (final m in (json['messages'] as List? ?? const [])) ChatMessage.fromJson(m as Map<String, dynamic>),
    ],
  );

  final Conversation conversation;
  final List<ChatMessage> messages;
}
