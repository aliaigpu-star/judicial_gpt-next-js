import 'package:flutter/material.dart';

import '../../../core/config/app_config.dart';
import 'turnstile/turnstile_view.dart';

/// Shows Cloudflare Turnstile and resolves with a verification token, or
/// `null` if the user dismissed it.
Future<String?> requestCaptchaToken(BuildContext context) => showModalBottomSheet<String>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (_) => const _TurnstileSheet(),
);

class _TurnstileSheet extends StatefulWidget {
  const _TurnstileSheet();

  @override
  State<_TurnstileSheet> createState() => _TurnstileSheetState();
}

class _TurnstileSheetState extends State<_TurnstileSheet> {
  /// Why the last check failed, or `null` while it is pending.
  String? _error;

  /// Bumped to reload the widget from scratch on retry.
  int _attempt = 0;

  void _onToken(String token) {
    if (mounted) Navigator.of(context).pop(token);
  }

  void _onError(String reason) {
    if (mounted) setState(() => _error = reason);
  }

  void _retry() => setState(() {
    _error = null;
    _attempt++;
  });

  /// Turns a Turnstile error code into advice the user can act on.
  /// Codes: https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/
  static String _describe(String code) {
    if (code == 'script-load-failed' || code.startsWith('1')) {
      return 'Could not reach Cloudflare. Check your internet connection and try again.';
    }
    if (code == 'timeout' || code.startsWith('3') || code.startsWith('6')) {
      return 'The security check could not confirm this device. Try again, or switch between Wi-Fi and mobile data.';
    }
    return 'Verification failed. Try again.';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Security check', style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              _error == null ? 'Please confirm you are human to continue.' : '${_describe(_error!)} (code: $_error)',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: _error != null ? theme.colorScheme.error : theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 90,
              width: 320,
              child: TurnstileView(
                key: ValueKey(_attempt),
                siteKey: AppConfig.turnstileSiteKey,
                onToken: _onToken,
                onError: _onError,
              ),
            ),
            if (_error != null) TextButton(onPressed: _retry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }
}
