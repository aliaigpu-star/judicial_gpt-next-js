import 'package:flutter/material.dart';
import '../widgets/brand_mark.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/auth_screen.dart';
import '../../features/auth/presentation/auth_style.dart';
import '../../features/auth/state/auth_controller.dart';
import '../../features/chat/presentation/chat_screen.dart';
import '../../features/judgment_search/presentation/judgment_search_screen.dart';
import '../../features/judgment_writer/domain/writer_kind.dart';
import '../../features/judgment_writer/presentation/judgment_writer_screen.dart';
import '../../features/law_agents/domain/law_agent_kind.dart';
import '../../features/law_agents/presentation/law_agent_screen.dart';
import '../../features/settings/domain/settings_section.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/shell/presentation/app_scaffold.dart';
import '../../features/summarizer/presentation/summarizer_screen.dart';
import '../../features/voice_agent/presentation/voice_agent_screen.dart';
import '../theme/app_colors.dart';
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
          GoRoute(path: Routes.voiceAgent, builder: (_, _) => const VoiceAgentScreen()),
          GoRoute(
            path: Routes.settings,
            builder: (_, _) => const SettingsScreen(),
            routes: [
              GoRoute(
                path: ':section',
                builder: (_, state) =>
                    SettingsScreen(section: SettingsSection.values.asNameMap()[state.pathParameters['section']]),
              ),
            ],
          ),
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

/// Shown under the opening splash doors while the stored session is checked.
class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: JudicialColors.marble,
    body: AuthBackdrop(
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const BrandMark(size: 88, shadow: true),
            const SizedBox(height: 24),
            const CircularProgressIndicator(color: JudicialColors.green),
          ],
        ),
      ),
    ),
  );
}
