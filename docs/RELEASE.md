# Release guide: live app ko update kaise karein

Kabhi bhi client ko dobara APK bhejne ki zaroorat tabhi hai jab "naya release" wali condition ho.

## Kya badla -> kya karna hai

| Badlav | Kya karna hai | Client ko APK? |
|---|---|---|
| Server logic, API jawab, rates, data, admin, website | Server deploy karo | Nahi |
| App ki screen / button / label (Dart code) | `mobile\tools\patch.bat` | Nahi |
| Naya plugin, permission, app icon, Android setting | `mobile\tools\release.bat` (version badhao) | Haan |

## 1. Server deploy (website + API + admin)
1. Code git mein commit + push karo.
2. Live server par: `bash deploy-safe.sh` (cPanel, app user `pronesto`).
3. Naye database tables ke liye ye script `prisma db push` chalati hai (bina data-loss flag).

Pehli baar (Dealer role hatane ke liye) live DB mein pehle ye SQL chalao:
```sql
UPDATE User SET role='OWNER' WHERE role='DEALER';
UPDATE Plan SET role='BOTH' WHERE role='DEALER';
```

## 2. Patch bhejna (UI badlav, bina APK)
Pehle agar naya UI naya API use karta hai to **pehle server deploy karo**, phir patch.

1. Windows mein `mobile\tools\patch.bat` chalao (Git Bash nahi, CMD ya double-click).
2. `y` dabao.
3. Phone par app band karke 1-2 baar dobara kholo. Patch aa jata hai.

## 3. Naya release (kam hi)
1. `mobile\pubspec.yaml` mein version badhao, jaise `1.0.1+2` -> `1.0.2+3`.
2. `mobile\tools\release.bat` chalao.
3. APK: `mobile\build\app\outputs\flutter-apk\app-pronesto-release.apk`. Ye client ko bhejo.
4. Uske baad patch is naye version par jayenge (`patch.bat` pubspec ka version khud padhta hai).

## Zaroori niyam
- Purane users ke liye server compatible rakho: naye fields/endpoints jodo, purane mat hatao.
- Flutter version hamesha `3.47.6` (script mein pin hai).
- Release keystore `mobile\android\app\pronesto-release.jks` aur `mobile\android\key.properties` ka backup rakho. Ye gayi to sab users ko reinstall karna padega.
- Windows mein **Developer Mode on** hona chahiye.
- Shorebird mein ek baar `shorebird login` ho chuka hai (account: pronesto).

## Dikkat aaye to
| Dikkat | Wajah / fix |
|---|---|
| `Error when reading '/main.dart'` | Git Bash se na chalao; script ya CMD use karo |
| `symlink support` error | Windows Developer Mode on karo |
| Patch phone par nahi aaya | Internet ho, app 2 baar poori band karke kholo |
| Version already exists | `pubspec.yaml` ka version badhao |
