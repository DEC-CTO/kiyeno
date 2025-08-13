/**
 * Revit 연동 서비스 (WebSocket 기반)
 * WebSocket을 통한 실시간 Revit 연동을 담당
 */

import ApiService from './apiService.js';

class RevitService extends ApiService {
    constructor() {
        super();
        this.endpoint = '/revit';
        this.socketService = null;
        this.isRevitConnected = false;
        
        // WebSocket 서비스 초기화 대기
        this.initializeSocketService();
    }

    /**
     * SocketService 초기화
     */
    async initializeSocketService() {
        try {
            // SocketService 로드 대기
            if (typeof window.socketService !== 'undefined') {
                this.socketService = window.socketService;
                this.setupEventListeners();
                
                // WebSocket 연결 시작
                await this.socketService.connect();
            } else {
                // SocketService 로드 대기
                setTimeout(() => this.initializeSocketService(), 100);
            }
        } catch (error) {
            console.error('❌ SocketService 초기화 실패:', error);
        }
    }

    /**
     * WebSocket 이벤트 리스너 설정
     */
    setupEventListeners() {
        if (!this.socketService) return;

        // Revit 연결 상태 변경
        this.socketService.on('revit:connectionStatus', (data) => {
            this.isRevitConnected = data.connected;
            console.log(`🔗 Revit 연결 상태: ${this.isRevitConnected ? '연결됨' : '연결 안됨'}`);
        });

        // Revit 벽체 데이터 수신
        this.socketService.on('revit:wallData', (wallData) => {
            console.log('🏗️ Revit 벽체 데이터 수신:', wallData);
            this.handleWallDataReceived(wallData);
        });

        // WallType 생성 결과 수신
        this.socketService.on('revit:wallTypeResult', (results) => {
            console.log('🔧 WallType 생성 결과:', results);
            this.handleWallTypeResults(results);
        });

        // Revit 연결 해제
        this.socketService.on('revit:disconnected', () => {
            this.isRevitConnected = false;
            console.log('❌ Revit 연결 해제됨');
        });
    }

    /**
     * Revit 벽체 데이터 처리
     */
    handleWallDataReceived(wallData) {
        try {
            // 받은 벽체 데이터를 애플리케이션에 추가
            if (typeof window.addWallsFromRevit === 'function') {
                window.addWallsFromRevit(wallData);
            }

            // 사용자에게 알림
            if (wallData && wallData.length > 0) {
                this.showNotification(`${wallData.length}개의 벽체가 Revit에서 추가되었습니다.`, 'success');
            }
        } catch (error) {
            console.error('벽체 데이터 처리 오류:', error);
            this.showNotification('벽체 데이터 처리 중 오류가 발생했습니다.', 'error');
        }
    }

    /**
     * WallType 생성 결과 처리
     */
    handleWallTypeResults(results) {
        try {
            const successCount = results.filter(r => r.Success).length;
            const totalCount = results.length;
            
            if (successCount === totalCount) {
                this.showNotification(`${successCount}개의 WallType이 성공적으로 생성되었습니다.`, 'success');
            } else {
                this.showNotification(`${successCount}/${totalCount}개의 WallType이 생성되었습니다.`, 'warning');
            }

            // 결과 상세 표시 (선택적)
            console.table(results.map(r => ({
                이름: r.WallTypeName,
                성공: r.Success ? '✅' : '❌',
                메시지: r.Message
            })));
        } catch (error) {
            console.error('WallType 결과 처리 오류:', error);
        }
    }

    /**
     * 벽체 선택 (WebSocket)
     */
    async selectWall() {
        if (!this.checkConnection()) return false;
        
        console.log('📤 단일 벽체 선택 요청');
        return this.socketService.selectWall();
    }

    /**
     * 다중 벽체 선택 (WebSocket)
     */
    async selectMultipleWalls() {
        if (!this.checkConnection()) return false;
        
        console.log('📤 다중 벽체 선택 요청');
        return this.socketService.selectMultipleWalls();
    }

    /**
     * Revit 객체 선택 (WebSocket)
     */
    async selectElements(elementIds) {
        if (!this.checkConnection()) return false;
        
        console.log('📤 Revit 객체 선택 요청:', elementIds);
        return this.socketService.selectElements(elementIds);
    }

    /**
     * WallType 생성 (WebSocket)
     */
    async createWallTypes(wallTypesData, isSimpleMode = false) {
        if (!this.checkConnection()) return false;
        
        console.log('📤 WallType 생성 요청:', { count: wallTypesData.length, isSimpleMode });
        return this.socketService.createWallTypes(wallTypesData, isSimpleMode);
    }

    /**
     * Revit 정보 요청 (WebSocket)
     */
    async getRevitInfo() {
        if (!this.checkConnection()) return false;
        
        console.log('📤 Revit 정보 요청');
        return this.socketService.getRevitInfo();
    }

    /**
     * 연결 상태 확인
     */
    checkConnection() {
        if (!this.socketService || !this.socketService.isConnected) {
            this.showNotification('WebSocket이 연결되지 않았습니다.', 'error');
            return false;
        }
        
        if (!this.isRevitConnected) {
            this.showNotification('Revit이 연결되지 않았습니다.', 'error');
            return false;
        }
        
        return true;
    }

