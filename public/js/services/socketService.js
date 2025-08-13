/**
 * WebSocket 연결 및 Revit 통신 서비스
 * Socket.IO를 사용한 실시간 Revit 연동
 */

class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.revitConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000; // 3초
        
        // 이벤트 리스너들
        this.eventListeners = new Map();
        
        console.log('🔌 SocketService 초기화');
    }

    /**
     * WebSocket 서버에 연결
     */
    async connect() {
        try {
            if (this.isConnected) {
                console.log('🔗 이미 연결되어 있습니다');
                return;
            }

            console.log('🔌 WebSocket 서버 연결 중...');
            
            // Socket.IO 클라이언트 로드 확인
            if (typeof io === 'undefined') {
                throw new Error('Socket.IO 클라이언트가 로드되지 않았습니다');
            }

            // Socket.IO 연결
            this.socket = io('http://localhost:3000', {
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true
            });

            this.setupEventHandlers();
            
        } catch (error) {
            console.error('❌ WebSocket 연결 실패:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * 이벤트 핸들러 설정
     */
    setupEventHandlers() {
        // 연결 성공
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('✅ WebSocket 연결 성공:', this.socket.id);
            
            // 연결 상태 UI 업데이트
            this.updateConnectionStatus(true);
            
            // Revit 연결 상태 확인
            this.checkRevitConnection();
            
            // 연결 이벤트 발생
            this.emit('connected');
        });

        // 연결 해제
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.revitConnected = false;
            console.log('❌ WebSocket 연결 해제');
            
            this.updateConnectionStatus(false);
            this.updateRevitStatus(false);
            
            this.emit('disconnected');
            this.scheduleReconnect();
        });

        // 연결 오류
        this.socket.on('connect_error', (error) => {
            console.error('🔥 WebSocket 연결 오류:', error);
            this.scheduleReconnect();
        });

        // Revit 상태 업데이트
        this.socket.on('revit:status', (data) => {
            console.log('📊 Revit 상태 업데이트:', data);
            this.revitConnected = data.connected;
            this.updateRevitStatus(this.revitConnected);
            this.emit('revit:status', data);
        });

        // Revit 연결 상태
        this.socket.on('revit:connectionStatus', (data) => {
            console.log('🔗 Revit 연결 상태:', data);
            this.revitConnected = data.connected;
            this.updateRevitStatus(this.revitConnected);
            this.emit('revit:connectionStatus', data);
        });

        // Revit 연결 해제
        this.socket.on('revit:disconnected', () => {
            console.log('❌ Revit 연결 해제');
            this.revitConnected = false;
            this.updateRevitStatus(false);
            this.emit('revit:disconnected');
        });

        // Revit 벽체 데이터 수신
        this.socket.on('revit:wallData', (data) => {
            console.log('🏗️ Revit 벽체 데이터 수신:', data);
            this.emit('revit:wallData', data);
        });

        // Revit WallType 생성 결과
        this.socket.on('revit:wallTypeResult', (data) => {
            console.log('🔧 WallType 생성 결과:', data);
            this.emit('revit:wallTypeResult', data);
        });

        // 일반 오류
        this.socket.on('error', (error) => {
            console.error('❌ Socket 오류:', error);
            this.emit('error', error);
        });
    }

    /**
     * Revit 연결 상태 확인
     */
    checkRevitConnection() {
        if (this.isConnected) {
            console.log('🔍 Revit 연결 상태 확인 중...');
            this.socket.emit('revit:checkConnection');
        }
    }

    /**
     * Revit 명령 전송
     */
    sendRevitCommand(action, data = null, isSimpleMode = false) {
        if (!this.isConnected) {
            console.warn('⚠️ WebSocket이 연결되지 않음');
            return false;
        }

        const command = {
            action: action,
            data: data,
            isSimpleMode: isSimpleMode,
            requestId: this.generateRequestId(),
            timestamp: new Date().toISOString()
        };

        console.log('📤 Revit 명령 전송:', command);
        this.socket.emit('revit:command', command);
        return true;
    }

    /**
     * 벽체 선택 요청
     */
    selectWall() {
        return this.sendRevitCommand('SELECT_WALL');
    }

    /**
     * 다중 벽체 선택 요청
     */
    selectMultipleWalls() {
        return this.sendRevitCommand('SELECT_MULTIPLE_WALLS');
    }

    /**
     * Revit 객체 선택 요청 (ElementID 배열)
     */
    selectElements(elementIds) {
        return this.sendRevitCommand('selectElements', { ElementIds: elementIds });
    }

    /**
     * WallType 생성 요청
     */
    createWallTypes(wallTypesData, isSimpleMode = false) {
        return this.sendRevitCommand('CREATE_WALL_TYPES', wallTypesData, isSimpleMode);
    }

    /**
     * Revit 정보 요청
     */
    getRevitInfo() {
        return this.sendRevitCommand('GET_REVIT_INFO');
    }

    /**
     * 연결 상태 UI 업데이트
     */
    updateConnectionStatus(connected) {
        const statusElement = document.querySelector('.connection-status');
        if (statusElement) {
            statusElement.textContent = connected ? '연결됨' : '연결 해제';
            statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
        }

        // 연결 상태 아이콘 업데이트
        const iconElement = document.querySelector('.connection-icon');
        if (iconElement) {
            iconElement.innerHTML = connected ? '🟢' : '🔴';
        }
    }

    /**
     * Revit 연결 상태 UI 업데이트
     */
    updateRevitStatus(connected) {
        console.log(`🔄 Revit 상태 업데이트: ${connected ? '연결됨' : '연결 해제'}`);
        
        // Revit 연동 버튼들 활성화/비활성화
        const revitButtons = document.querySelectorAll('.revit-button, [data-revit]');
        revitButtons.forEach(button => {
            if (connected) {
                button.disabled = false;
                button.classList.remove('disabled');
                button.style.opacity = '1';
                button.style.pointerEvents = 'auto';
            } else {
                button.disabled = true;
                button.classList.add('disabled');
                button.style.opacity = '0.5';
                button.style.pointerEvents = 'none';
            }
        });

        // Revit 상태 텍스트 업데이트
        const revitStatusElements = document.querySelectorAll('.revit-status, #revit-status');
        revitStatusElements.forEach(element => {
            element.textContent = connected ? 'Revit 연결됨' : 'Revit 연결 안됨';
            element.className = `revit-status ${connected ? 'connected' : 'disconnected'}`;
        });

        // Revit 연동 메뉴 업데이트
        const revitMenu = document.querySelector('#revit-integration-menu');
        if (revitMenu) {
            const menuText = revitMenu.querySelector('.dropdown-text');
            if (menuText) {
                menuText.textContent = connected ? 'Revit 연동' : 'Revit 연동 (비활성화)';
            }
        }
    }

    /**
     * 재연결 시도
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ 최대 재연결 시도 횟수 초과');
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${this.reconnectInterval/1000}초 후)`);

        setTimeout(() => {
            this.connect();
        }, this.reconnectInterval);
    }

    /**
     * 요청 ID 생성
     */
    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 이벤트 리스너 등록
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    /**
     * 이벤트 리스너 제거
     */
    off(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 이벤트 발생
     */
    emit(eventName, data) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`이벤트 콜백 오류 (${eventName}):`, error);
                }
            });
        }
    }

    /**
     * 연결 해제
     */
    disconnect() {
        if (this.socket) {
            console.log('🔌 WebSocket 연결 해제 중...');
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.revitConnected = false;
        this.updateConnectionStatus(false);
        this.updateRevitStatus(false);
    }

    /**
     * 연결 상태 확인
     */
    getConnectionStatus() {
        return {
            websocket: this.isConnected,
            revit: this.revitConnected,
            socketId: this.socket?.id || null
        };
    }
}

// 전역 SocketService 인스턴스
window.socketService = new SocketService();

export default window.socketService;