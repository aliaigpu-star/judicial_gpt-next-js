import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// The two Judgment Writing agents share one screen, configured per kind.
enum WriterKind {
  civil(
    title: 'Civil Judgment Writing',
    description: 'Assist in drafting legally sound civil judgments compliant with CPC Pakistan procedural standards.',
    complianceLabel: 'CPC Compliant',
    disclaimer: 'JudicialGPT drafting is based on CPC 1908 Order XX Rule 4. Always review legal accuracy.',
    proxyPath: '/api/ai/agent/civil-writer',
    accent: AppColors.civilWriter,
    icon: Icons.description_outlined,
    suggestions: [
      'Draft a heading and statement of case for a declaration suit',
      'Frame issues for a specific performance contract dispute',
      'Draft findings on issue of limitation in a property suit',
      'Write the operative part and decree for a dismissed suit',
    ],
  ),
  criminal(
    title: 'Criminal Judgment Writing',
    description:
        'Assist in drafting legally sound criminal judgments compliant with Cr.P.C. Pakistan procedural standards.',
    complianceLabel: 'Cr.P.C. Compliant',
    disclaimer: 'JudicialGPT drafting is based on Cr.P.C. 1898 Ss. 366-371. Always review legal accuracy.',
    proxyPath: '/api/ai/agent/criminal-writer',
    accent: AppColors.criminalWriter,
    icon: Icons.gavel,
    suggestions: [
      'Draft a Sessions Court judgment under Section 302 PPC with eyewitness evidence',
      'Write findings on the charge of robbery under Section 392 PPC',
      'Prepare a criminal judgment on a narcotics case under CNSA Section 9',
      'Draft the conviction and sentence portion for a hurt case under Section 337 PPC',
    ],
  );

  const WriterKind({
    required this.title,
    required this.description,
    required this.complianceLabel,
    required this.disclaimer,
    required this.proxyPath,
    required this.accent,
    required this.icon,
    required this.suggestions,
  });

  final String title;
  final String description;
  final String complianceLabel;
  final String disclaimer;

  /// Route on the backend's authenticated agent proxy.
  final String proxyPath;
  final Color accent;
  final IconData icon;
  final List<String> suggestions;
}
