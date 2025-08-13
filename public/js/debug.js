/**
 * 디버깅 도구
 * 현재 애플리케이션 상태를 확인하기 위한 도구
 */

// 페이지 로드 시 즉시 실행
(function() {
    console.log('🔍 Kiyeno 디버깅 도구 시작');
    
    // 기본 환경 정보
    console.log('📍 현재 URL:', window.location.href);
    console.log('📍 Origin:', window.location.origin);
    console.log('📍 User Agent:', navigator.userAgent);
    
    // 전역 변수 확인
    console.log('🔍 전역 변수 확인:');
    console.log('  - Dexie:', typeof Dexie !== 'undefined' ? '✅ 로드됨' : '❌ 없음');
    console.log('  - window.priceDB:', typeof window.priceDB !== 'undefined' ? '✅ 있음' : '❌ 없음');
    console.log('  - window.kiyenoApp:', typeof window.kiyenoApp !== 'undefined' ? '✅ 있음' : '❌ 없음');
    
    // 기존 함수 확인
    console.log('🔍 기존 함수 확인:');
    console.log('  - showMaterialManageModal:', typeof showMaterialManageModal !== 'undefined' ? '✅ 있음' : '❌ 없음');
    console.log('  - openRevitTypeMatching:', typeof openRevitTypeMatching !== 'undefined' ? '✅ 있음' : '❌ 없음');
    console.log('  - selectSingleWallFromRevit:', typeof selectSingleWallFromRevit !== 'undefined' ? '✅ 있음' : '❌ 없음');
    
    // DOM 요소 확인
    console.log('🔍 주요 DOM 요소 확인:');
    console.log('  - materialManageBtn:', document.getElementById('materialManageBtn') ? '✅ 있음' : '❌ 없음');
    console.log('  - revitTypeMappingBtn:', document.getElementById('revitTypeMappingBtn') ? '✅ 있음' : '❌ 없음');
    console.log('  - wallTable:', document.getElementById('wallTable') ? '✅ 있음' : '❌ 없음');
    
    // 네트워크 상태 확인
    console.log('🔍 네트워크 상태:', navigator.onLine ? '✅ 온라인' : '❌ 오프라인');
    
    // 서버 연결 테스트
    testServerConnection();
    
    // 5초 후 상태 재확인
    setTimeout(checkAppStatus, 5000);
})();

async function testServerConnection() {
    console.log('🌐 서버 연결 테스트 시작...');
    
    try {
        // 헬스 체크
        const healthResponse = await fetch('/health');
        const healthData = await healthResponse.json();
        console.log('✅ 서버 상태:', healthData);
        
        // API 테스트
        const apiResponse = await fetch('/api');
        const apiData = await apiResponse.json();
        console.log('✅ API 정보:', apiData);
        
        // 벽체 데이터 테스트
        const wallsResponse = await fetch('/api/walls');
        const wallsData = await wallsResponse.json();
        console.log('✅ 벽체 데이터:', wallsData.success ? `${wallsData.data.length}개` : '실패');
        
        // 자재 데이터 테스트
        const materialsResponse = await fetch('/api/materials');
        const materialsData = await materialsResponse.json();
        console.log('✅ 자재 데이터:', materialsData.success ? `${materialsData.data.length}개` : '실패');
        
    } catch (error) {
        console.error('❌ 서버 연결 실패:', error);
    }
}

function checkAppStatus() {
    console.log('🔄 5초 후 상태 재확인...');
    
    // 애플리케이션 상태 확인
    if (window.kiyenoApp) {
        console.log('✅ Kiyeno 앱 상태:', window.kiyenoApp.isInitialized ? '초기화됨' : '초기화 중');
        console.log('✅ 벽체 데이터:', window.kiyenoApp.wallData?.length || 0, '개');
        console.log('✅ 로딩 상태:', window.kiyenoApp.isLoading ? '로딩 중' : '완료');
    }
    
    // 데이터베이스 상태 확인
    if (window.priceDB) {
        console.log('✅ 가격 DB 상태:', window.priceDB.isInitialized ? '초기화됨' : '초기화 중');
    }
    
    // 오류 확인
    const errors = [];
    if (typeof showMaterialManageModal === 'undefined') errors.push('showMaterialManageModal 함수 없음');
    if (typeof openRevitTypeMatching === 'undefined') errors.push('openRevitTypeMatching 함수 없음');
    if (!document.getElementById('materialManageBtn')) errors.push('materialManageBtn 요소 없음');
    
    if (errors.length > 0) {
        console.warn('⚠️ 발견된 문제:', errors);
    } else {
        console.log('✅ 모든 기본 요소 정상');
    }
}

// 버튼 클릭 테스트 함수
window.testButtons = function() {
    console.log('🧪 버튼 테스트 시작');
    
    const materialBtn = document.getElementById('materialManageBtn');
    const revitBtn = document.getElementById('revitTypeMappingBtn');
    
    if (materialBtn) {
        console.log('🧪 자재 관리 버튼 클릭 테스트');
        materialBtn.click();
    }
    
    setTimeout(() => {
        if (revitBtn) {
            console.log('🧪 Revit 타입 매칭 버튼 클릭 테스트');
            revitBtn.click();
        }
    }, 2000);
};

// 전역 함수로 노출
window.debugKiyeno = {
    testServerConnection,
    checkAppStatus,
    testButtons: window.testButtons
};

console.log('🔍 디버깅 도구 로드 완료 - window.debugKiyeno 사용 가능');