import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/auth_screen.dart';
import '../../features/auth/state/auth_controller.dart';
import '../../features/chat/presentation/chat_screen.dart';
import '../../features/judgment_search/presentation/judgment_search_screen.dart';
import '../../features/judgment_writer/domain/writer_kind.dart';
import '../../features/judgment_writer/presentation/judgment_writer_screen.dart';
import '../../features/law_agents/domain/law_agent_kind.dart';
import '../../features/law_agents/presentation/law_agent_screen.dart';
import '../../features/shell/presentation/app_scaffold.dart';
import '../../features/summarizer/presentation/summarizer_screen.dart';
import 'routes.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  // Re-evaluates redirects whenever the signed-in user changes.
  final authChanges = ValueNotifier(0);
  ref
    ..listen(authControllerProvider, (_, _) => authChanges.value++)
    ..onDispose(authChanges.dispose);

  final router = GoRouter(
    initialLocation: Routes.splash,
    refreshListenable: authChanges,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final path = state.uri.path;
      if (auth.isLoading && !auth.hasValue) return path == Routes.splash ? null : Routes.splash;

      final signedIn = auth.value != null;
      if (!signedIn) return path == Routes.login ? null : Routes.login;
      if (path == Routes.login || path == Routes.splash) return Routes.chat;
      return null;
    },
    routes: [
      GoRoute(path: Routes.splash, builder: (_, _) => const _SplashScreen()),
      GoRoute(path: Routes.login, builder: (_, _) => const AuthScreen()),
      ShellRoute(
        builder: (_, state, child) => ResponsiveShell(currentPath: state.uri.path, child: child),
        routes: [
          GoRoute(path: Routes.chat, builder: (_, _) => const ChatScreen()),
          // Agent routes must precede `/chat/:id`, which matches any segment.
          GoRoute(path: Routes.judgmentSearch, builder: (_, _) => const JudgmentSearchScreen()),
          GoRoute(
            path: Routes.civilJudgment,
            builder: (_, _) => const JudgmentWriterScreen(key: ValueKey('writer-civil'), kind: WriterKind.civil),
          ),
          GoRoute(
            path: Routes.criminalJudgment,
            builder: (_, _) => const JudgmentWriterScreen(key: ValueKey('writer-criminal'), kind: WriterKind.criminal),
          ),
          GoRoute(
            path: Routes.civilLaw,
            builder: (_, _) => const LawAgentScreen(key: ValueKey('law-civil'), kind: LawAgentKind.civil),
          ),
          GoRoute(
            path: Routes.criminalLaw,
            builder: (_, _) => const LawAgentScreen(key: ValueKey('law-criminal'), kind: LawAgentKind.criminal),
          ),
          GoRoute(
            path: Routes.familyLaw,
            builder: (_, _) => const LawAgentScreen(key: ValueKey('law-family'), kind: LawAgentKind.family),
          ),
          GoRoute(path: Routes.summarize, builder: (_, _) => const SummarizerScreen()),
          GoRoute(
            path: '${Routes.chat}/:id',
            builder: (_, state) {
              final id = state.pathParameters['id']!;
              return ChatScreen(key: ValueKey('chat-$id'), conversationId: id);
            },
          ),
        ],
      ),
    ],
  );

  ref.onDispose(router.dispose);
  return router;
});

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset('assets/images/judicial-logo.png', width: 96, height: 96),
          const SizedBox(height: 24),
          const CircularProgressIndicator(),
        ],
      ),
    ),
  );
}
