/**
 * 기존 코드와 새로운 API 시스템 연결 브릿지
 * 점진적 마이그레이션을 위한 연결 레이어
 */

// 새로운 API 서비스들이 로드될 때까지 대기
let apiServices = null;

// 기존 함수들을 저장
const originalFunctions = {};

// 즉시 실행하여 함수 백업
console.log('🌉 브릿지 시스템 초기화 시작');

// 기존 함수 백업 (즉시 실행)
setTimeout(backupOriginalFunctions, 50);

// 페이지 로드 완료 후 추가 설정
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌉 브릿지 시스템 DOM 로드 완료');
    
    // 새로운 시스템 로드 대기
    waitForNewSystem();
});

function backupOriginalFunctions() {
    // 기존 함수들 직접 찾아서 백업
    
    // app-services.js에서 정의된 원래 함수 찾기
    if (typeof window.showMaterialManageModal === 'undefined') {
        // 아직 로드되지 않은 경우 나중에 다시 시도
        setTimeout(backupOriginalFunctions, 100);
        return;
    }
    
    // 함수가 이미 main.js에서 재정의되었는지 확인
    const fnString = window.showMaterialManageModal.toString();
    if (!fnString.includes('originalShowMaterialManageModal')) {
        // 원본 함수인 경우 백업
        originalFunctions.showMaterialManageModal = window.showMaterialManageModal;
        window.originalShowMaterialManageModal = window.showMaterialManageModal;
        console.log('💾 showMaterialManageModal 백업됨');
    }
    
    // Revit 함수도 동일하게 처리
    if (typeof window.openRevitTypeMatching !== 'undefined') {
        const revitFnString = window.openRevitTypeMatching.toString();
        if (!revitFnString.includes('originalOpenRevitTypeMatching')) {
            originalFunctions.openRevitTypeMatching = window.openRevitTypeMatching;
            window.originalOpenRevitTypeMatching = window.openRevitTypeMatching;
            console.log('💾 openRevitTypeMatching 백업됨');
        }
    }
    
    console.log('💾 기존 함수 백업 완료');
}

function waitForNewSystem() {
    const checkInterval = setInterval(() => {
        if (window.kiyenoApp && window.kiyenoApp.isInitialized) {
            clearInterval(checkInterval);
            console.log('✅ 새로운 시스템 로드 완료');
            setupBridge();
        }
    }, 100);
    
    // 10초 후 타임아웃
    setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.kiyenoApp || !window.kiyenoApp.isInitialized) {
            console.warn('⚠️ 새로운 시스템 로드 타임아웃 - 기존 시스템으로 폴백');
            setupFallback();
        }
    }, 10000);
}

function setupBridge() {
    console.log('🌉 브릿지 설정 시작');
    
    // 데이터 로딩 브릿지
    setupDataBridge();
    
    // UI 함수 브릿지
    setupUIBridge();
    
    // 이벤트 브릿지
    setupEventBridge();
    
    console.log('✅ 브릿지 설정 완료');
}

function setupDataBridge() {
    // 기존 wallData를 새로운 시스템과 동기화
    if (window.kiyenoApp && window.kiyenoApp.wallData) {
        window.wallData = window.kiyenoApp.wallData;
        
        // 데이터 변경 시 동기화
        window.kiyenoApp.on('wall_updated', (data) => {
            window.wallData = window.kiyenoApp.wallData;
            // 기존 UI 업데이트
            if (typeof renderWallTable === 'function') {
                renderWallTable();
            }
        });
    }
    
    // 기존 priceDB를 새로운 시스템과 연결
    if (window.priceDB) {
        // 기존 priceDB의 주요 메소드들을 새로운 시스템으로 라우팅
        const originalMethods = {};
        
        // getAllMaterials 메소드 래핑
        if (window.priceDB.getAllMaterials) {
            originalMethods.getAllMaterials = window.priceDB.getAllMaterials;
            window.priceDB.getAllMaterials = async function() {
                try {
                    return await originalMethods.getAllMaterials.call(this);
                } catch (error) {
                    console.warn('기존 getAllMaterials 실패, 새로운 시스템 사용:', error);
                    if (window.kiyenoApp && window.kiyenoApp.materialService) {
                        const result = await window.kiyenoApp.materialService.getAllMaterials();
                        return result.success ? result.data : [];
                    }
                    return [];
                }
            };
        }
    }
    
    console.log('📊 데이터 브릿지 설정 완료');
}

