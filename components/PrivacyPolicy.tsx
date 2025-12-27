import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const PrivacyPolicy: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-white z-[60] overflow-y-auto flex flex-col animate-[slideInRight_0.3s_ease-out]">
       <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">개인정보 처리방침</h1>
      </div>
      <div className="p-6 text-sm text-gray-600 leading-relaxed space-y-6">
        <section>
            <h2 className="font-bold text-gray-900 mb-2">1. 개인정보의 수집 항목</h2>
            <p>회사는 원활한 서비스 제공을 위해 다음과 같은 최소한의 개인정보를 수집합니다.</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
                <li><strong>필수항목:</strong> 닉네임, 프로필 사진, 서비스 이용 기록, 접속 로그</li>
                <li><strong>선택항목:</strong> 음식 사진 및 관련 메타데이터, 아기 프로필 정보(이름, 생년월일, 알레르기 정보)</li>
            </ul>
        </section>
        <section>
            <h2 className="font-bold text-gray-900 mb-2">2. 개인정보의 수집 및 이용 목적</h2>
            <p>수집한 개인정보는 다음의 목적을 위해 활용됩니다.</p>
             <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>서비스 제공: AI 식단 분석, 칼로리 계산, 가족 간 식단 공유 기능 제공</li>
                <li>회원 관리: 서비스 이용에 따른 본인 확인, 개인 식별, 불량 회원의 부정 이용 방지</li>
                <li>신규 서비스 개발 및 마케팅: 통계적 분석, 맞춤형 서비스 제공</li>
            </ul>
        </section>
        <section>
            <h2 className="font-bold text-gray-900 mb-2">3. 개인정보의 보유 및 이용 기간</h2>
            <p>회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 회원이 탈퇴를 요청할 때까지 정보를 보유하며, 관계 법령에 의해 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.</p>
        </section>
         <section>
            <h2 className="font-bold text-gray-900 mb-2">4. 개인정보의 제3자 제공 및 위탁</h2>
            <p>회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, AI 식단 분석 기능을 제공하기 위해 업로드된 이미지 데이터는 Google Gemini API를 통해 처리될 수 있으며, 이 과정에서 개인 식별 정보는 포함되지 않습니다.</p>
        </section>
        <section>
            <h2 className="font-bold text-gray-900 mb-2">5. 이용자의 권리</h2>
            <p>이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 수집 및 이용에 대한 동의 철회 또는 가입 해지를 요청할 수 있습니다.</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;