    /**
     * 알림 표시
     */
    showNotification(message, type = 'info') {
        // 기존 알림 시스템 사용하거나 새로운 알림 표시
        console.log(`🔔 [${type.toUpperCase()}] ${message}`);
        
        // Toast 알림 표시 (선택적)
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        }
    }

    // ========== 기존 API 기반 메서드들 (호환성 유지) ==========

    /**
     * Revit 데이터 동기화 (API)
     */
    async syncRevitData(revitData) {
        return await this.post(`${this.endpoint}/sync`, revitData);
    }

    /**
     * Revit 타입 매핑 조회 (API)
     */
    async getTypeMappings() {
        return await this.get(`${this.endpoint}/types`);
    }

    /**
     * Revit 타입 매핑 저장 (API)
     */
    async saveTypeMappings(mappings) {
        return await this.post(`${this.endpoint}/types`, mappings);
    }

    /**
     * Revit 데이터 내보내기 (API)
     */
    async exportToRevit(wallIds) {
        return await this.post(`${this.endpoint}/export`, { wallIds });
    }

    /**
     * Revit 데이터 가져오기 (API)
     */
    async importFromRevit(revitWalls) {
        return await this.post(`${this.endpoint}/import`, { revitWalls });
    }

    /**
     * Revit 연결 상태 확인 (API)
     */
    async checkRevitConnection() {
        return await this.get(`${this.endpoint}/status`);
    }

    /**
     * WebSocket을 통한 Revit 메시지 전송
     */
    sendMessageToRevit(message) {
        if (this.socketService && this.socketService.isConnected) {
            console.log('🔄 WebSocket으로 Revit 메시지 전송:', message);
            return this.socketService.sendRevitCommand(message.action, message.data);
        } else {
            console.warn('⚠️ WebSocket이 연결되지 않았습니다. 메시지 전송 불가');
            return false;
        }
    }

    /**
     * Revit에서 벽체 선택 요청
     */
    requestWallSelection(multiple = false) {
        const message = {
            action: multiple ? 'selectMultipleWalls' : 'selectWall',
            timestamp: new Date().toISOString()
        };

        return this.sendMessageToRevit(message);
    }

    /**
     * Revit에서 룸으로 벽체 선택 요청
     */
    requestWallSelectionByRoom() {
        const message = {
            action: 'selectWallsByRoom',
            timestamp: new Date().toISOString()
        };

        return this.sendMessageToRevit(message);
    }

    /**
     * Revit에서 벽체 생성 요청
     */
    requestWallCreation(wallData) {
        const message = {
            action: 'createWall',
            data: wallData,
            timestamp: new Date().toISOString()
        };

        return this.sendMessageToRevit(message);
    }

    /**
     * Revit에서 벽체 수정 요청
     */
    requestWallUpdate(wallId, wallData) {
        const message = {
            action: 'updateWall',
            wallId: wallId,
            data: wallData,
            timestamp: new Date().toISOString()
        };

        return this.sendMessageToRevit(message);
    }

    /**
     * WebSocket 기반 Revit 메시지 수신 리스너 등록
     */
    setupMessageListener(callback) {
        if (this.socketService) {
            // WebSocket 이벤트 리스너들이 이미 setupEventListeners()에서 설정됨
            console.log('✅ WebSocket 기반 Revit 메시지 리스너 활성화됨');
            return true;
        } else {
            console.warn('⚠️ SocketService가 초기화되지 않았습니다.');
            return false;
        }
    }

    /**
     * Revit 연결 상태 확인 (WebSocket 기반)
     */
    isRevitEnvironment() {
        return this.socketService && this.socketService.isConnected && this.isRevitConnected;
    }

    /**
     * Revit 데이터 형식 변환
     */
    convertToRevitFormat(kiyenoData) {
        return {
            id: kiyenoData.id,
            name: kiyenoData.name,
            type: kiyenoData.type,
            thickness: kiyenoData.thickness,
            materials: kiyenoData.materials,
            properties: {
                kiyenoId: kiyenoData.id,
                exportTime: new Date().toISOString(),
                version: kiyenoData.metadata?.version || 1
            }
        };
    }

    /**
     * Kiyeno 데이터 형식 변환
     */
    convertFromRevitFormat(revitData) {
        return {
            name: revitData.name || revitData.type,
            type: revitData.type,
            thickness: revitData.thickness || 0,
            materials: revitData.materials || {},
            revitId: revitData.id,
            revitProperties: revitData.properties || {},
            metadata: {
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                version: 1,
                source: 'revit'
            }
        };
    }

    /**
     * 실시간 동기화 시작 (WebSocket 기반)
     */
    startRealtimeSync(callback) {
        if (!this.socketService || !this.socketService.isConnected) {
            console.warn('WebSocket이 연결되지 않아 실시간 동기화를 시작할 수 없습니다.');
            return false;
        }

        console.log('✅ WebSocket 기반 실시간 동기화 시작');
        
        // WebSocket 이벤트 리스너는 이미 setupEventListeners()에서 설정됨
        // 동기화 콜백 저장
        this.syncCallback = callback;

        // 주기적 Revit 연결 상태 확인
        this.syncInterval = setInterval(() => {
            if (this.socketService && this.socketService.isConnected) {
                this.socketService.checkRevitConnection();
            }
        }, 30000); // 30초마다 확인

        return true;
    }

    /**
     * 실시간 동기화 중지
     */
    stopRealtimeSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
}

export default RevitService;