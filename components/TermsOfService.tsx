import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const TermsOfService: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-white z-[60] overflow-y-auto flex flex-col animate-[slideInRight_0.3s_ease-out]">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">서비스 이용약관</h1>
      </div>
      <div className="p-6 text-sm text-gray-600 leading-relaxed space-y-6">
        <section>
            <h2 className="font-bold text-gray-900 mb-2">제1조 (목적)</h2>
            <p>본 약관은 '한끼'(이하 "회사")가 제공하는 식단 관리 및 공유 서비스(이하 "서비스")의 이용조건 및 절차, 이용자와 회사의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.</p>
        </section>
        <section>
            <h2 className="font-bold text-gray-900 mb-2">제2조 (용어의 정의)</h2>
            <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>"회원"이라 함은 서비스에 접속하여 본 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.</li>
                <li>"게시물"이라 함은 회원이 서비스를 이용함에 있어 서비스 상에 게시한 부호ㆍ문자ㆍ음성ㆍ음향ㆍ화상ㆍ동영상 등의 정보 형태의 글, 사진, 동영상 및 각종 파일과 링크 등을 의미합니다.</li>
            </ul>
        </section>
        <section>
            <h2 className="font-bold text-gray-900 mb-2">제3조 (계정 관리)</h2>
            <p>회원은 본인의 식단 정보를 기록하고 가족과 공유하기 위해 계정을 생성할 수 있습니다. 회원은 자신의 계정 정보가 유출되지 않도록 안전하게 관리해야 하며, 타인에게 양도하거나 대여할 수 없습니다.</p>
        </section>
        <section>
            <h2 className="font-bold text-gray-900 mb-2">제4조 (서비스의 이용)</h2>
            <p>회원은 본 서비스를 통해 음식 사진을 업로드하고 AI 분석 결과를 확인할 수 있습니다. 회사가 제공하는 영양 정보 및 분석 결과는 참고용이며, 정확성을 보증하지 않습니다. 이는 전문적인 의학적 진단이나 영양 상담을 대신할 수 없습니다.</p>
        </section>
         <section>
            <h2 className="font-bold text-gray-900 mb-2">제5조 (저작권의 귀속 및 이용제한)</h2>
            <p>회원이 서비스 내에 게시한 게시물의 저작권은 해당 게시물의 저작자에게 귀속됩니다. 회사는 서비스의 운영, 전시, 전송, 배포, 홍보의 목적으로 회원의 게시물을 무상으로 사용할 수 있습니다.</p>
        </section>
        <section>
            <h2 className="font-bold text-gray-900 mb-2">제6조 (계약 해지)</h2>
            <p>회원은 언제든지 서비스 내 설정 메뉴를 통하여 이용계약 해지 신청을 할 수 있으며, 회사는 관련법 등이 정하는 바에 따라 이를 즉시 처리하여야 합니다.</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;