import 'package:flutter/material.dart';
import 'package:kakao_flutter_sdk/kakao_flutter_sdk.dart';
import 'screens/web_view_screen.dart';

void main() {
  // Kakao SDK 초기화 (사용자 앱 키로 변경 필요)
  KakaoSdk.init(nativeAppKey: '68c64d695c4dbeb6b4b0af128c52b87a');
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '한끼',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFF97316)),
        useMaterial3: true,
        fontFamily: 'Pretendard',
      ),
      home: const WebViewScreen(),
    );
  }
}
