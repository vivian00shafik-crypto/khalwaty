# خلوتي V272 — تشغيل الإشعارات الأصلية على أندرويد (Capacitor)

الكود الجديد في `index.html` بيشتغل **بس جوه تطبيق Capacitor**. في المتصفح العادي الكود القديم هو اللي بيشتغل.
بيجدول كل صلاة (باكر، الثالثة...) وصوت يسوع والتذكيرات كمنبّه يومي على الموبايل نفسه.

## ١) إنشاء المشروع (مرة واحدة)
```
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/local-notifications
npx cap init "خلوتي" com.khalwati.app --web-dir=www
mkdir www
# انسخي كل ملفات التطبيق جوه www (index.html, sw.js, الصور, ملفات الصوت mp3, الأيقونات, manifest...)
npx cap add android
npx cap sync
```

## ٢) صوت المنبّه
انسخي `prayer-alarm.mp3` إلى:
`android/app/src/main/res/raw/prayer_alarm.mp3`
(اسم الملف حروف صغيرة وشرطة سفلية، ولازم فولدر `raw` يتعمل لو مش موجود.)

## ٣) الأذونات — في `android/app/src/main/AndroidManifest.xml` جوه `<manifest>`
```
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
```
> استخدمي `SCHEDULE_EXACT_ALARM` (المستخدمة بتفعّلها). `USE_EXACT_ALARM` جوجل بلاي بتقصرها على تطبيقات المنبّه والتقويم.

## ٤) البناء
```
npx cap sync
npx cap open android      # من Android Studio: Build > Generate Signed Bundle / APK
```
بعد أي تعديل في ملفات الويب: انسخيها لـ `www` وشغّلي `npx cap sync` تاني.

## ٥) تجربة على الموبايل
1. افتحي التطبيق ← الإعدادات ← فعّلي الإشعارات (اسمحي بالإشعارات، وفعّلي «المنبهات والتذكيرات» لما يطلبها).
2. فعّلي أجبية وخلّي ميعادها بعد دقيقتين، **واقفلي التطبيق** وطفّي الشاشة.
3. لازم يجيلك إشعار بصوت المنبّه في الميعاد.

## ملاحظات مهمة
- **توفير البطارية:** في بعض الموبايلات (شاومي، سامسونج، أوبو...) ضبطي التطبيق على «غير مقيّد / Unrestricted» من إعدادات البطارية، وإلا ممكن النظام يأخّر الإشعار.
- **الصوت:** إعدادات قناة الإشعار مبتتغيرش بعد ما تتعمل. لو غيّرتي الصوت وانتي بتجربي، امسحي التطبيق وركّبيه تاني.
- الإشعار اليومي لصوت يسوع بيحمل نص ثابت («اضغطي لتسمعي صوت يسوع وآية اليوم») لأن آية اليوم بتتحدد وقت فتح التطبيق.
- آخر التجربة دي لازم تتعمل على موبايل حقيقي؛ المحاكاة اللي اتعملت هنا بتتأكد من الجدولة بس.
