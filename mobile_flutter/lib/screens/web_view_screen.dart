import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
// Android/iOS 전용 구현 임포트 (필요 시)
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import '../services/google_login_service.dart';
import '../services/kakao_login_service.dart';
import 'package:image_picker/image_picker.dart';

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  final GoogleLoginService _googleLoginService = GoogleLoginService();
  final KakaoLoginService _kakaoLoginService = KakaoLoginService();
  final ImagePicker _picker = ImagePicker();

  // 로딩 상태 및 에러 상태 추가
  bool _isLoading = true;
  String? _errorMessage;

  // 배포된 웹 앱 URL로 변경하세요.
  final String _initialUrl = 'https://hankki.vercel.app';
  //final String _initialUrl = 'http://192.168.45.193:5173';

  @override
  void initState() {
    super.initState();

    // WebViewController 설정
    late final PlatformWebViewControllerCreationParams params;
    if (WebViewPlatform.instance is WebKitWebViewPlatform) {
      params = WebKitWebViewControllerCreationParams(
        allowsInlineMediaPlayback: true,
        mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
      );
    } else {
      params = const PlatformWebViewControllerCreationParams();
    }

    _controller = WebViewController.fromPlatformCreationParams(params);
    _controller.setUserAgent("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36");

    _controller
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            debugPrint('WebView is loading (progress : $progress%)');
          },
          onPageStarted: (String url) {
            debugPrint('Page started loading: $url');
            if (mounted) {
              setState(() {
                _isLoading = true;
                _errorMessage = null;
              });
            }
          },
          onPageFinished: (String url) {
            debugPrint('Page finished loading: $url');
            if (mounted) {
              setState(() {
                _isLoading = false;
              });
            }
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('''
              Page resource error:
                code: ${error.errorCode}
                description: ${error.description}
                errorType: ${error.errorType}
                isForMainFrame: ${error.isForMainFrame}
          ''');
            if (error.isForMainFrame && mounted) {
              setState(() {
                _isLoading = false;
                _errorMessage = '페이지를 로드할 수 없습니다.\n${error.description}';
              });
            }
          },
        ),
      )
      ..addJavaScriptChannel(
        'Toaster',
        onMessageReceived: (JavaScriptMessage message) {
          _handleMessage(message.message);
        },
      )
      ..loadRequest(Uri.parse(_initialUrl));
  }

  void _handleMessage(String message) {
    debugPrint('Received message from WebView: $message');
    
    // 사용자 피드백을 위해 SnackBar 표시 (디버깅용)
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('메시지 수신: $message'), duration: const Duration(seconds: 1)),
      );
    }

    if (message == 'google_login') {
      _handleGoogleLogin();
    } else if (message == 'kakao_login') {
      _handleKakaoLogin();
    } else if (message == 'open_camera') {
      _handleImagePick(ImageSource.camera);
    } else if (message == 'open_album') {
      _handleImagePick(ImageSource.gallery);
    }
  }

  Future<void> _handleImagePick(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      
      if (image != null) {
        final bytes = await image.readAsBytes();
        final base64Image = base64Encode(bytes);
        
        // 웹 앱의 receiveImageFromApp 함수 호출
        _controller.runJavaScript("window.receiveImageFromApp('$base64Image');");
      }
    } catch (e) {
      debugPrint('Image Pick Error: $e');
    }
  }

  Future<void> _handleGoogleLogin() async {
    final account = await _googleLoginService.signIn();
    if (account != null) {
      final auth = await account.authentication;
      final data = {
        'id': account.id,
        'email': account.email,
        'displayName': account.displayName,
        'photoUrl': account.photoUrl,
        'accessToken': auth.accessToken,
        'idToken': auth.idToken,
      };
      
      // 웹 앱의 handleFlutterLoginSuccess 함수 호출
      final jsonString = jsonEncode(data);
      _controller.runJavaScript('window.handleFlutterLoginSuccess($jsonString);');
    }
  }

  Future<void> _handleKakaoLogin() async {
    final token = await _kakaoLoginService.signIn();
    if (token != null) {
      final data = {
        'accessToken': token.accessToken,
        'refreshToken': token.refreshToken,
        'idToken': token.idToken,
      };
      
      final jsonString = jsonEncode(data);
      _controller.runJavaScript('window.handleFlutterLoginSuccess($jsonString);');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      // SafeArea로 감싸서 기기 상단/하단 영역 보호
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _controller),
            // 로딩 인디케이터 표시
            if (_isLoading)
              Container(
                color: Colors.white,
                child: const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 16),
                      Text(
                        '페이지를 불러오는 중...',
                        style: TextStyle(fontSize: 16, color: Colors.black54),
                      ),
                    ],
                  ),
                ),
              ),
            // 에러 메시지 표시
            if (_errorMessage != null)
              Container(
                color: Colors.white,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          size: 64,
                          color: Colors.red,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 16,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: () {
                            setState(() {
                              _errorMessage = null;
                              _isLoading = true;
                            });
                            _controller.reload();
                          },
                          child: const Text('다시 시도'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
