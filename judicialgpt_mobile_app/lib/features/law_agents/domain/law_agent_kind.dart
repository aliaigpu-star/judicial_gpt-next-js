import 'package:flutter/material.dart';

import '../../../core/config/app_config.dart';
import '../../../core/theme/app_colors.dart';

/// Civil and Criminal Law expose `POST /query` (form fields) behind the
/// backend proxy; Family Law exposes `POST /ask` (JSON) directly.
enum LawAgentTransport { proxiedForm, directJson }

enum LawAgentKind {
  civil(
    name: 'Civil',
    description: 'Ask questions on civil procedure, contracts, property, family, and torts under Pakistani law.',
    accent: AppColors.civilLaw,
    icon: Icons.balance,
    transport: LawAgentTransport.proxiedForm,
    endpoint: '/api/ai/agent/civil-law/query',
    suggestions: [
      'What are the essentials of a valid contract under the Contract Act?',
      'Explain the procedure for filing a civil suit under the CPC.',
      'What is the limitation period for a suit for recovery of money?',
      'How is temporary injunction granted under Order 39 CPC?',
    ],
  ),
  criminal(
    name: 'Criminal',
    description: 'Ask questions on PPC, Cr.P.C., evidence, bail, and criminal procedure under Pakistani law.',
    accent: AppColors.criminalLaw,
    icon: Icons.gavel,
    transport: LawAgentTransport.proxiedForm,
    endpoint: '/api/ai/agent/criminal-law/query',
    suggestions: [
      'What are the grounds for bail under Section 497 Cr.P.C.?',
      'Explain the difference between cognizable and non-cognizable offences.',
      'What is the procedure for recording a FIR under Section 154 Cr.P.C.?',
      'Summarize the ingredients of Section 302 PPC.',
    ],
  ),
  family(
    name: 'Family',
    description:
        'Ask questions on nikah, talaq, khula, custody, maintenance, dower, and succession under Pakistani family law.',
    accent: AppColors.familyLaw,
    icon: Icons.people_outline,
    transport: LawAgentTransport.directJson,
    endpoint: '${AppConfig.familyLawAgentUrl}/ask',
    suggestions: [
      'What are the grounds for khula under the Dissolution of Muslim Marriages Act 1939?',
      'Explain the procedure for child custody (Hizanat) under Pakistani family law.',
      'What documents are required to file a maintenance suit for a wife and minor children?',
      'How is a talaq made effective under the Muslim Family Laws Ordinance 1961?',
    ],
  );

  const LawAgentKind({
    required this.name,
    required this.description,
    required this.accent,
    required this.icon,
    required this.transport,
    required this.endpoint,
    required this.suggestions,
  });

  final String name;
  final String description;
  final Color accent;
  final IconData icon;
  final LawAgentTransport transport;
  final String endpoint;
  final List<String> suggestions;

  String get title => '$name Law Agent';
  String get ragLabel => '$name Law RAG';
}
