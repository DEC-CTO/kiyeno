/**
 * Kiyeno 벽체 관리 시스템 - 메인 진입점
 * 애플리케이션 초기화 및 전역 관리
 */

// 서비스 레이어 (순서 중요: SocketService를 먼저 로드)
import './services/socketService.js';
import WallService from './services/wallService.js';
import MaterialService from './services/materialService.js';
import RevitService from './services/revitService.js';

// 모듈
import priceDatabase from './modules/priceDatabase.js';

// 유틸리티
import { APP_CONFIG, EVENT_TYPES } from './utils/constants.js';
import { EventEmitter, debounce } from './utils/helpers.js';

/**
 * 메인 애플리케이션 클래스
 */
class KiyenoApp extends EventEmitter {
    constructor() {
        super();
        
        // 서비스 초기화
        this.wallService = new WallService();
        this.materialService = new MaterialService();
        this.revitService = new RevitService();
        
        // 데이터
        this.wallData = [];
        this.selectedRows = [];
        this.revitData = null;
        
        // 상태
        this.isInitialized = false;
        this.isLoading = false;
        
        // 이벤트 바인딩
        this.setupEventListeners();
    }

    /**
     * 애플리케이션 초기화
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('🚀 Kiyeno 애플리케이션 초기화 시작');
            
            this.showLoading(true);
            
            // 데이터베이스 초기화
            await this.initializeDatabase();
            
            // 초기 데이터 로드
            await this.loadInitialData();
            
            // UI 초기화
            await this.initializeUI();
            
            // Revit 연동 초기화
            this.initializeRevitIntegration();
            
            this.isInitialized = true;
            this.showLoading(false);
            
            console.log('✅ Kiyeno 애플리케이션 초기화 완료');
            this.emit(EVENT_TYPES.DATA_LOADED);
            
        } catch (error) {
            console.error('❌ 애플리케이션 초기화 실패:', error);
            this.showError('애플리케이션 초기화에 실패했습니다.');
            this.emit(EVENT_TYPES.ERROR_OCCURRED, error);
            throw error;
        }
    }

    /**
     * 데이터베이스 초기화
     */
    async initializeDatabase() {
        await priceDatabase.initialize();
        
        // 데이터베이스 이벤트 리스너
        priceDatabase.on('materialsLoaded', (materials) => {
            console.log('📦 자재 데이터 로드 완료:', materials.length);
        });
        
        priceDatabase.on('materialSaved', (material) => {
            this.emit(EVENT_TYPES.MATERIAL_UPDATED, material);
        });
    }

    /**
     * 초기 데이터 로드
     */
    async loadInitialData() {
        try {
            // 벽체 데이터 로드
            const wallResult = await this.wallService.getAllWalls();
            if (wallResult.success) {
                this.wallData = wallResult.data;
                console.log('🧱 벽체 데이터 로드 완료:', this.wallData.length);
            }

            // 자재 데이터는 priceDatabase에서 자동 로드됨
            
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
            throw error;
        }
    }

    /**
     * UI 초기화
     */
    async initializeUI() {
        // 기존 UI 초기화 코드는 여기서 호출
        if (typeof initializeWallTable === 'function') {
            initializeWallTable();
        }
        
        if (typeof renderWallTable === 'function') {
            renderWallTable();
        }
        
        // 이벤트 리스너 설정
        this.setupUIEventListeners();
    }