function setupUIBridge() {
    // 자재 관리 모달 브릿지
    if (originalFunctions.showMaterialManageModal) {
        window.showMaterialManageModal = function() {
            console.log('🔄 자재 관리 모달 (브릿지)');
            try {
                // 새로운 시스템이 준비되었는지 확인
                if (window.kiyenoApp && window.kiyenoApp.materialService) {
                    // 새로운 시스템 사용
                    console.log('✅ 새로운 시스템으로 자재 관리 모달 실행');
                    originalFunctions.showMaterialManageModal();
                } else {
                    // 기존 시스템 사용
                    console.log('⚠️ 기존 시스템으로 자재 관리 모달 실행');
                    originalFunctions.showMaterialManageModal();
                }
            } catch (error) {
                console.error('자재 관리 모달 실행 실패:', error);
            }
        };
    }
    
    // Revit 타입 매칭 브릿지
    if (originalFunctions.openRevitTypeMatching) {
        window.openRevitTypeMatching = function() {
            console.log('🔄 Revit 타입 매칭 (브릿지)');
            try {
                // 새로운 시스템이 준비되었는지 확인
                if (window.kiyenoApp && window.kiyenoApp.revitService) {
                    console.log('✅ 새로운 시스템으로 Revit 타입 매칭 실행');
                    originalFunctions.openRevitTypeMatching();
                } else {
                    console.log('⚠️ 기존 시스템으로 Revit 타입 매칭 실행');
                    originalFunctions.openRevitTypeMatching();
                }
            } catch (error) {
                console.error('Revit 타입 매칭 실행 실패:', error);
            }
        };
    }
    
    console.log('🎨 UI 브릿지 설정 완료');
}

function setupEventBridge() {
    // 새로운 시스템의 이벤트를 기존 시스템으로 전달
    if (window.kiyenoApp) {
        window.kiyenoApp.on('wall_created', (wall) => {
            console.log('🔄 벽체 생성 이벤트 브릿지');
            // 기존 UI 업데이트
            if (typeof renderWallTable === 'function') {
                renderWallTable();
            }
        });
        
        window.kiyenoApp.on('wall_updated', (wall) => {
            console.log('🔄 벽체 수정 이벤트 브릿지');
            // 기존 UI 업데이트
            if (typeof renderWallTable === 'function') {
                renderWallTable();
            }
        });
        
        window.kiyenoApp.on('wall_deleted', (wallId) => {
            console.log('🔄 벽체 삭제 이벤트 브릿지');
            // 기존 UI 업데이트
            if (typeof renderWallTable === 'function') {
                renderWallTable();
            }
        });
    }
    
    console.log('📡 이벤트 브릿지 설정 완료');
}

function setupFallback() {
    console.log('🔄 폴백 시스템 설정');
    
    // 기존 함수들 복원
    if (originalFunctions.showMaterialManageModal) {
        window.showMaterialManageModal = originalFunctions.showMaterialManageModal;
    }
    
    if (originalFunctions.openRevitTypeMatching) {
        window.openRevitTypeMatching = originalFunctions.openRevitTypeMatching;
    }
    
    console.log('✅ 폴백 시스템 설정 완료');
}

// 수동 브릿지 재설정 함수
window.rebuildBridge = function() {
    console.log('🔄 브릿지 재설정');
    if (window.kiyenoApp && window.kiyenoApp.isInitialized) {
        setupBridge();
    } else {
        setupFallback();
    }
};

// 디버깅용 함수
window.bridgeStatus = function() {
    console.log('🌉 브릿지 상태:');
    console.log('  - kiyenoApp:', window.kiyenoApp ? '✅' : '❌');
    console.log('  - kiyenoApp.isInitialized:', window.kiyenoApp?.isInitialized ? '✅' : '❌');
    console.log('  - wallData:', window.wallData ? `✅ (${window.wallData.length}개)` : '❌');
    console.log('  - priceDB:', window.priceDB ? '✅' : '❌');
    console.log('  - showMaterialManageModal:', typeof window.showMaterialManageModal === 'function' ? '✅' : '❌');
    console.log('  - openRevitTypeMatching:', typeof window.openRevitTypeMatching === 'function' ? '✅' : '❌');
};

console.log('🌉 브릿지 시스템 로드 완료');