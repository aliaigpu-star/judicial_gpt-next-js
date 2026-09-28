enum MessageRole { user, assistant, system }

enum MessageFeedback { like, dislike }

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    this.responseTime,
    this.currentVersion = 1,
    this.totalVersions = 1,
    this.feedback,
    this.metadata = const {},
    this.isStreaming = false,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final metadata = (json['metadata'] as Map?)?.cast<String, dynamic>() ?? const {};
    return ChatMessage(
      id: json['id'].toString(),
      role: MessageRole.values.asNameMap()[json['role']] ?? MessageRole.assistant,
      content: json['content'] as String? ?? '',
      responseTime: (json['responseTime'] as num?)?.toInt(),
      currentVersion: (json['currentVersion'] as num?)?.toInt() ?? 1,
      totalVersions: (json['totalVersions'] as num?)?.toInt() ?? 1,
      feedback: MessageFeedback.values.asNameMap()[metadata['feedback']],
      metadata: metadata,
    );
  }

  final String id;
  final MessageRole role;
  final String content;

  /// Milliseconds the model took, as reported by the backend.
  final int? responseTime;
  final int currentVersion;
  final int totalVersions;
  final MessageFeedback? feedback;

  /// Server-side extras, e.g. `judgmentSearch` sources.
  final Map<String, dynamic> metadata;

  /// True while this reply is still arriving.
  final bool isStreaming;

  bool get isUser => role == MessageRole.user;

  /// Local placeholder id used until the message is saved on the server.
  bool get isLocal => id.startsWith('local_');

  ChatMessage copyWith({
    String? id,
    String? content,
    int? responseTime,
    int? currentVersion,
    int? totalVersions,
    MessageFeedback? feedback,
    bool clearFeedback = false,
    bool? isStreaming,
  }) => ChatMessage(
    id: id ?? this.id,
    role: role,
    content: content ?? this.content,
    responseTime: responseTime ?? this.responseTime,
    currentVersion: currentVersion ?? this.currentVersion,
    totalVersions: totalVersions ?? this.totalVersions,
    feedback: clearFeedback ? null : (feedback ?? this.feedback),
    metadata: metadata,
    isStreaming: isStreaming ?? this.isStreaming,
  );
}