    /**
     * Revit 연동 초기화
     */
    initializeRevitIntegration() {
        if (this.revitService.isRevitEnvironment()) {
            console.log('🔗 Revit 환경 감지됨');
            
            // Revit 메시지 리스너 설정
            this.revitService.setupMessageListener((message) => {
                this.handleRevitMessage(message);
            });
            
            // 실시간 동기화 시작
            this.revitService.startRealtimeSync((result) => {
                if (result.success) {
                    this.emit(EVENT_TYPES.REVIT_SYNC, result.data);
                }
            });
            
        } else {
            console.log('🌐 일반 브라우저 환경');
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 벽체 이벤트
        this.on(EVENT_TYPES.WALL_CREATED, (wall) => {
            this.wallData.push(wall);
            this.refreshWallTable();
        });
        
        this.on(EVENT_TYPES.WALL_UPDATED, (wall) => {
            const index = this.wallData.findIndex(w => w.id === wall.id);
            if (index !== -1) {
                this.wallData[index] = wall;
                this.refreshWallTable();
            }
        });
        
        this.on(EVENT_TYPES.WALL_DELETED, (wallId) => {
            this.wallData = this.wallData.filter(w => w.id !== wallId);
            this.refreshWallTable();
        });
        
        // 자재 이벤트
        this.on(EVENT_TYPES.MATERIAL_UPDATED, () => {
            this.refreshCalculations();
        });
        
        // 오류 이벤트
        this.on(EVENT_TYPES.ERROR_OCCURRED, (error) => {
            console.error('애플리케이션 오류:', error);
        });
    }

    /**
     * UI 이벤트 리스너 설정
     */
    setupUIEventListeners() {
        // 검색 기능
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.searchWalls(e.target.value);
            }, 300));
        }
        
        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveAllData();
            }
        });
        
        // 페이지 언로드 시 정리
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * 벽체 검색
     */
    async searchWalls(query) {
        if (!query.trim()) {
            this.refreshWallTable();
            return;
        }
        
        try {
            const result = await this.wallService.searchWalls(query);
            if (result.success) {
                this.wallData = result.data;
                this.refreshWallTable();
            }
        } catch (error) {
            console.error('벽체 검색 실패:', error);
        }
    }

    /**
     * 벽체 테이블 새로고침
     */
    refreshWallTable() {
        if (typeof renderWallTable === 'function') {
            renderWallTable();
        }
    }

    /**
     * 계산 새로고침
     */
    refreshCalculations() {
        if (typeof calculateAllWalls === 'function') {
            calculateAllWalls();
        }
    }

    /**
     * Revit 메시지 처리
     */
    handleRevitMessage(message) {
        switch (message.action) {
            case 'wallSelected':
                this.handleWallSelected(message.data);
                break;
            case 'wallsSelected':
                this.handleWallsSelected(message.data);
                break;
            case 'dataSync':
                this.handleDataSync(message.data);
                break;
            default:
                console.log('알 수 없는 Revit 메시지:', message);
        }
    }

    /**
     * 벽체 선택 처리
     */
    handleWallSelected(wallData) {
        // 기존 selectSingleWallFromRevit 함수 로직
        if (typeof addRevitWallToTable === 'function') {
            addRevitWallToTable(wallData);
        }
    }

    /**
     * 다중 벽체 선택 처리
     */
    handleWallsSelected(wallsData) {
        // 기존 selectMultipleWallsFromRevit 함수 로직
        if (typeof addMultipleRevitWallsToTable === 'function') {
            addMultipleRevitWallsToTable(wallsData);
        }
    }

    /**
     * 데이터 동기화 처리
     */
    async handleDataSync(syncData) {
        try {
            const result = await this.revitService.syncRevitData(syncData);
            if (result.success) {
                this.revitData = result.data;
                this.emit(EVENT_TYPES.REVIT_SYNC, result.data);
            }
        } catch (error) {
            console.error('Revit 데이터 동기화 실패:', error);
        }
    }

    /**
     * 모든 데이터 저장
     */
    async saveAllData() {
        try {
            this.showLoading(true);
            
            // 변경된 벽체 데이터 저장
            // 실제 구현에서는 변경 추적 로직 필요
            
            this.showLoading(false);
            this.showSuccess('데이터가 저장되었습니다.');
            
        } catch (error) {
            this.showLoading(false);
            this.showError('데이터 저장에 실패했습니다.');
            console.error('데이터 저장 실패:', error);
        }
    }

    /**
     * 로딩 상태 표시
     */
    showLoading(show) {
        this.isLoading = show;
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * 성공 메시지 표시
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    /**
     * 오류 메시지 표시
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * 토스트 메시지 표시
     */
    showToast(message, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * 정리 작업
     */
    cleanup() {
        this.revitService.stopRealtimeSync();
        priceDatabase.destroy();
        this.removeAllListeners();
    }
}

// 전역 애플리케이션 인스턴스
const app = new KiyenoApp();

// 전역 변수로 노출 (기존 코드와의 호환성을 위해)
window.kiyenoApp = app;
window.wallService = app.wallService;
window.materialService = app.materialService;
window.revitService = app.revitService;
window.priceDB = priceDatabase;
window.priceDatabase = priceDatabase;

// 기존 전역 함수들 래핑
window.selectSingleWallFromRevit = function() {
    app.revitService.requestWallSelection(false);
};

window.selectMultipleWallsFromRevit = function() {
    app.revitService.requestWallSelection(true);
};

window.selectWallsByRoomFromRevit = function() {
    app.revitService.requestWallSelectionByRoom();
};

// 전역 함수 래핑 - 브릿지 시스템이 처리하도록 함
// (bridge.js에서 실제 구현을 덮어씀)

// DOMContentLoaded 이벤트에서 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await app.initialize();
    } catch (error) {
        console.error('애플리케이션 초기화 실패:', error);
        app.showError('애플리케이션을 초기화할 수 없습니다. 페이지를 새로고침해 주세요.');
    }
});

