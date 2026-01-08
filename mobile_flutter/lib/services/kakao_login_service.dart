import 'package:flutter/services.dart';
import 'package:kakao_flutter_sdk/kakao_flutter_sdk.dart';

class KakaoLoginService {
  Future<OAuthToken?> signIn() async {
    try {
      bool isInstalled = await isKakaoTalkInstalled();
      
      if (isInstalled) {
        try {
          return await UserApi.instance.loginWithKakaoTalk();
        } catch (error) {
          print('KakaoTalk Login Error: $error');
          // 사용자가 의도적으로 취소한 경우 (예: 뒤로 가기)
          if (error is PlatformException && error.code == 'CANCELED') {
            return null;
          }
          // 그 외의 경우 카카오계정 로그인 시도
          return await UserApi.instance.loginWithKakaoAccount();
        }
      } else {
        return await UserApi.instance.loginWithKakaoAccount();
      }
    } catch (error) {
      print('Kakao Login Error: $error');
      return null;
    }
  }

  Future<void> signOut() async {
    try {
      await UserApi.instance.logout();
    } catch (error) {
      print('Kakao Logout Error: $error');
    }
  }
}
