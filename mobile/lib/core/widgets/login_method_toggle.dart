import 'package:flutter/material.dart';

/// "OTP on WhatsApp" / "ID & password" switch shown on every login screen.
class LoginMethodToggle extends StatelessWidget {
  const LoginMethodToggle({super.key, required this.usePassword, required this.onChanged});

  final bool usePassword;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<bool>(
      showSelectedIcon: false,
      segments: const [
        ButtonSegment(value: false, icon: Icon(Icons.chat_outlined, size: 18), label: Text('OTP')),
        ButtonSegment(value: true, icon: Icon(Icons.lock_outline, size: 18), label: Text('ID & password')),
      ],
      selected: {usePassword},
      onSelectionChanged: (s) => onChanged(s.first),
    );
  }
}
