import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/account_repository.dart';
import '../widgets/settings_widgets.dart';

/// Custom instructions the AI should always prioritise (stored in the
/// profile's preferences and applied by the backend to every chat).
class PersonalizationSection extends ConsumerStatefulWidget {
  const PersonalizationSection({super.key});

  @override
  ConsumerState<PersonalizationSection> createState() => _PersonalizationSectionState();
}

class _PersonalizationSectionState extends ConsumerState<PersonalizationSection> {
  final _instructions = TextEditingController();
  String _saved = '';
  bool _loading = true;
  bool _saving = false;
  ({String text, bool isError})? _message;

  @override
  void initState() {
    super.initState();
    _instructions.addListener(() => setState(() {}));
    _load();
  }

  @override
  void dispose() {
    _instructions.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final profile = await ref.read(accountRepositoryProvider).profile();
      _saved = profile.customInstructions;
      _instructions.text = _saved;
    } catch (e) {
      _message = (text: 'Could not load your instructions: $e', isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _message = null;
    });
    try {
      await ref.read(accountRepositoryProvider).saveCustomInstructions(_instructions.text);
      _saved = _instructions.text;
      _message = (text: 'Personalization saved', isError: false);
    } catch (e) {
      _message = (text: e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final changed = _instructions.text != _saved;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Custom Instructions', style: theme.textTheme.titleSmall),
        const SizedBox(height: 4),
        Text(
          'Add specific instructions or personal context you want the AI to always prioritize.',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _instructions,
          enabled: !_loading,
          minLines: 5,
          maxLines: 10,
          decoration: InputDecoration(
            hintText: _loading ? 'Loading...' : "e.g., 'I am a law student in Lahore', 'Always cite specific case law'",
          ),
        ),
        if (_message != null) ...[
          const SizedBox(height: 12),
          StatusMessage(text: _message!.text, isError: _message!.isError),
        ],
        const SizedBox(height: 16),
        Row(
          children: [
            if (changed)
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving ? null : () => _instructions.text = _saved,
                  child: const Text('Discard'),
                ),
              ),
            if (changed) const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                onPressed: changed && !_saving ? _save : null,
                child: _saving
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Save'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
