import 'package:flutter/material.dart';

/// The Settings tabs, in the same order and wording as the website.
enum SettingsSection {
  general('General', 'Customize your experience', Icons.tune_rounded),
  notifications('Notifications', 'Manage your notifications', Icons.notifications_none_rounded),
  personalization('Personalization', 'Add custom instructions for AI', Icons.auto_awesome_outlined),
  dataControls('Data controls', 'Manage your data and privacy', Icons.storage_rounded),
  security('Security', 'Keep your account secure', Icons.shield_outlined),
  account('Account', 'Manage your profile', Icons.person_outline_rounded);

  const SettingsSection(this.label, this.description, this.icon);

  final String label;
  final String description;
  final IconData icon;
}