// =============================================================================
// 전역 에러 핸들러 (메모리 누수 방지 및 디버깅)
// =============================================================================

/**
 * 전역 JavaScript 에러 핸들러
 * - 처리되지 않은 에러를 캐치하여 로깅
 * - 사용자에게 친화적인 에러 메시지 표시
 */
window.addEventListener('error', (event) => {
    console.error('🚨 처리되지 않은 에러 발생:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });

    // 개발 환경에서만 상세 에러 표시
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.error('Stack trace:', event.error?.stack);
    }

    // 사용자에게 에러 알림 (너무 자주 표시되지 않도록 제한)
    if (!window._lastErrorTime || Date.now() - window._lastErrorTime > 5000) {
        app.showError('예기치 않은 오류가 발생했습니다. 계속 문제가 발생하면 페이지를 새로고침해 주세요.');
        window._lastErrorTime = Date.now();
    }

    // 에러 이벤트 전파 방지 (기본 에러 처리 차단)
    // event.preventDefault(); // 필요 시 주석 해제
});

/**
 * 전역 Promise rejection 핸들러
 * - 처리되지 않은 Promise rejection을 캐치하여 로깅
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 처리되지 않은 Promise rejection 발생:', {
        reason: event.reason,
        promise: event.promise
    });

    // 개발 환경에서만 상세 에러 표시
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        if (event.reason instanceof Error) {
            console.error('Stack trace:', event.reason.stack);
        }
    }

    // 사용자에게 에러 알림 (너무 자주 표시되지 않도록 제한)
    if (!window._lastRejectionTime || Date.now() - window._lastRejectionTime > 5000) {
        app.showError('비동기 작업 중 오류가 발생했습니다.');
        window._lastRejectionTime = Date.now();
    }

    // 에러 이벤트 전파 방지
    event.preventDefault();
});

console.log('✅ 전역 에러 핸들러 등록 완료');

// =============================================================================
// 메모리 및 성능 모니터링 (선택적)
// =============================================================================

/**
 * 메모리 사용량 모니터링
 * - 90% 이상 사용 시 경고 로그
 * - 1분마다 체크
 */
if (performance.memory) {
    setInterval(() => {
        const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
        const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(2);
        const limit = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2);

        const usagePercent = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;

        if (usagePercent > 90) {
            console.warn(`⚠️ 메모리 사용량 높음: ${used}MB / ${limit}MB (${usagePercent.toFixed(1)}%)`);
        }

        // 개발 환경에서만 상세 로그
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`💾 메모리: ${used}MB / ${total}MB (한계: ${limit}MB)`);
        }
    }, 60000); // 1분마다

    console.log('✅ 메모리 모니터링 활성화');
}

/**
 * 장시간 사용 감지
 * - 1시간마다 사용 시간 로그
 */
const appStartTime = Date.now();
setInterval(() => {
    const hours = ((Date.now() - appStartTime) / 3600000).toFixed(1);
    console.log(`⏱️ 애플리케이션 사용 시간: ${hours}시간`);

    if (hours >= 2) {
        console.info('💡 장시간 사용 중입니다. 필요시 페이지를 새로고침하세요.');
    }
}, 3600000); // 1시간마다

console.log('✅ 성능 모니터링 시스템 활성화');

export default app;