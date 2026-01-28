// =============================================================================
// Kiyeno 벽체 관리 시스템 - 일위대가 관리 모듈
// 일위대가 생성, 편집, 계산, 관리 전담 모듈
// =============================================================================

// =============================================================================
// 전역 변수
// =============================================================================
let unitPriceItems = []; // 일위대가 아이템 목록
let currentUnitPriceData = {}; // 현재 편집 중인 일위대가 데이터

// =============================================================================
// IndexedDB 일위대가 관리 클래스
// =============================================================================

class UnitPriceDB {
    constructor() {
        this.dbName = 'KiyenoMaterialsDB'; // 통합 DB 사용
        this.dbVersion = 3; // v2 → v3 업그레이드
        this.unitPricesStore = 'unitPrices';
        this.wallTypeMastersStore = 'wallTypeMasters';
    }

    // DB 초기화 및 업그레이드
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ UnitPriceDB 열기 실패');
                reject(request.error);
            };

            request.onsuccess = () => {
                console.log('✅ UnitPriceDB 연결 성공');
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log(`🔧 KiyenoMaterialsDB 통합 업그레이드: v${event.oldVersion} → v${event.newVersion}`);

                // v0 → v2: 기존 테이블들 (priceDatabase.js가 이미 처리)
                // 여기서는 v2 → v3 업그레이드만 처리

                // v2 → v3: 일위대가 및 벽체타입 테이블 추가
                if (event.oldVersion < 3) {
                    console.log('🔧 v3 업그레이드 시작: unitPrices와 wallTypeMasters 테이블 추가');
                    
                    // unitPrices 테이블 생성 (일위대가)
                    if (!db.objectStoreNames.contains('unitPrices')) {
                        const unitPricesStore = db.createObjectStore('unitPrices', {
                            keyPath: 'id',
                            autoIncrement: false
                        });

                        // 인덱스 추가
                        unitPricesStore.createIndex('itemName', 'basic.itemName', { unique: false });
                        unitPricesStore.createIndex('createdAt', 'createdAt', { unique: false });
                        unitPricesStore.createIndex('workType1', 'basic.workType1', { unique: false });

                        console.log('✅ unitPrices 테이블 생성 완료 (v3 통합 DB)');
                    }

                    // wallTypeMasters 테이블 생성 (벽체 타입 마스터)
                    if (!db.objectStoreNames.contains('wallTypeMasters')) {
                        const wallTypeStore = db.createObjectStore('wallTypeMasters', {
                            keyPath: 'id',
                            autoIncrement: false
                        });

                        // 인덱스 추가
                        wallTypeStore.createIndex('name', 'name', { unique: false });
                        wallTypeStore.createIndex('category', 'category', { unique: false });
                        wallTypeStore.createIndex('thickness', 'thickness', { unique: false });
                        wallTypeStore.createIndex('createdAt', 'createdAt', { unique: false });
                        wallTypeStore.createIndex('isTemplate', 'isTemplate', { unique: false });

                        console.log('✅ wallTypeMasters 테이블 생성 완료 (v3 통합 DB)');
                    }
                    
                    console.log('✅ v3 업그레이드 완료');
                }
            };
        });
    }

    // 일위대가 저장
    async saveUnitPrice(unitPriceData) {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.unitPricesStore], 'readwrite');
            const store = transaction.objectStore(this.unitPricesStore);

            // 타임스탬프 추가
            const now = new Date().toISOString();
            if (!unitPriceData.createdAt) {
                unitPriceData.createdAt = now;
            }
            unitPriceData.updatedAt = now;

            const request = store.put(unitPriceData);

            return new Promise((resolve, reject) => {
                // 트랜잭션 완료를 기다려야 함 (중요!)
                transaction.oncomplete = () => {
                    console.log(`✅ 일위대가 저장 완료 (트랜잭션 커밋됨): ${unitPriceData.id}`);
                    resolve(unitPriceData);
                };
                
                transaction.onerror = () => {
                    console.error('❌ 일위대가 저장 트랜잭션 실패:', transaction.error);
                    reject(transaction.error);
                };
                
                request.onerror = () => {
                    console.error('❌ 일위대가 저장 요청 실패:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('일위대가 저장 오류:', error);
            throw error;
        }
    }

    // 모든 일위대가 조회
    async getAllUnitPrices() {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.unitPricesStore], 'readonly');
            const store = transaction.objectStore(this.unitPricesStore);
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const unitPrices = request.result || [];
                    console.log(`✅ 일위대가 전체 조회 완료: ${unitPrices.length}개`);
                    resolve(unitPrices);
                };
                request.onerror = () => {
                    console.error('❌ 일위대가 조회 실패:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('일위대가 조회 오류:', error);
            throw error;
        }
    }

    // ID로 일위대가 조회
    async getUnitPriceById(id) {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.unitPricesStore], 'readonly');
            const store = transaction.objectStore(this.unitPricesStore);
            const request = store.get(id);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const unitPrice = request.result;
                    if (unitPrice) {
                        console.log(`✅ 일위대가 조회 완료: ${id}`);
                    } else {
                        console.warn(`⚠️ 일위대가를 찾을 수 없음: ${id}`);
                    }
                    resolve(unitPrice);
                };
                request.onerror = () => {
                    console.error('❌ 일위대가 조회 실패:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('일위대가 조회 오류:', error);
            throw error;
        }
    }

    // 일위대가 삭제
    async deleteUnitPrice(id) {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.unitPricesStore], 'readwrite');
            const store = transaction.objectStore(this.unitPricesStore);
            const request = store.delete(id);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`✅ 일위대가 삭제 완료: ${id}`);
                    resolve(true);
                };
                request.onerror = () => {
                    console.error('❌ 일위대가 삭제 실패:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('일위대가 삭제 오류:', error);
            throw error;
        }
    }

    // 검색
    async searchUnitPrices(query) {
        try {
            const allUnitPrices = await this.getAllUnitPrices();
            const filteredResults = allUnitPrices.filter(item => {
                const basic = item.basic || {};
                return (
                    basic.itemName?.toLowerCase().includes(query.toLowerCase()) ||
                    basic.workType1?.toLowerCase().includes(query.toLowerCase()) ||
                    basic.location?.toLowerCase().includes(query.toLowerCase())
                );
            });
            
            console.log(`🔍 일위대가 검색 완료: "${query}" - ${filteredResults.length}개 결과`);
            return filteredResults;
        } catch (error) {
            console.error('일위대가 검색 오류:', error);
            throw error;
        }
    }

    // JSON 내보내기
    async exportToJSON() {
        try {
            const allUnitPrices = await this.getAllUnitPrices();
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                unitPrices: allUnitPrices
            };
            
            console.log(`📤 JSON 내보내기 준비: ${allUnitPrices.length}개 일위대가`);
            return exportData;
        } catch (error) {
            console.error('JSON 내보내기 오류:', error);
            throw error;
        }
    }

    // JSON 가져오기
    async importFromJSON(jsonData) {
        try {
            const unitPrices = jsonData.unitPrices || [];
            let importedCount = 0;

            for (const unitPrice of unitPrices) {
                await this.saveUnitPrice(unitPrice);
                importedCount++;
            }

            console.log(`📥 JSON 가져오기 완료: ${importedCount}개 일위대가`);
            return importedCount;
        } catch (error) {
            console.error('JSON 가져오기 오류:', error);
            throw error;
        }
    }

    // localStorage 정리
    clearLocalStorage() {
        try {
            localStorage.removeItem('kiyeno_unitPriceItems');
            localStorage.removeItem('unitPriceData');
            console.log('🗑️ localStorage 일위대가 데이터 정리 완료');
        } catch (error) {
            console.error('localStorage 정리 실패:', error);
        }
    }

    // =============================================================================
    // 벽체 타입 마스터 관리 메서드들
    // =============================================================================

    // 벽체 타입 마스터 저장
    async saveWallTypeMaster(wallTypeData) {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.wallTypeMastersStore], 'readwrite');
            const store = transaction.objectStore(this.wallTypeMastersStore);

            // 기존 레코드 확인 (createdAt 보존용)
            const existingRecord = await new Promise((resolve, reject) => {
                const getRequest = store.get(wallTypeData.id);
                getRequest.onsuccess = () => resolve(getRequest.result);
                getRequest.onerror = () => resolve(null); // 에러 시 null 반환
            });

            // 타임스탬프 처리 (기존 createdAt 보존)
            const now = new Date().toISOString();
            if (existingRecord && existingRecord.createdAt) {
                wallTypeData.createdAt = existingRecord.createdAt; // 기존 생성일시 보존
                console.log(`🔄 기존 레코드 업데이트: ${wallTypeData.id} (생성일시 보존: ${existingRecord.createdAt})`);
            } else {
                wallTypeData.createdAt = now; // 새 레코드
                console.log(`🆕 새 레코드 생성: ${wallTypeData.id}`);
            }
            wallTypeData.updatedAt = now;

            const request = store.put(wallTypeData);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`✅ 벽체 타입 마스터 저장 완료: ${wallTypeData.id}`);
                    resolve(wallTypeData);
                };
                request.onerror = () => {
                    console.error('❌ 벽체 타입 마스터 저장 실패:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('벽체 타입 마스터 저장 오류:', error);
            throw error;
        }
    }

    // 모든 벽체 타입 마스터 조회
    async getAllWallTypeMasters() {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.wallTypeMastersStore], 'readonly');
            const store = transaction.objectStore(this.wallTypeMastersStore);
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`✅ 벽체 타입 마스터 조회 완료: ${request.result.length}개`);
                    resolve(request.result);
                };
                request.onerror = () => {
                    console.error('❌ 벽체 타입 마스터 조회 실패:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('벽체 타입 마스터 조회 오류:', error);
            throw error;
        }
    }

    // 특정 벽체 타입 마스터 조회
    async getWallTypeMasterById(id) {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.wallTypeMastersStore], 'readonly');
            const store = transaction.objectStore(this.wallTypeMastersStore);
            const request = store.get(id);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`✅ 벽체 타입 마스터 조회 완료: ${id}`);
                    resolve(request.result);
                };
                request.onerror = () => {
                    console.error('❌ 벽체 타입 마스터 조회 실패:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('벽체 타입 마스터 조회 오류:', error);
            throw error;
        }
    }

    // 이름으로 벽체 타입 마스터 검색
    async getWallTypeMastersByName(name) {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.wallTypeMastersStore], 'readonly');
            const store = transaction.objectStore(this.wallTypeMastersStore);
            const index = store.index('name');
            const request = index.getAll(name);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`✅ 벽체 타입 마스터 이름 검색 완료: ${name} - ${request.result.length}개`);
                    resolve(request.result);
                };
                request.onerror = () => {
                    console.error('❌ 벽체 타입 마스터 검색 실패:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('벽체 타입 마스터 검색 오류:', error);
            throw error;
        }
    }

    // 벽체 타입 마스터 삭제
    async deleteWallTypeMaster(id) {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.wallTypeMastersStore], 'readwrite');
            const store = transaction.objectStore(this.wallTypeMastersStore);
            const request = store.delete(id);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`✅ 벽체 타입 마스터 삭제 완료: ${id}`);
                    resolve(true);
                };
                request.onerror = () => {
                    console.error('❌ 벽체 타입 마스터 삭제 실패:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('벽체 타입 마스터 삭제 오류:', error);
            throw error;
        }
    }

    // 벽체 타입 마스터 검색 (복합 조건)
    async searchWallTypeMasters(query) {
        try {
            const allWallTypes = await this.getAllWallTypeMasters();
            const filteredResults = allWallTypes.filter(item => {
                return (
                    item.name?.toLowerCase().includes(query.toLowerCase()) ||
                    item.category?.toLowerCase().includes(query.toLowerCase()) ||
                    item.description?.toLowerCase().includes(query.toLowerCase()) ||
                    item.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
                );
            });
            
            console.log(`✅ 벽체 타입 마스터 검색 완료: "${query}" - ${filteredResults.length}개`);
            return filteredResults;
        } catch (error) {
            console.error('벽체 타입 마스터 검색 오류:', error);
            throw error;
        }
    }
}

// 전역 인스턴스 생성
const unitPriceDB = new UnitPriceDB();

// =============================================================================
// 일위대가 관리 메인 함수들
// =============================================================================

// 일위대가 관리 모달 닫기 (우측 상단 X 버튼용)
function closeUnitPriceManagementModal() {
    // 모달 닫기 전 세션 저장
    saveUnitPriceSession();

    // 서브 모달 찾아서 닫기
    const subModal = document.querySelector('.sub-modal-overlay');
    if (subModal && typeof closeSubModal === 'function') {
        closeSubModal(subModal);
    }
}

// 전역 함수로 노출
window.closeUnitPriceManagementModal = closeUnitPriceManagementModal;

// 일위대가 기본 정보 모달 닫기 함수
function closeUnitPriceBasicModal() {
    const subModal = document.querySelector('.sub-modal-overlay');
    if (subModal && typeof closeSubModal === 'function') {
        closeSubModal(subModal);
    }
}
window.closeUnitPriceBasicModal = closeUnitPriceBasicModal;

// 세부 아이템 수정 모달 닫기 함수
function closeUnitPriceDetailModal() {
    const subModal = document.querySelector('.sub-modal-overlay');
    if (subModal && typeof closeSubModal === 'function') {
        closeSubModal(subModal);
    }

    // 일위대가 관리로 돌아가기
    setTimeout(() => {
        // 혹시 있을 수 있는 자재선택 모달 제거
        const materialSelectModal = document.querySelector('.material-select-modal');
        if (materialSelectModal) materialSelectModal.remove();

        // 항상 일위대가 관리 모달 열기
        if (typeof window.openUnitPriceManagement === 'function') {
            window.openUnitPriceManagement();
            console.log('✅ 닫기 → 일위대가 관리 복귀');
        }
    }, 100);
}
window.closeUnitPriceDetailModal = closeUnitPriceDetailModal;

// 일위대가 관리 모달 열기
async function openUnitPriceManagement() {
    try {
        console.log('💰 일위대가 관리 모달 열기 시작');
        console.log('📊 현재 DOM 상태 - 모달 개수:', document.querySelectorAll('[class*="modal"]').length);

        // 모달 열기 시 최신 자재 데이터 캐시 강제 로드
        if (window.priceDatabase) {
            // 캐시 무효화
            window.priceDatabase.lightweightItemsCache = null;
            window.priceDatabase.gypsumItemsCache = null;

            // 최신 데이터 로드
            await window.priceDatabase.getLightweightComponents();
            await window.priceDatabase.getGypsumBoards();

            console.log('✅ 자재 데이터 캐시 갱신 완료');
        }

        // createSubModal 함수 존재 여부 확인
        if (typeof createSubModal !== 'function') {
            console.error('❌ createSubModal 함수를 찾을 수 없습니다.');
            alert('모달 시스템을 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
            return;
        }

        // 모달 HTML 생성
        console.log('🏗️ 모달 HTML 생성 중...');
        const modalHTML = createUnitPriceManagementModal();
        console.log('✅ 모달 HTML 생성 완료');

        // 모달 표시 (하단 버튼 없이, 우측 상단 X 버튼 사용)
        console.log('🖼️ createSubModal 호출 시작...');
        const modal = createSubModal('💰 일위대가 관리', modalHTML, [], {
            disableBackgroundClick: true,
            disableEscapeKey: true,
            width: '1300px'
        });

        console.log('🔍 createSubModal 완료 - modal 객체:', modal);
        console.log('📊 createSubModal 완료 후 DOM 모달 개수:', document.querySelectorAll('[class*="modal"]').length);

        if (modal) {
            console.log('✅ 모달 객체가 생성됨');
            // 모달이 DOM에 추가된 후 초기화
            setTimeout(async () => {
                try {
                    await loadUnitPriceItems();
                    await renderUnitPriceItemsList();

                    // 세션 복원 시도 (모달이 닫힌 후 재열기 시)
                    const sessionRestored = restoreUnitPriceSession();

                    // 일위대가 목록 렌더링 완료 후 메인 모달 데이터 동기화
                    setTimeout(async () => {
                        try {
                            await syncMainModalData();
                            if (sessionRestored) {
                                console.log('✅ 세션 복원 및 메인 모달 데이터 동기화 완료');
                            } else {
                                console.log('✅ 메인 모달 데이터 동기화 완료');
                            }
                        } catch (syncError) {
                            console.error('❌ 메인 모달 데이터 동기화 실패:', syncError);
                        }
                    }, 200);
                } catch (initError) {
                    console.error('❌ 모달 초기화 실패:', initError);
                    alert('일위대가 데이터 로드 중 오류가 발생했습니다: ' + initError.message);
                }
            }, 100);
        } else {
            console.error('❌ 모달 객체가 생성되지 않음');
        }

        console.log('🏁 openUnitPriceManagement 함수 완료');
    } catch (error) {
        console.error('❌ 일위대가 관리 모달 열기 실패:', error);
        alert('일위대가 관리 모달을 열 수 없습니다: ' + error.message);
    }
}

// 일위대가 관리 모달 HTML 생성
function createUnitPriceManagementModal() {
    return `
        <div class="unit-price-management-container">
            <!-- 헤더: 우측 상단 닫기 버튼 -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
                <button class="modal-close-btn" onclick="closeUnitPriceManagementModal()" title="닫기" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 5px 10px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- 컨트롤 버튼 -->
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                <button onclick="openUnitPriceBasicModal()" style="padding: 6px 14px; font-size: 12px; font-weight: 500; border: none; border-radius: 4px; cursor: pointer; background: #475569; color: white; display: inline-flex; align-items: center; gap: 6px;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">
                    <i class="fas fa-plus"></i> 새 일위대가 추가
                </button>
                <button onclick="loadUnitPriceDataFromDB()" style="padding: 6px 14px; font-size: 12px; font-weight: 500; border: none; border-radius: 4px; cursor: pointer; background: #475569; color: white; display: inline-flex; align-items: center; gap: 6px;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">
                    <i class="fas fa-sync-alt"></i> DB에서 로드
                </button>
                <button onclick="exportUnitPriceData()" style="padding: 6px 14px; font-size: 12px; font-weight: 500; border: none; border-radius: 4px; cursor: pointer; background: #475569; color: white; display: inline-flex; align-items: center; gap: 6px;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">
                    <i class="fas fa-download"></i> 데이터 내보내기
                </button>
                <button onclick="importUnitPriceData()" style="padding: 6px 14px; font-size: 12px; font-weight: 500; border: none; border-radius: 4px; cursor: pointer; background: #475569; color: white; display: inline-flex; align-items: center; gap: 6px;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">
                    <i class="fas fa-upload"></i> 데이터 가져오기
                </button>
            </div>
            
            <!-- 일위대가 목록 -->
            <div class="unit-price-list-container">
                <h4><i class="fas fa-list"></i> 일위대가 목록</h4>
                <div id="unitPriceItemsList" class="unit-price-items-grid">
                    <!-- 동적으로 생성되는 일위대가 아이템들 -->
                </div>
            </div>
        </div>
    `;
}

// 기본 정보 입력 모달 열기
function openUnitPriceBasicModal(editData = null) {
    // 현재 일위대가 관리 모달 닫기
    if (!editData) { // 새 일위대가 추가인 경우만 (수정은 이미 editUnitPriceItem에서 닫음)
        closeCurrentModal();
        // 딜레이를 주고 새 모달 열기
        setTimeout(() => {
            showUnitPriceBasicModal(editData);
        }, 300);
        return;
    }
    
    showUnitPriceBasicModal(editData);
}

function showUnitPriceBasicModal(editData = null) {
    const isEdit = editData !== null;
    const modalTitle = isEdit ? '일위대가 수정' : '새 일위대가 추가';

    // 아이템명 옵션 목록
    const itemNameOptions = ['C-STUD', 'CH-STUD', '그라스울', '런너', 'J런너', '일반석고보드', '방수석고보드', '방화석고보드', '차음석고보드'];
    const spacingOptions = ['@300', '@400', '@450', '@600', '3*6', '24K*50T'];
    const heightOptions = ['3600이하', '3600이상'];
    const workTypeOptions = ['경량', '건자재'];

    // SIZE 옵션 (그룹화)
    const sizeOptionsStuds = ['50형', '60형', '65형', '70형', '75형', '80형', '90형', '100형', '102형', '110형', '120형', '125형', '127형', '130형', '140형', '150형', '152형', '160형', '200형'];
    const sizeOptionsBoards = ['9.5T*1PLY', '12.5T*1PLY', '15T*1PLY', '9.5T*3*8*1PLY', '12.5T*3*8*1PLY', '15T*3*8*1PLY', '12.5T*4*8*1PLY', '15T*4*8*1PLY', '19T*1PLY', '25T*2*6*1PLY'];
    const sizeOptionsEtc = ['24K*50T'];
    const allSizeOptions = [...sizeOptionsStuds, ...sizeOptionsBoards, ...sizeOptionsEtc];

    // 현재 값이 드롭다운에 없는 커스텀 값인지 확인
    const currentItemName = editData?.basic?.itemName || '';
    const currentSpacing = editData?.basic?.spacing || '';
    const currentHeight = editData?.basic?.height || '';
    const currentSize = editData?.basic?.size || '';

    const isCustomItemName = currentItemName && !itemNameOptions.includes(currentItemName);
    const isCustomSpacing = currentSpacing && !spacingOptions.includes(currentSpacing);
    const isCustomHeight = currentHeight && !heightOptions.includes(currentHeight);
    const isCustomSize = currentSize && !allSizeOptions.includes(currentSize);

    const basicModalHTML = `
        <style>
            .unit-price-basic-form .form-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                padding: 20px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
            }

            .unit-price-basic-form .form-group {
                display: flex;
                flex-direction: column;
            }

            .unit-price-basic-form .form-group label {
                font-weight: 600;
                margin-bottom: 6px;
                color: #475569;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .unit-price-basic-form .form-group select,
            .unit-price-basic-form .form-group input {
                padding: 8px 10px;
                border: 1px solid #cbd5e1;
                border-radius: 4px;
                font-size: 13px;
                transition: all 0.2s;
                font-family: inherit;
                background: white;
                color: #1e293b;
            }

            .unit-price-basic-form .form-group select:focus,
            .unit-price-basic-form .form-group input:focus {
                outline: none;
                border-color: #64748b;
                box-shadow: 0 0 0 2px rgba(100, 116, 139, 0.15);
            }

            .unit-price-basic-form .form-group input[readonly] {
                background-color: #f1f5f9;
                color: #64748b;
                cursor: not-allowed;
                border-color: #e2e8f0;
            }

            .unit-price-basic-form .required {
                color: #ef4444;
                margin-left: 2px;
                font-weight: 700;
            }

            .unit-price-basic-form select {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%2364748b' d='M8 11L3 6h10z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 8px center;
                background-size: 12px;
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                padding-right: 28px;
                cursor: pointer;
            }

            .unit-price-basic-form select:hover {
                border-color: #94a3b8;
            }

            .unit-price-basic-form optgroup {
                font-weight: 700;
                color: #1e293b;
                background: #f1f5f9;
                font-size: 12px;
            }

            .unit-price-basic-form option {
                padding: 6px 10px;
                font-size: 13px;
            }

            .unit-price-basic-form option[data-custom="true"] {
                background-color: #f1f5f9;
                font-weight: 600;
                color: #475569;
            }

            .custom-input-wrapper {
                display: flex;
                gap: 6px;
                align-items: center;
            }

            .custom-input-wrapper input {
                flex: 1;
            }

            .custom-input-wrapper button {
                padding: 8px 12px;
                background: #475569;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                white-space: nowrap;
                font-size: 12px;
                transition: background 0.2s;
            }

            .custom-input-wrapper button:hover {
                background: #334155;
            }
            .unit-price-basic-modal-header {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 4px;
            }

            .unit-price-basic-modal-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #94a3b8;
                padding: 4px 8px;
                transition: color 0.2s;
                border-radius: 4px;
            }

            .unit-price-basic-modal-close:hover {
                color: #1e293b;
                background: #f1f5f9;
            }
        </style>

        <div class="unit-price-basic-modal-header">
            <button class="unit-price-basic-modal-close" onclick="closeUnitPriceBasicModal()" title="닫기">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="unit-price-basic-form">
            <div class="form-grid">
                <!-- 아이템명 -->
                <div class="form-group" id="itemNameGroup">
                    <label>아이템 <span class="required">*</span></label>
                    ${isCustomItemName ? `
                        <div class="custom-input-wrapper">
                            <input type="text" id="itemName" placeholder="직접 입력" value="${currentItemName}" required>
                            <button type="button" onclick="window.resetItemNameToSelect()">
                                <i class="fas fa-undo"></i> 목록
                            </button>
                        </div>
                    ` : `
                        <select id="itemName" required>
                            <option value="">선택하세요</option>
                            ${itemNameOptions.map(item => `<option value="${item}" ${currentItemName === item ? 'selected' : ''}>${item}</option>`).join('')}
                            <option value="CUSTOM_INPUT" data-custom="true">✏️ 직접 입력하기</option>
                        </select>
                    `}
                </div>

                <!-- 간격 -->
                <div class="form-group" id="spacingGroup">
                    <label>간격 <span class="required">*</span></label>
                    ${isCustomSpacing ? `
                        <div class="custom-input-wrapper">
                            <input type="text" id="spacing" placeholder="직접 입력" value="${currentSpacing}" required>
                            <button type="button" onclick="window.resetSpacingToSelect()">
                                <i class="fas fa-undo"></i> 목록
                            </button>
                        </div>
                    ` : `
                        <select id="spacing" required>
                            <option value="">선택하세요</option>
                            ${spacingOptions.map(spacing => `<option value="${spacing}" ${currentSpacing === spacing ? 'selected' : ''}>${spacing}</option>`).join('')}
                            <option value="CUSTOM_INPUT" data-custom="true">✏️ 직접 입력하기</option>
                        </select>
                    `}
                </div>

                <!-- 높이 -->
                <div class="form-group" id="heightGroup">
                    <label>높이 <span class="required">*</span></label>
                    ${isCustomHeight ? `
                        <div class="custom-input-wrapper">
                            <input type="text" id="height" placeholder="직접 입력" value="${currentHeight}" required>
                            <button type="button" onclick="window.resetHeightToSelect()">
                                <i class="fas fa-undo"></i> 목록
                            </button>
                        </div>
                    ` : `
                        <select id="height" required>
                            <option value="">선택하세요</option>
                            ${heightOptions.map(height => `<option value="${height}" ${currentHeight === height ? 'selected' : ''}>${height}</option>`).join('')}
                            <option value="CUSTOM_INPUT" data-custom="true">✏️ 직접 입력하기</option>
                        </select>
                    `}
                </div>

                <!-- SIZE -->
                <div class="form-group" id="sizeGroup">
                    <label>SIZE <span class="required">*</span></label>
                    ${isCustomSize ? `
                        <div class="custom-input-wrapper">
                            <input type="text" id="size" placeholder="직접 입력" value="${currentSize}" required>
                            <button type="button" onclick="window.resetSizeToSelect()">
                                <i class="fas fa-undo"></i> 목록
                            </button>
                        </div>
                    ` : `
                        <select id="size" required>
                            <option value="">선택하세요</option>
                            <optgroup label="스터드 규격">
                                ${sizeOptionsStuds.map(size => `<option value="${size}" ${currentSize === size ? 'selected' : ''}>${size}</option>`).join('')}
                            </optgroup>
                            <optgroup label="석고보드 규격">
                                ${sizeOptionsBoards.map(size => `<option value="${size}" ${currentSize === size ? 'selected' : ''}>${size}</option>`).join('')}
                            </optgroup>
                            <optgroup label="기타">
                                ${sizeOptionsEtc.map(size => `<option value="${size}" ${currentSize === size ? 'selected' : ''}>${size}</option>`).join('')}
                            </optgroup>
                            <option value="CUSTOM_INPUT" data-custom="true">✏️ 직접 입력하기</option>
                        </select>
                    `}
                </div>

                <!-- 부위 (고정값) -->
                <div class="form-group">
                    <label>부위 <span class="required">*</span></label>
                    <input type="text" id="location" value="벽체" readonly>
                </div>

                <!-- UNIT -->
                <div class="form-group">
                    <label>UNIT <span class="required">*</span></label>
                    <select id="unit" required>
                        <option value="">선택하세요</option>
                        <option value="M2" ${editData?.basic?.unit === 'M2' ? 'selected' : ''}>M2</option>
                        <option value="M" ${editData?.basic?.unit === 'M' ? 'selected' : ''}>M</option>
                    </select>
                </div>

                <!-- 공종1 -->
                <div class="form-group">
                    <label>공종1 <span class="required">*</span></label>
                    <select id="workType1" required>
                        <option value="">선택하세요</option>
                        ${workTypeOptions.map(type => `<option value="${type}" ${editData?.basic?.workType1 === type ? 'selected' : ''}>${type}</option>`).join('')}
                    </select>
                </div>

                <!-- 공종2 -->
                <div class="form-group">
                    <label>공종2</label>
                    <select id="workType2">
                        <option value="">선택하세요</option>
                        ${workTypeOptions.map(type => `<option value="${type}" ${editData?.basic?.workType2 === type ? 'selected' : ''}>${type}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- 버튼들은 createSubModal에서 처리 -->
        </div>
    `;
    
    // 현재 편집 중인 데이터 저장
    if (editData) {
        currentUnitPriceData = JSON.parse(JSON.stringify(editData));
    } else {
        currentUnitPriceData = {};
    }
    
    // 기본 정보 입력 모달 표시 (세부 설정 버튼만 - 닫기는 상단 X 버튼 사용)
    const modal = createSubModal(modalTitle, basicModalHTML, [
        { text: isEdit ? '수정 계속' : '세부 설정', class: 'btn-primary', onClick: (modal) => proceedToDetailInput(isEdit) }
    ], {
        disableBackgroundClick: true,
        disableEscapeKey: true,
        width: '1300px'
    });

    // 모달이 열린 후 이벤트 리스너 등록
    setTimeout(() => {
        const spacingSelect = document.getElementById('spacing');
        const heightSelect = document.getElementById('height');
        const sizeSelect = document.getElementById('size');

        // 아이템명 select 이벤트 리스너 등록 (공통 함수 사용)
        attachItemNameSelectListener();

        // 간격 select 이벤트
        if (spacingSelect && spacingSelect.tagName === 'SELECT') {
            spacingSelect.addEventListener('change', function(e) {
                if (e.target.value === 'CUSTOM_INPUT') {
                    const spacingGroup = document.getElementById('spacingGroup');
                    spacingGroup.innerHTML = `
                        <label>간격 <span class="required">*</span></label>
                        <div class="custom-input-wrapper">
                            <input type="text" id="spacing" placeholder="직접 입력" value="" required>
                            <button type="button" onclick="window.resetSpacingToSelect()">
                                <i class="fas fa-undo"></i> 목록
                            </button>
                        </div>
                    `;
                    document.getElementById('spacing').focus();
                }
            });
        }

        // 높이 select 이벤트
        if (heightSelect && heightSelect.tagName === 'SELECT') {
            heightSelect.addEventListener('change', function(e) {
                if (e.target.value === 'CUSTOM_INPUT') {
                    const heightGroup = document.getElementById('heightGroup');
                    heightGroup.innerHTML = `
                        <label>높이 <span class="required">*</span></label>
                        <div class="custom-input-wrapper">
                            <input type="text" id="height" placeholder="직접 입력" value="" required>
                            <button type="button" onclick="window.resetHeightToSelect()">
                                <i class="fas fa-undo"></i> 목록
                            </button>
                        </div>
                    `;
                    document.getElementById('height').focus();
                }
            });
        }

        // SIZE select 이벤트
        if (sizeSelect && sizeSelect.tagName === 'SELECT') {
            sizeSelect.addEventListener('change', function(e) {
                if (e.target.value === 'CUSTOM_INPUT') {
                    const sizeGroup = document.getElementById('sizeGroup');
                    sizeGroup.innerHTML = `
                        <label>SIZE <span class="required">*</span></label>
                        <div class="custom-input-wrapper">
                            <input type="text" id="size" placeholder="직접 입력" value="" required>
                            <button type="button" onclick="window.resetSizeToSelect()">
                                <i class="fas fa-undo"></i> 목록
                            </button>
                        </div>
                    `;
                    document.getElementById('size').focus();
                }
            });
        }
    }, 100);
}

// 아이템명 select 변경 이벤트 핸들러 (공통 함수)
function attachItemNameSelectListener() {
    const itemNameSelect = document.getElementById('itemName');
    const itemNameGroup = document.getElementById('itemNameGroup');

    if (!itemNameSelect || itemNameSelect.tagName !== 'SELECT') return;

    itemNameSelect.addEventListener('change', function(e) {
        if (e.target.value === 'CUSTOM_INPUT') {
            itemNameGroup.innerHTML = `
                <label>아이템 <span class="required">*</span></label>
                <div class="custom-input-wrapper">
                    <input type="text" id="itemName" placeholder="직접 입력" value="" required>
                    <button type="button" onclick="window.resetItemNameToSelect()">
                        <i class="fas fa-undo"></i> 목록
                    </button>
                </div>
            `;
            document.getElementById('itemName').focus();
        }
    });
}

// 아이템명을 select로 되돌리기 (전역 함수)
window.resetItemNameToSelect = function() {
    const itemNameGroup = document.getElementById('itemNameGroup');
    const itemNameOptions = ['C-STUD', 'CH-STUD', '그라스울', '런너', 'J런너', '일반석고보드', '방수석고보드', '방화석고보드', '차음석고보드'];

    if (!itemNameGroup) return;

    itemNameGroup.innerHTML = `
        <label>아이템 <span class="required">*</span></label>
        <select id="itemName" required>
            <option value="">선택하세요</option>
            ${itemNameOptions.map(item => `<option value="${item}">${item}</option>`).join('')}
            <option value="CUSTOM_INPUT" data-custom="true">✏️ 직접 입력하기</option>
        </select>
    `;

    // 공통 함수 사용하여 이벤트 리스너 등록
    attachItemNameSelectListener();
};

// 간격을 select로 되돌리기 (전역 함수)
window.resetSpacingToSelect = function() {
    const spacingGroup = document.getElementById('spacingGroup');
    const spacingOptions = ['@300', '@400', '@450', '@600', '3*6', '24K*50T'];

    if (!spacingGroup) return;

    spacingGroup.innerHTML = `
        <label>간격 <span class="required">*</span></label>
        <select id="spacing" required>
            <option value="">선택하세요</option>
            ${spacingOptions.map(spacing => `<option value="${spacing}">${spacing}</option>`).join('')}
            <option value="CUSTOM_INPUT" data-custom="true">✏️ 직접 입력하기</option>
        </select>
    `;

    const spacingSelect = document.getElementById('spacing');
    spacingSelect.addEventListener('change', function(e) {
        if (e.target.value === 'CUSTOM_INPUT') {
            spacingGroup.innerHTML = `
                <label>간격 <span class="required">*</span></label>
                <div class="custom-input-wrapper">
                    <input type="text" id="spacing" placeholder="직접 입력" value="" required>
                    <button type="button" onclick="window.resetSpacingToSelect()">
                        <i class="fas fa-undo"></i> 목록
                    </button>
                </div>
            `;
            document.getElementById('spacing').focus();
        }
    });
};

// 높이를 select로 되돌리기 (전역 함수)
window.resetHeightToSelect = function() {
    const heightGroup = document.getElementById('heightGroup');
    const heightOptions = ['3600이하', '3600이상'];

    if (!heightGroup) return;

    heightGroup.innerHTML = `
        <label>높이 <span class="required">*</span></label>
        <select id="height" required>
            <option value="">선택하세요</option>
            ${heightOptions.map(height => `<option value="${height}">${height}</option>`).join('')}
            <option value="CUSTOM_INPUT" data-custom="true">✏️ 직접 입력하기</option>
        </select>
    `;

    const heightSelect = document.getElementById('height');
    heightSelect.addEventListener('change', function(e) {
        if (e.target.value === 'CUSTOM_INPUT') {
            heightGroup.innerHTML = `
                <label>높이 <span class="required">*</span></label>
                <div class="custom-input-wrapper">
                    <input type="text" id="height" placeholder="직접 입력" value="" required>
                    <button type="button" onclick="window.resetHeightToSelect()">
                        <i class="fas fa-undo"></i> 목록
                    </button>
                </div>
            `;
            document.getElementById('height').focus();
        }
    });
};

// SIZE를 select로 되돌리기 (전역 함수)
window.resetSizeToSelect = function() {
    const sizeGroup = document.getElementById('sizeGroup');
    const sizeOptionsStuds = ['50형', '60형', '65형', '70형', '75형', '80형', '90형', '100형', '102형', '110형', '120형', '125형', '127형', '130형', '140형', '150형', '152형', '160형', '200형'];
    const sizeOptionsBoards = ['9.5T*1PLY', '12.5T*1PLY', '15T*1PLY', '9.5T*3*8*1PLY', '12.5T*3*8*1PLY', '15T*3*8*1PLY', '12.5T*4*8*1PLY', '15T*4*8*1PLY', '19T*1PLY', '25T*2*6*1PLY'];
    const sizeOptionsEtc = ['24K*50T'];

    if (!sizeGroup) return;

    sizeGroup.innerHTML = `
        <label>SIZE <span class="required">*</span></label>
        <select id="size" required>
            <option value="">선택하세요</option>
            <optgroup label="스터드 규격">
                ${sizeOptionsStuds.map(size => `<option value="${size}">${size}</option>`).join('')}
            </optgroup>
            <optgroup label="석고보드 규격">
                ${sizeOptionsBoards.map(size => `<option value="${size}">${size}</option>`).join('')}
            </optgroup>
            <optgroup label="기타">
                ${sizeOptionsEtc.map(size => `<option value="${size}">${size}</option>`).join('')}
            </optgroup>
            <option value="CUSTOM_INPUT" data-custom="true">✏️ 직접 입력하기</option>
        </select>
    `;

    const sizeSelect = document.getElementById('size');
    sizeSelect.addEventListener('change', function(e) {
        if (e.target.value === 'CUSTOM_INPUT') {
            sizeGroup.innerHTML = `
                <label>SIZE <span class="required">*</span></label>
                <div class="custom-input-wrapper">
                    <input type="text" id="size" placeholder="직접 입력" value="" required>
                    <button type="button" onclick="window.resetSizeToSelect()">
                        <i class="fas fa-undo"></i> 목록
                    </button>
                </div>
            `;
            document.getElementById('size').focus();
        }
    });
};

// 기본 정보에서 세부 설정으로 진행
function proceedToDetailInput(isEdit = false) {
    // 입력값 수집
    const basicData = {
        itemName: document.getElementById('itemName').value.trim(),
        spacing: document.getElementById('spacing').value.trim(),
        height: document.getElementById('height').value.trim(),
        size: document.getElementById('size').value.trim(),
        location: document.getElementById('location').value.trim(),
        workType1: document.getElementById('workType1').value.trim(),
        workType2: document.getElementById('workType2').value.trim(),
        unit: document.getElementById('unit').value
    };
    
    // 필수 필드 검증
    const requiredFields = ['itemName', 'spacing', 'height', 'size', 'location', 'workType1', 'unit'];
    for (const field of requiredFields) {
        if (!basicData[field]) {
            alert(`${getFieldLabel(field)} 필드를 입력해주세요.`);
            return;
        }
    }
    
    // 현재 데이터에 기본 정보 저장
    currentUnitPriceData.basic = basicData;
    
    // 기존 구성품이 없다면 초기화
    if (!currentUnitPriceData.components) {
        currentUnitPriceData.components = [];
    }
    
    // 현재 모달 닫기
    closeCurrentModal();
    
    // 세부 입력 모달 열기
    setTimeout(() => {
        openUnitPriceDetailModal(isEdit);
    }, 100);
}

// 필드 라벨 매핑
function getFieldLabel(field) {
    const labels = {
        itemName: '아이템',
        spacing: '간격',
        height: '높이',
        size: 'SIZE',
        location: '부위',
        workType1: '공종1',
        workType2: '공종2',
        unit: 'UNIT'
    };
    return labels[field] || field;
}

// =============================================================================
// 세부 설정 모달 관련 함수들
// =============================================================================

// 세부 아이템 입력 모달 열기  
function openUnitPriceDetailModal(isEdit = false) {
    
    const basic = currentUnitPriceData.basic;
    const workTypeDisplay = basic.workType2 ? `${basic.workType1}/${basic.workType2}` : basic.workType1;
    const itemSummary = `${basic.itemName} ${basic.spacing} ${basic.height} ${basic.size} | ${basic.location} | ${workTypeDisplay} | ${basic.unit}`;
    const modalTitle = isEdit ? '세부 아이템 수정' : '세부 아이템 설정';
    
    const detailModalHTML = createDetailModalHTML(itemSummary);
    
    // 기존 세부아이템 수정 모달들 제거 (중복 방지)
    const existingDetailModals = document.querySelectorAll('.sub-modal-overlay');
    existingDetailModals.forEach(modal => {
        const modalContent = modal.querySelector('.sub-modal-content');
        if (modalContent && (modalContent.innerHTML.includes('세부 아이템 수정') || modalContent.innerHTML.includes('세부 아이템 설정'))) {
            modal.remove();
        }
    });
    
    // 세부 입력 모달 표시 (저장 버튼만 - 닫기는 상단 X 버튼 사용)
    const modal = createSubModal(modalTitle, detailModalHTML, [
        { text: isEdit ? '수정 완료' : '저장', class: 'btn-primary', onClick: (modal) => saveUnitPriceItem() }
    ], {
        disableBackgroundClick: true,
        disableEscapeKey: true,
        width: '1300px'
    });
    
    // 편집 모드일 때 고정 비율 복원
    if (isEdit && currentUnitPriceData.fixedRates) {
        setTimeout(() => {
            const materialLossInput = document.querySelector('.material-loss-row .fixed-quantity');
            const transportCostInput = document.querySelector('.transport-cost-row .fixed-quantity');
            const materialProfitInput = document.querySelector('.material-profit-row .fixed-quantity');
            const toolExpenseInput = document.querySelector('.tool-expense-row .fixed-quantity');
            
            if (materialLossInput) materialLossInput.value = currentUnitPriceData.fixedRates.materialLoss || 3;
            if (transportCostInput) transportCostInput.value = currentUnitPriceData.fixedRates.transportCost || 1.5;
            if (materialProfitInput) materialProfitInput.value = currentUnitPriceData.fixedRates.materialProfit || 15;
            if (toolExpenseInput) toolExpenseInput.value = currentUnitPriceData.fixedRates.toolExpense || 2;
            
            
            // 값 변경 후 계산 다시 실행
            calculateGrandTotal();
        }, 100);
    }
    
    if (modal) {
        setTimeout(async () => {
            // 기존 구성품이 있다면 로드
            loadExistingComponents();
            
            // 기본 구성품이 없다면 하나 추가
            if (!currentUnitPriceData.components || currentUnitPriceData.components.length === 0) {
                addComponentRow();
            }
            
            // 세부 모달 component-row들의 최신 데이터 동기화
            setTimeout(async () => {
                await syncUnitPriceWithLatestData();
            }, 200);
        }, 100);
    }
}

// 세부 모달 HTML 생성
function createDetailModalHTML(itemSummary) {
    return `
        <div style="min-width: 840px; max-width: 1300px;">
            <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
                <button onclick="closeUnitPriceDetailModal()" title="닫기" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 5px 10px; transition: color 0.2s;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="unit-price-detail-form">
                <div class="detail-header">
                    <h4><i class="fas fa-info-circle"></i> ${itemSummary}</h4>
                </div>
            
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                <button onclick="addComponentRow()" style="padding: 5px 12px; font-size: 11px; font-weight: 500; border: none; border-radius: 4px; cursor: pointer; background: #475569; color: white; display: inline-flex; align-items: center; gap: 5px;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">
                    <i class="fas fa-plus"></i> 구성품 추가
                </button>
                <button onclick="openBulkQuantityCalculator()" style="padding: 5px 12px; font-size: 11px; font-weight: 500; border: none; border-radius: 4px; cursor: pointer; background: #475569; color: white; display: inline-flex; align-items: center; gap: 5px;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">
                    <i class="fas fa-calculator"></i> 소요량 계산
                </button>
                <button onclick="exportUnitPriceDetailToExcel()" style="padding: 5px 12px; font-size: 11px; font-weight: 500; border: none; border-radius: 4px; cursor: pointer; background: #475569; color: white; display: inline-flex; align-items: center; gap: 5px;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">
                    <i class="fas fa-file-excel"></i> Excel로 내보내기
                </button>
            </div>
            
            <!-- 세부 아이템 테이블 (석고보드 스타일) -->
            <div class="unit-price-table-container" style="max-height: 500px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                <table class="unit-price-detail-table" style="width: 100%; border-collapse: collapse; font-size: 12px; background: white;">
                    <thead style="background: #f8fafc; position: sticky; top: 0; z-index: 10;">
                        <tr>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #334155; min-width: 160px; text-align: center; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; font-weight: 600;">품명</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #334155; min-width: 120px; text-align: center; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; font-weight: 600;">싸이즈</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #334155; min-width: 60px; text-align: center; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; font-weight: 600;">단위</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #334155; min-width: 80px; text-align: center; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; font-weight: 600;">수량</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #334155; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 600;">재료비</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #334155; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 600;">노무비</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #334155; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 600;">경비</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #334155; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 600;">합계</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #334155; min-width: 60px; text-align: center; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; font-weight: 600;">삭제</th>
                        </tr>
                        <tr>
                            <th style="padding: 8px; border: 1px solid #334155; min-width: 80px; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #334155; min-width: 90px; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 500;">금액</th>
                            <th style="padding: 8px; border: 1px solid #334155; min-width: 80px; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #334155; min-width: 90px; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 500;">금액</th>
                            <th style="padding: 8px; border: 1px solid #334155; min-width: 80px; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #334155; min-width: 90px; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 500;">금액</th>
                            <th style="padding: 8px; border: 1px solid #334155; min-width: 80px; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #334155; min-width: 90px; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; text-align: center; font-weight: 500;">금액</th>
                        </tr>
                    </thead>
                    <tbody id="componentsTable">
                        <!-- 동적으로 추가되는 행들 -->
                    </tbody>
                    <!-- 고정 로우들 -->
                    <tbody id="fixedRowsTable">
                        <!-- 자재로스 -->
                        <tr class="fixed-row material-loss-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">자재로스</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">자재비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="3" step="0.1" oninput="calculateGrandTotal()" placeholder="3.0" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;" class="fixed-material-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 자재운반비 및 양중비 -->
                        <tr class="fixed-row transport-cost-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">자재운반비 및 양중비</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">자재비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="1.5" step="0.1" oninput="calculateGrandTotal()" placeholder="1.5" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;" class="fixed-material-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 자재비 이윤 -->
                        <tr class="fixed-row material-profit-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">자재비 이윤</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">자재비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="15" step="0.1" oninput="calculateGrandTotal()" placeholder="15.0" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;" class="fixed-material-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 공구손료 및 기계경비 -->
                        <tr class="fixed-row tool-expense-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">공구손료 및 기계경비</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">노무비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="2" step="0.1" oninput="calculateGrandTotal()" placeholder="2.0" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;" class="fixed-expense-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-expense-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 단수 정리 -->
                        <tr class="fixed-row rounding-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #334155; font-weight: 600;">단수 정리</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #334155; text-align: center;">원미만</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #334155; text-align: center;">절사</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #334155;"><select class="rounding-unit" onchange="calculateGrandTotal()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; background: white;">
                                <option value="1">원</option>
                                <option value="10">10원</option>
                                <option value="100" selected>100원</option>
                                <option value="1000">1000원</option>
                            </select></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #334155; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="rounding-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #334155; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="rounding-labor-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #334155; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="rounding-expense-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="rounding-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="rounding-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f8fafc;"></td>
                        </tr>
                    </tbody>
                    <tfoot style="background: #f9fafb; position: sticky; bottom: 0;">
                        <tr class="summary-row">
                            <td colspan="4" style="padding: 12px 8px; border: 1px solid #334155; font-weight: 700; text-align: center; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white;"><strong>총 합계</strong></td>
                            <td colspan="2" id="totalMaterial" style="padding: 8px; border: 1px solid #334155; text-align: right; font-weight: 600; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white;">0원</td>
                            <td colspan="2" id="totalLabor" style="padding: 8px; border: 1px solid #334155; text-align: right; font-weight: 600; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white;">0원</td>
                            <td colspan="2" id="totalExpense" style="padding: 8px; border: 1px solid #334155; text-align: right; font-weight: 600; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white;">0원</td>
                            <td colspan="2" id="grandTotal" style="padding: 8px; border: 1px solid #334155; text-align: right; font-weight: bold; background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white;">0원</td>
                            <td style="border: 1px solid #334155; background: linear-gradient(135deg, #475569 0%, #334155 100%);"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- 버튼들은 createSubModal에서 처리 -->
            </div>
        </div>
    `;
}

// =============================================================================
// 구성품 행 관리 함수들 
// =============================================================================


// =============================================================================
// 구성품 행 관리 함수들
// =============================================================================

// 구성품 행 추가
function addComponentRow(componentData = null) {
    const tbody = document.getElementById('componentsTable');
    if (!tbody) return;
    
    const rowIndex = tbody.children.length;
    const row = document.createElement('tr');
    row.className = 'component-row';
    
    const data = componentData || {
        name: '',
        spec: '',
        unit: '',
        quantity: 1,
        materialPrice: 0,
        laborPrice: 0,
        laborAmount: 0,
        expensePrice: 0
    };
    
    // 기본 행 생성 (노무비 특별 처리 제거)
    
    row.innerHTML = `
        <td style="padding: 6px; border: 1px solid #e2e8f0;">
            <div style="display: flex; gap: 4px; align-items: center;">
                <span class="component-name" style="flex: 1; padding: 4px; font-size: 12px; color: #374151;">
                    ${data.name || '자재를 선택해주세요'}
                </span>
                <button type="button" class="material-select-btn" onclick="openMaterialSelector(this)" 
                        style="padding: 4px 6px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px; white-space: nowrap;"
                        title="자재 선택">
                    <i class="fas fa-search"></i>
                </button>
            </div>
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">
            <span class="component-spec" style="font-size: 12px; color: #374151;">
                ${data.spec || '-'}
            </span>
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">
            <span class="component-unit" style="font-size: 12px; color: #374151;">
                ${data.unit || '-'}
            </span>
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">
            <input type="number" class="component-quantity" value="${data.quantity}" min="0" step="0.01"
                   oninput="calculateRowTotal(this)"
                   style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right;">
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right;">
            <span class="component-material-price" style="font-size: 12px; color: #374151;">
                ${data.materialPrice ? data.materialPrice.toLocaleString() + '원' : '0원'}
            </span>
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="material-amount">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right;">
            <span class="component-labor-price" style="font-size: 12px; color: #374151;">
                ${data.laborPrice ? data.laborPrice.toLocaleString() + '원' : '0원'}
            </span>
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="labor-amount">${data.laborAmount ? data.laborAmount.toLocaleString() + '원' : '0원'}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">
            <input type="number" class="expense-price" value="${data.expensePrice}" min="0"
                   oninput="calculateRowTotal(this)"
                   style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right;">
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="expense-amount">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: 600;" class="total-price">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #f8fafc; color: #334155; font-weight: bold; font-size: 12px;" class="total-amount">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">
            <button onclick="removeComponentRow(this)" class="btn btn-sm" 
                    style="padding: 2px 6px; background: #dc2626; color: white; border: none; border-radius: 3px; font-size: 11px;">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(row);
    
    // 저장된 materialId 복원 (정확한 자재 추적을 위함)
    if (componentData && componentData.materialId) {
        row.setAttribute('data-material-id', componentData.materialId);
    }
    
    calculateRowTotal(row.querySelector('.component-quantity'));
    calculateGrandTotal();
}

// 구성품 행 삭제
function removeComponentRow(button) {
    const row = button.closest('tr');
    if (row) {
        // 품명 정보 추출 (첫 번째 td의 select 또는 텍스트)
        const firstCell = row.querySelector('td:first-child');
        const itemName = firstCell?.querySelector('select')?.selectedOptions[0]?.text
                      || firstCell?.textContent?.trim()
                      || '이 구성품';

        // 확인 대화상자 표시
        if (confirm(`"${itemName}"을(를) 삭제하시겠습니까?`)) {
            row.remove();
            calculateGrandTotal();
        }
    }
}

// 행별 계산
function calculateRowTotal(input) {
    const row = input.closest('tr');
    if (!row) return;
    
    // span, td, input 요소를 모두 지원하는 값 읽기 함수
    const getElementValue = (element) => {
        if (!element) return 0;
        
        // SPAN이나 TD 태그는 textContent 사용 (콤마와 "원" 제거)
        if (element.tagName === 'SPAN' || element.tagName === 'TD') {
            const textContent = element.textContent;
            const cleaned = textContent.replace(/[,원]/g, '');
            return parseFloat(cleaned) || 0;
        } else {
            // INPUT 등은 value 속성 사용
            return parseFloat(element.value) || 0;
        }
    };
    
    const quantity = parseFloat(row.querySelector('.component-quantity')?.value) || 0;
    const materialPrice = getElementValue(row.querySelector('.component-material-price'));
    const expensePrice = getElementValue(row.querySelector('.expense-price'));
    
    // 노무비 계산: 금액 컬럼에서 읽어와서 단가 계산
    const laborAmountElement = row.querySelector('.labor-amount');
    const laborAmount = getElementValue(laborAmountElement); // 노무비 금액 (고정값)
    const laborUnitPrice = quantity > 0 ? laborAmount / quantity : 0; // 노무비 단가 = 노무비 금액 ÷ 수량
    
    const materialAmount = quantity * materialPrice;
    const expenseAmount = quantity * expensePrice;
    const totalAmount = materialAmount + laborAmount + expenseAmount;
    
    // 합계 단가 계산: 자재비 단가 + 노무비 단가 + 경비 단가
    const totalPrice = materialPrice + laborUnitPrice + expensePrice;
    
    
    // 각 금액 업데이트
    const materialAmountElement = row.querySelector('.material-amount');
    const laborPriceElement = row.querySelector('.component-labor-price');
    // laborAmountElement는 이미 위에서 선언됨
    const expenseAmountElement = row.querySelector('.expense-amount');
    const totalPriceElement = row.querySelector('.total-price');
    const totalAmountElement = row.querySelector('.total-amount');
    
    if (materialAmountElement) materialAmountElement.textContent = Math.round(materialAmount).toLocaleString() + '원';
    
    // 노무비: 단가 컬럼에는 계산된 단가(laborUnitPrice), 금액 컬럼은 고정값 유지
    if (laborPriceElement) {
        const displayValue = Math.round(laborUnitPrice).toLocaleString() + '원';
        laborPriceElement.textContent = displayValue;
    }
    // 노무비 금액은 이미 설정되어 있으므로 변경하지 않음 (고정값)
    if (expenseAmountElement) expenseAmountElement.textContent = Math.round(expenseAmount).toLocaleString() + '원';
    
    // 합계 단가 표시 (새로 추가)
    if (totalPriceElement) totalPriceElement.textContent = Math.round(totalPrice).toLocaleString() + '원';
    if (totalAmountElement) totalAmountElement.textContent = Math.round(totalAmount).toLocaleString() + '원';
    
    calculateGrandTotal();
}

// =============================================================================
// 전체 합계 계산 함수들
// =============================================================================

// 전체 합계 계산 (구성품 + 고정 로우)
function calculateGrandTotal() {
    let totalMaterial = 0, totalLabor = 0, totalExpense = 0, grandTotal = 0;
    
    // 구성품 테이블 계산
    document.querySelectorAll('#componentsTable tr').forEach(row => {
        const materialElement = row.querySelector('.material-amount');
        const laborElement = row.querySelector('.labor-amount');
        const expenseElement = row.querySelector('.expense-amount');
        const totalElement = row.querySelector('.total-amount');
        
        if (materialElement) totalMaterial += parseFloat(materialElement.textContent.replace(/[,원]/g, '') || 0);
        if (laborElement) totalLabor += parseFloat(laborElement.textContent.replace(/[,원]/g, '') || 0);
        if (expenseElement) totalExpense += parseFloat(expenseElement.textContent.replace(/[,원]/g, '') || 0);
        if (totalElement) grandTotal += parseFloat(totalElement.textContent.replace(/[,원]/g, '') || 0);
    });
    
    // 고정 로우 계산 (백분율 기반)
    calculateFixedRows(totalMaterial, totalLabor, totalExpense);
    
    // 고정 로우 금액을 카테고리별로 추가
    // 자재로스, 자재운반비, 자재비이윤 → 재료비에 추가
    const materialLossRow = document.querySelector('.material-loss-row');
    const transportCostRow = document.querySelector('.transport-cost-row');
    const materialProfitRow = document.querySelector('.material-profit-row');
    
    if (materialLossRow) {
        const amount = parseFloat(materialLossRow.querySelector('.fixed-material-amount')?.textContent.replace(/[,원]/g, '') || 0);
        totalMaterial += amount;
        grandTotal += amount;
    }
    if (transportCostRow) {
        const amount = parseFloat(transportCostRow.querySelector('.fixed-material-amount')?.textContent.replace(/[,원]/g, '') || 0);
        totalMaterial += amount;
        grandTotal += amount;
    }
    if (materialProfitRow) {
        const amount = parseFloat(materialProfitRow.querySelector('.fixed-material-amount')?.textContent.replace(/[,원]/g, '') || 0);
        totalMaterial += amount;
        grandTotal += amount;
    }
    
    // 공구손료 및 기계경비 → 노무비에 추가
    const toolExpenseRow = document.querySelector('.tool-expense-row');
    if (toolExpenseRow) {
        const amount = parseFloat(toolExpenseRow.querySelector('td:nth-child(8)')?.textContent.replace(/[,원]/g, '') || 0);
        totalLabor += amount;
        grandTotal += amount;
    }
    
    // 단수 정리 적용
    const roundingRow = document.querySelector('.rounding-row');
    if (roundingRow) {
        const roundingUnit = parseInt(roundingRow.querySelector('.rounding-unit')?.value || 100);
        
        // 각 카테고리별 단수 정리 적용 (내림)
        const roundedMaterial = Math.floor(totalMaterial / roundingUnit) * roundingUnit;
        const roundedLabor = Math.floor(totalLabor / roundingUnit) * roundingUnit;
        const roundedExpense = Math.floor(totalExpense / roundingUnit) * roundingUnit;

        // 단수 정리 차액 계산
        const materialDiff = totalMaterial - roundedMaterial;
        const laborDiff = totalLabor - roundedLabor;
        const expenseDiff = totalExpense - roundedExpense;
        const totalDiff = materialDiff + laborDiff + expenseDiff;  // ✅ 카테고리별 단수정리 합산
        
        // 단수 정리 로우에 차액 표시
        const roundingMaterialElement = roundingRow.querySelector('.rounding-material-amount');
        const roundingLaborElement = roundingRow.querySelector('.rounding-labor-amount');
        const roundingExpenseElement = roundingRow.querySelector('.rounding-expense-amount');
        const roundingTotalElement = roundingRow.querySelector('.rounding-total-amount');
        
        if (roundingMaterialElement) roundingMaterialElement.textContent = `-${Math.round(materialDiff).toLocaleString()}원`;
        if (roundingLaborElement) roundingLaborElement.textContent = `-${Math.round(laborDiff).toLocaleString()}원`;
        if (roundingExpenseElement) roundingExpenseElement.textContent = `-${Math.round(expenseDiff).toLocaleString()}원`;
        if (roundingTotalElement) roundingTotalElement.textContent = `-${Math.round(totalDiff).toLocaleString()}원`;
        
        // 최종 값을 반올림된 값으로 업데이트
        totalMaterial = roundedMaterial;
        totalLabor = roundedLabor;
        totalExpense = roundedExpense;
        grandTotal = roundedMaterial + roundedLabor + roundedExpense;  // ✅ 단수정리된 카테고리 합산
    }
    
    // 합계 표시 업데이트
    const totalMaterialElement = document.getElementById('totalMaterial');
    const totalLaborElement = document.getElementById('totalLabor');
    const totalExpenseElement = document.getElementById('totalExpense');
    const grandTotalElement = document.getElementById('grandTotal');
    
    if (totalMaterialElement) totalMaterialElement.textContent = Math.round(totalMaterial).toLocaleString() + '원';
    if (totalLaborElement) totalLaborElement.textContent = Math.round(totalLabor).toLocaleString() + '원';
    if (totalExpenseElement) totalExpenseElement.textContent = Math.round(totalExpense).toLocaleString() + '원';
    if (grandTotalElement) grandTotalElement.textContent = Math.round(grandTotal).toLocaleString() + '원';
}

// 고정 로우 계산 (백분율 기반)
function calculateFixedRows(baseMaterial, baseLabor, baseExpense) {
    // 자재로스 (자재비의 %)
    const materialLossRow = document.querySelector('.material-loss-row');
    if (materialLossRow) {
        const percentage = parseFloat(materialLossRow.querySelector('.fixed-quantity')?.value) || 0;
        const amount = Math.round(baseMaterial * percentage / 100);
        
        // 단가 컬럼에 자재비 총합 표시
        const priceElement = materialLossRow.querySelector('.fixed-material-price');
        if (priceElement) priceElement.textContent = Math.round(baseMaterial).toLocaleString() + '원';
        
        // 금액 컬럼에 계산된 금액 표시
        const amountElement = materialLossRow.querySelector('.fixed-material-amount');
        if (amountElement) amountElement.textContent = amount.toLocaleString() + '원';
        
        // 합계 단가와 합계 금액 설정 (자재로스는 자재비 항목이므로 동일)
        const totalPriceElement = materialLossRow.querySelector('.fixed-total-price');
        const totalAmountElement = materialLossRow.querySelector('.fixed-total-amount');
        if (totalPriceElement) totalPriceElement.textContent = Math.round(baseMaterial).toLocaleString() + '원';
        if (totalAmountElement) totalAmountElement.textContent = amount.toLocaleString() + '원';
    }
    
    // 자재운반비 및 양중비 (자재비의 %)
    const transportCostRow = document.querySelector('.transport-cost-row');
    if (transportCostRow) {
        const percentage = parseFloat(transportCostRow.querySelector('.fixed-quantity')?.value) || 0;
        const amount = Math.round(baseMaterial * percentage / 100);
        
        // 단가 컬럼에 자재비 총합 표시
        const priceElement = transportCostRow.querySelector('.fixed-material-price');
        if (priceElement) priceElement.textContent = Math.round(baseMaterial).toLocaleString() + '원';
        
        // 금액 컬럼에 계산된 금액 표시
        const amountElement = transportCostRow.querySelector('.fixed-material-amount');
        if (amountElement) amountElement.textContent = amount.toLocaleString() + '원';
        
        // 합계 단가와 합계 금액 설정 (자재운반비는 자재비 항목이므로 동일)
        const totalPriceElement = transportCostRow.querySelector('.fixed-total-price');
        const totalAmountElement = transportCostRow.querySelector('.fixed-total-amount');
        if (totalPriceElement) totalPriceElement.textContent = Math.round(baseMaterial).toLocaleString() + '원';
        if (totalAmountElement) totalAmountElement.textContent = amount.toLocaleString() + '원';
    }
    
    // 자재비 이윤 ((자재비 + 자재로스 + 자재운반비)의 %)
    const materialProfitRow = document.querySelector('.material-profit-row');
    if (materialProfitRow) {
        // 자재로스 금액 가져오기
        const materialLossAmount = parseFloat(materialLossRow?.querySelector('.fixed-material-amount')?.textContent.replace(/[,원]/g, '') || 0);
        // 자재운반비 금액 가져오기  
        const transportCostAmount = parseFloat(transportCostRow?.querySelector('.fixed-material-amount')?.textContent.replace(/[,원]/g, '') || 0);
        
        // 새로운 기준 금액 계산 (자재비 + 자재로스 + 자재운반비)
        const baseAmount = baseMaterial + materialLossAmount + transportCostAmount;
        const percentage = parseFloat(materialProfitRow.querySelector('.fixed-quantity')?.value) || 0;
        const amount = Math.round(baseAmount * percentage / 100);
        
        // 단가 컬럼에 기준 금액 표시
        const priceElement = materialProfitRow.querySelector('.fixed-material-price');
        if (priceElement) priceElement.textContent = Math.round(baseAmount).toLocaleString() + '원';
        
        // 금액 컬럼에 계산된 금액 표시
        const amountElement = materialProfitRow.querySelector('.fixed-material-amount');
        if (amountElement) amountElement.textContent = amount.toLocaleString() + '원';
        
        // 합계 단가와 합계 금액 설정 (자재비 이윤은 자재비 항목이므로 기준 금액 사용)
        const totalPriceElement = materialProfitRow.querySelector('.fixed-total-price');
        const totalAmountElement = materialProfitRow.querySelector('.fixed-total-amount');
        if (totalPriceElement) totalPriceElement.textContent = Math.round(baseAmount).toLocaleString() + '원';
        if (totalAmountElement) totalAmountElement.textContent = amount.toLocaleString() + '원';
    }
    
    // 공구손료 및 기계경비 (노무비의 %) - 노무비 컬럼에 표시
    const toolExpenseRow = document.querySelector('.tool-expense-row');
    if (toolExpenseRow) {
        const percentage = parseFloat(toolExpenseRow.querySelector('.fixed-quantity')?.value) || 0;
        const amount = Math.round(baseLabor * percentage / 100);
        
        // 노무비 단가 컬럼에 노무비 총합 표시
        const priceElement = toolExpenseRow.querySelector('td:nth-child(7)'); // 노무비 단가 컬럼 (7번째)
        if (priceElement) priceElement.textContent = Math.round(baseLabor).toLocaleString() + '원';
        
        // 노무비 금액 컬럼에 계산된 금액 표시  
        const amountElement = toolExpenseRow.querySelector('td:nth-child(8)'); // 노무비 금액 컬럼 (8번째)
        if (amountElement) amountElement.textContent = amount.toLocaleString() + '원';
        
        // 합계 단가와 합계 금액 설정 (공구손료는 노무비 항목이므로 노무비 총합 사용)
        const totalPriceElement = toolExpenseRow.querySelector('.fixed-total-price');
        const totalAmountElement = toolExpenseRow.querySelector('.fixed-total-amount');
        if (totalPriceElement) totalPriceElement.textContent = Math.round(baseLabor).toLocaleString() + '원';
        if (totalAmountElement) totalAmountElement.textContent = amount.toLocaleString() + '원';
    }
}

// =============================================================================
// 데이터 저장 및 로드 함수들
// =============================================================================

// 기존 구성품 로드
function loadExistingComponents() {
    if (!currentUnitPriceData.components || currentUnitPriceData.components.length === 0) {
        return;
    }
    
    currentUnitPriceData.components.forEach(component => {
        addComponentRow(component);
    });
}

// 현재 구성품 데이터 수집
function collectCurrentComponents() {
    const components = [];
    const rows = document.querySelectorAll('#componentsTable .component-row');
    
    rows.forEach(row => {
        // span, td, input 요소를 모두 지원하는 데이터 읽기 함수
        const getElementValue = (element, isNumeric = false) => {
            if (!element) return isNumeric ? 0 : '';
            // SPAN이나 TD 태그는 textContent 사용
            if (element.tagName === 'SPAN' || element.tagName === 'TD') {
                const textContent = element.textContent;
                if (isNumeric) {
                    const cleaned = textContent.replace(/[,원]/g, '');
                    return parseFloat(cleaned) || 0;
                } else {
                    return textContent.trim();
                }
            } else {
                // INPUT 태그는 value 사용
                if (isNumeric) {
                    return parseFloat(element.value) || 0;
                } else {
                    return element.value;
                }
            }
        };
        
        // 구성품 데이터 수집
        const componentName = getElementValue(row.querySelector('.component-name')) || '';
        const quantity = parseFloat(row.querySelector('.component-quantity')?.value) || 0;
        
        // 노무비 계산: 금액에서 단가 계산 
        const laborAmountElementForSave = row.querySelector('.labor-amount');
        const laborAmount = getElementValue(laborAmountElementForSave, true); // 노무비 금액 (고정값)
        const laborPrice = quantity > 0 ? laborAmount / quantity : 0; // 노무비 단가 = 금액 ÷ 수량
        
        const materialPrice = getElementValue(row.querySelector('.material-price'), true) || getElementValue(row.querySelector('.component-material-price'), true) || 0;

        // ✨ 1m² 단가 계산 (반올림)
        const materialPricePerM2 = Math.round(materialPrice * quantity);
        const laborPricePerM2 = Math.round(laborAmount);

        const component = {
            name: componentName,
            materialId: row.getAttribute('data-material-id') || null, // materialId 수집
            spec: getElementValue(row.querySelector('.component-spec')) || '',
            unit: getElementValue(row.querySelector('.component-unit')) || '',
            quantity: quantity,
            materialPrice: materialPrice,
            laborPrice: laborPrice,
            laborAmount: laborAmount,
            expensePrice: getElementValue(row.querySelector('.expense-price'), true) || 0,
            // ✨ 1m² 단가 저장
            materialPricePerM2: materialPricePerM2,
            laborPricePerM2: laborPricePerM2
        };
        
        if (component.name.trim()) { // 품명이 있는 것만 저장
            components.push(component);
        }
    });
    
    currentUnitPriceData.components = components;
}

// 일위대가 아이템 저장
async function saveUnitPriceItem() {
    // 구성품 데이터 수집
    collectCurrentComponents();
    
    // 총 비용 계산 및 저장
    const totalMaterial = parseFloat(document.getElementById('totalMaterial')?.textContent.replace(/[,원]/g, '') || 0);
    const totalLabor = parseFloat(document.getElementById('totalLabor')?.textContent.replace(/[,원]/g, '') || 0);
    const totalExpense = parseFloat(document.getElementById('totalExpense')?.textContent.replace(/[,원]/g, '') || 0);
    const grandTotal = parseFloat(document.getElementById('grandTotal')?.textContent.replace(/[,원]/g, '') || 0);

    // 고정 비용 비율 저장
    const fixedRates = {
        materialLoss: parseFloat(document.querySelector('.material-loss-row .fixed-quantity')?.value) || 3,
        transportCost: parseFloat(document.querySelector('.transport-cost-row .fixed-quantity')?.value) || 1.5,
        materialProfit: parseFloat(document.querySelector('.material-profit-row .fixed-quantity')?.value) || 15,
        toolExpense: parseFloat(document.querySelector('.tool-expense-row .fixed-quantity')?.value) || 2
    };
    currentUnitPriceData.fixedRates = fixedRates;

    // ✨ 1m² 단가 계산 (구성품 합산)
    const materialUnitPrice = currentUnitPriceData.components.reduce((sum, c) => sum + (c.materialPricePerM2 || 0), 0);
    const laborUnitPrice = currentUnitPriceData.components.reduce((sum, c) => sum + (c.laborPricePerM2 || 0), 0);

    // ✨ 간접비 1m² 단가 계산
    const materialLossUnitPrice = Math.round(materialUnitPrice * fixedRates.materialLoss / 100);
    const transportCostUnitPrice = Math.round(materialUnitPrice * fixedRates.transportCost / 100);
    const materialProfitBase = materialUnitPrice + materialLossUnitPrice + transportCostUnitPrice;
    const materialProfitUnitPrice = Math.round(materialProfitBase * fixedRates.materialProfit / 100);
    const toolExpenseUnitPrice = Math.round(laborUnitPrice * fixedRates.toolExpense / 100);

    // ✨ 1m² 기준 항목별 합계 계산
    const materialTotal = materialUnitPrice + materialLossUnitPrice +
                          transportCostUnitPrice + materialProfitUnitPrice;
    const laborTotal = laborUnitPrice + toolExpenseUnitPrice;
    const expenseTotal = 0; // 경비는 보통 0

    // ✨ 각 항목별로 100원 단위 단수정리
    const materialRounding = -(materialTotal % 100);
    const laborRounding = -(laborTotal % 100);
    const expenseRounding = -(expenseTotal % 100);

    // ✨ 총 단수정리 (자재비 + 노무비 + 경비)
    const roundingPerM2 = materialRounding + laborRounding + expenseRounding;

    currentUnitPriceData.totalCosts = {
        material: totalMaterial,
        labor: totalLabor,
        expense: totalExpense,
        total: grandTotal,
        // ✨ 1m² 단가 추가
        materialUnitPrice: materialUnitPrice,
        laborUnitPrice: laborUnitPrice,
        totalUnitPrice: materialUnitPrice + laborUnitPrice,
        // ✨ 간접비 1m² 단가 추가
        indirectCosts: {
            materialLoss: materialLossUnitPrice,
            transportCost: transportCostUnitPrice,
            materialProfit: materialProfitUnitPrice,
            toolExpense: toolExpenseUnitPrice
        },
        // ✨ 단수정리 1m² 단가 (개별 항목별 분리)
        rounding: {
            material: materialRounding,
            labor: laborRounding,
            expense: expenseRounding,
            total: roundingPerM2
        },
        // ✨ 단수정리 1m² 단가 (하위 호환성 유지)
        roundingPerM2: roundingPerM2
    };
    
    // 새 아이템이면 ID와 생성일 설정
    if (!currentUnitPriceData.id) {
        currentUnitPriceData.id = generateUnitPriceId(currentUnitPriceData.basic);
        currentUnitPriceData.createdAt = new Date().toISOString();
    }
    
    // IndexedDB에 저장
    const success = await unitPriceDB.saveUnitPrice(currentUnitPriceData);
    
    if (success) {
        console.log('✅ 일위대가 아이템 저장됨:', currentUnitPriceData.id);
        
        // 메모리 배열도 업데이트
        const existingIndex = unitPriceItems.findIndex(item => item.id === currentUnitPriceData.id);
        if (existingIndex >= 0) {
            unitPriceItems[existingIndex] = currentUnitPriceData;
        } else {
            unitPriceItems.push(currentUnitPriceData);
        }
        
        // 벽체 타입 관리 모달이 열려있다면 즉시 새로고침
        setTimeout(() => {
            const unitPriceSelectionTable = document.getElementById('unitPriceSelectionTable');
            if (unitPriceSelectionTable) {
                console.log('🔄 벽체 타입 관리 일위대가 선택 모달 감지 - 즉시 새로고침');
                // 전역 함수로 새로고침 실행
                if (typeof window.refreshUnitPriceSelectionTable === 'function') {
                    window.refreshUnitPriceSelectionTable();
                }
            }
        }, 100);
        
        // 간단하고 직관적인 방식: 항상 일위대가 관리로 돌아가기
        closeCurrentModal();
        
        setTimeout(() => {
            // 혹시 있을 수 있는 자재선택 모달 제거
            const materialSelectModal = document.querySelector('.material-select-modal');
            if (materialSelectModal) materialSelectModal.remove();
            
            // 항상 일위대가 관리 모달 열기
            if (typeof window.openUnitPriceManagement === 'function') {
                window.openUnitPriceManagement();
                console.log('✅ 수정완료 → 일위대가 관리 복귀');
            }
        }, 200);
        
        // 목록 새로고침
        setTimeout(async () => {
            await renderUnitPriceItemsList();
        }, 100);
        
        alert('일위대가가 성공적으로 저장되었습니다.');
    } else {
        alert('일위대가 저장에 실패했습니다.');
    }
}

// 일위대가 ID 생성
function generateUnitPriceId(basic) {
    const timestamp = Date.now();
    const shortId = `${basic.itemName}-${basic.spacing}-${basic.height}-${basic.size}`.replace(/[^a-zA-Z0-9가-힣\-]/g, '');
    return `${shortId}-${timestamp}`;
}

// 현재 모달 닫기 (유틸리티 함수)
function closeCurrentModal() {
    // 서브 모달 오버레이 찾기 (일위대가 관리 모달)
    const subModalOverlay = document.querySelector('.sub-modal-overlay');
    if (subModalOverlay && typeof closeSubModal === 'function') {
        console.log('🔄 일위대가 관리 모달 닫기');
        closeSubModal(subModalOverlay);
        return;
    }
    
    // 일반 모달 오버레이 찾기
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        console.log('🔄 일반 모달 닫기');
        modalOverlay.remove();
        return;
    }
    
    console.warn('⚠️ 닫을 모달을 찾을 수 없습니다.');
}

// =============================================================================
// 일위대가 목록 관리 함수들
// =============================================================================

// 일위대가 아이템 목록 로드
async function loadUnitPriceItems() {
    try {
        unitPriceItems = await unitPriceDB.getAllUnitPrices();
        console.log(`✅ 일위대가 데이터 로드됨: ${unitPriceItems.length}개 아이템`);
    } catch (error) {
        console.error('일위대가 데이터 로드 실패:', error);
        unitPriceItems = [];
    }
    return unitPriceItems;
}

// 일위대가 아이템 목록 저장 (개별 저장으로 변경, 대량 저장시에만 사용)
async function saveUnitPriceItems() {
    try {
        // 개별 저장 방식으로 변경되었으므로 이 함수는 대량 업데이트시만 사용
        console.log('✅ IndexedDB 사용 중: 개별 저장 방식으로 변경됨');
    } catch (error) {
        console.error('일위대가 데이터 저장 실패:', error);
        alert('데이터 저장에 실패했습니다.');
    }
}

// 아이템의 총 비용 계산 (구성품 + 고정비용)
function calculateItemTotalCosts(item) {
    try {
        if (!item || !item.components) {
            console.log(`⚠️ 계산 불가 - 아이템 또는 구성품 없음:`, { item: !!item, components: !!item?.components });
            return { material: 0, labor: 0, expense: 0, total: 0 };
        }
        
        console.log(`🧮 아이템 비용 계산 시작: ${item.basic?.itemName || 'Unknown'} (구성품 ${item.components.length}개)`);
        
        // 저장된 totalCosts가 있으면 사용 (이미 계산된 값)
        if (item.totalCosts && typeof item.totalCosts === 'object') {
            console.log(`✅ 저장된 totalCosts 사용:`, item.totalCosts);
            return {
                material: item.totalCosts.material || 0,
                labor: item.totalCosts.labor || 0,
                expense: item.totalCosts.expense || 0,
                total: item.totalCosts.total || 0
            };
        }
        
        let materialTotal = 0;
        let laborTotal = 0;
        let expenseTotal = 0;
        
        // 구성품별 비용 계산
        item.components.forEach((component, index) => {
            const quantity = parseFloat(component.quantity) || 0;
            const materialPrice = parseFloat(component.materialPrice) || 0;
            const expensePrice = parseFloat(component.expensePrice) || 0;
            
            const componentMaterial = quantity * materialPrice;
            const componentExpense = quantity * expensePrice;
            
            // 노무비 계산: 저장된 방식에 따라 처리
            // laborAmount가 있으면 새로운 방식(금액 고정), 없으면 기존 방식(단가 기반)
            let componentLabor;
            if (component.laborAmount !== undefined && component.laborAmount !== null) {
                // 새로운 방식: 노무비 금액이 고정값으로 저장됨
                componentLabor = parseFloat(component.laborAmount) || 0;
                console.log(`  🔧 구성품 ${index + 1}: ${component.name} - 노무비금액(고정):${componentLabor}`);
            } else {
                // 기존 방식: 단가 ÷ 수량 = 금액 (하위 호환성)
                const laborPrice = parseFloat(component.laborPrice) || 0;
                componentLabor = quantity > 0 ? laborPrice / quantity : 0;
                console.log(`  🔧 구성품 ${index + 1}: ${component.name} - 기존방식 단가÷수량:${laborPrice}÷${quantity}=${componentLabor}`);
            }
            
            materialTotal += componentMaterial;
            laborTotal += componentLabor;
            expenseTotal += componentExpense;
        });
        
        console.log(`📊 구성품 합계 - 재료비:${materialTotal}, 노무비:${laborTotal}, 경비:${expenseTotal}`);
        
        // 고정비용 계산 (저장된 비율 또는 기본값 사용)
        const fixedRates = item.fixedRates || {
            materialLoss: 3,
            transportCost: 1.5,
            materialProfit: 15,
            toolExpense: 2
        };
        
        // 자재로스 (자재비의 %)
        const materialLoss = Math.round(materialTotal * fixedRates.materialLoss / 100);
        // 자재운반비 (자재비의 %)
        const transportCost = Math.round(materialTotal * fixedRates.transportCost / 100);
        // 자재비 이윤 ((자재비 + 자재로스 + 자재운반비)의 %)
        const materialProfitBase = materialTotal + materialLoss + transportCost;
        const materialProfit = Math.round(materialProfitBase * fixedRates.materialProfit / 100);
        // 공구손료 (노무비의 %)
        const toolExpense = Math.round(laborTotal * fixedRates.toolExpense / 100);
        
        // 최종 합계
        const finalMaterial = materialTotal + materialLoss + transportCost + materialProfit;
        const finalLabor = laborTotal;
        const finalExpense = expenseTotal + toolExpense;
        const finalTotal = finalMaterial + finalLabor + finalExpense;
        
        console.log(`💰 최종 계산 결과 - 재료비:${finalMaterial}, 노무비:${finalLabor}, 경비:${finalExpense}, 총계:${finalTotal}`);
        
        return {
            material: finalMaterial,
            labor: finalLabor,
            expense: finalExpense,
            total: finalTotal
        };
        
    } catch (error) {
        console.error('아이템 비용 계산 실패:', error);
        return { material: 0, labor: 0, expense: 0, total: 0 };
    }
}

// 일위대가 아이템 목록 렌더링
async function renderUnitPriceItemsList() {
    const container = document.getElementById('unitPriceItemsList');
    if (!container) return;
    
    if (unitPriceItems.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>등록된 일위대가가 없습니다.</p>
                <p style="font-size: 14px;">상단의 "새 일위대가 추가" 버튼을 클릭하여 시작하세요.</p>
            </div>
        `;
        return;
    }
    
    // Excel 스타일 테이블 생성
    const tableHTML = `
        <div class="unit-price-table-wrapper" style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: white;">
                <thead style="background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; position: sticky; top: 0; z-index: 10;">
                    <tr>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 120px; text-align: center; font-weight: 600;">아이템</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 70px; text-align: center; font-weight: 600;">간격</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 70px; text-align: center; font-weight: 600;">높이</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 70px; text-align: center; font-weight: 600;">SIZE</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 70px; text-align: center; font-weight: 600;">부위</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 60px; text-align: center; font-weight: 600;">공종1</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 60px; text-align: center; font-weight: 600;">공종2</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 60px; text-align: center; font-weight: 600;">단위</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 90px; text-align: center; font-weight: 600;">재료비</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 90px; text-align: center; font-weight: 600;">노무비</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 90px; text-align: center; font-weight: 600;">경비</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 100px; text-align: center; font-weight: 600;">총계</th>
                        <th style="padding: 12px 8px; border: 1px solid #334155; min-width: 140px; text-align: center; font-weight: 600;">작업</th>
                    </tr>
                </thead>
                <tbody>
                    ${unitPriceItems.map(item => {
                        const basic = item.basic;
                        const costs = calculateItemTotalCosts(item);
                        return `
                            <tr style="border-bottom: 1px solid #f3f4f6;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: 500;">${basic?.itemName || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.spacing || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.height || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.size || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.location || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.workType1 || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.workType2 || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.unit || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #334155; font-weight: 600;">${Math.round(costs.material).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #334155; font-weight: 600;">${Math.round(costs.labor).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #334155; font-weight: 600;">${Math.round(costs.expense).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: #334155; font-weight: 600;">${Math.round(costs.total).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
                                    <button onclick="editUnitPriceItem('${item.id}')" class="btn btn-sm"
                                            style="padding: 4px 8px; background: #475569; color: white; border: none; border-radius: 4px; margin-right: 4px; font-size: 11px;">
                                        <i class="fas fa-edit"></i> 수정
                                    </button>
                                    <button onclick="deleteUnitPriceItem('${item.id}')" class="btn btn-sm"
                                            style="padding: 4px 8px; background: #dc2626; color: white; border: none; border-radius: 4px; font-size: 11px;">
                                        <i class="fas fa-trash"></i> 삭제
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

// 일위대가 아이템 수정 (DB 직접 조회 방식)
async function editUnitPriceItem(id) {
    console.log('🔍 editUnitPriceItem 호출됨 (DB 직접 조회):', id, '(타입:', typeof id, ')');
    
    let item;
    
    try {
        // DB에서 직접 조회 (단일 데이터 소스)
        item = await unitPriceDB.getUnitPriceById(id);
        
        if (!item) {
            console.error('❌ DB에서 일위대가 아이템을 찾을 수 없음:', id);
            alert('해당 아이템을 찾을 수 없습니다.');
            return;
        }
        
        console.log('✅ DB에서 일위대가 아이템 조회 성공:', item.basic?.itemName || 'No Name');
        
    } catch (error) {
        console.error('❌ DB 조회 중 오류 발생:', error);
        alert('데이터베이스 조회 중 오류가 발생했습니다.');
        return;
    }
    
    // 현재 모달 닫기
    closeCurrentModal();
    
    // 수정 모달 열기
    setTimeout(() => {
        openUnitPriceBasicModal(item);
    }, 300);
}

// 일위대가 아이템 삭제
async function deleteUnitPriceItem(id) {
    console.log(`🗑️ 일위대가 삭제 요청: ID=${id}`);

    const item = unitPriceItems.find(item => item.id === id);
    if (!item) {
        alert('해당 아이템을 찾을 수 없습니다.');
        return;
    }

    console.log(`📋 삭제할 일위대가: ${item.basic?.itemName || 'Unknown'} (ID: ${id})`);

    // 관련된 벽체 타입 찾기
    console.log(`🔍 관련 벽체 타입 검색 시작...`);
    const relatedWallTypes = findWallTypesUsingUnitPrice(id);
    console.log(`🔍 검색 결과: ${relatedWallTypes.length}개 벽체 타입 발견`);

    const itemName = item.basic?.itemName || 'Unknown';
    let confirmMessage = `"${itemName}" 일위대가를 삭제하시겠습니까?`;

    if (relatedWallTypes.length > 0) {
        confirmMessage += `\n\n⚠️ 이 일위대가를 사용하는 벽체 타입 ${relatedWallTypes.length}개가 있습니다:`;
        relatedWallTypes.forEach(wallType => {
            confirmMessage += `\n- ${wallType.wallType}`;
        });
        confirmMessage += `\n\n관련된 벽체 타입들의 일위대가 연결도 함께 제거됩니다.`;
    }

    if (confirm(confirmMessage)) {
        const success = await unitPriceDB.deleteUnitPrice(id);
        if (success) {
            unitPriceItems = unitPriceItems.filter(item => item.id !== id);

            // 관련된 벽체 타입들의 일위대가 참조 제거
            if (relatedWallTypes.length > 0) {
                const removedCount = removeUnitPriceFromWallTypes(id);
                console.log(`✅ ${relatedWallTypes.length}개 벽체 타입에서 ${removedCount}개 필드의 일위대가 연결 제거됨`);

                // 벽체 타입 관리 모달이 열려있다면 새로고침 시도
                setTimeout(() => {
                    if (window.updateRevitWallTable && typeof window.updateRevitWallTable === 'function') {
                        window.updateRevitWallTable();
                        console.log('🔄 벽체 타입 테이블 새로고침됨');
                    } else {
                        console.log('⚠️ updateRevitWallTable 함수를 찾을 수 없음');
                    }
                }, 100);
            }

            await renderUnitPriceItemsList();
            console.log('✅ 일위대가 아이템 삭제됨:', id);
        } else {
            alert('삭제에 실패했습니다.');
        }
    }
}

// =============================================================================
// 벽체 타입 동기화 관련 함수들
// =============================================================================

// 특정 일위대가를 사용하는 벽체 타입들 찾기
function findWallTypesUsingUnitPrice(unitPriceId) {
    const unitPriceKey = `unitPrice_${unitPriceId}`;
    console.log(`🔑 검색할 키: "${unitPriceKey}"`);
    const relatedWallTypes = [];

    try {
        // window.revitWallTypes에서 벽체 타입 데이터 가져오기
        if (!window.revitWallTypes) {
            console.log('⚠️ window.revitWallTypes가 없음');
            return relatedWallTypes;
        }

        const wallTypes = window.revitWallTypes;
        if (!Array.isArray(wallTypes)) {
            console.log('⚠️ revitWallTypes 데이터가 배열이 아님');
            return relatedWallTypes;
        }

        console.log(`📊 검사할 벽체 타입 수: ${wallTypes.length}개`);

        // 각 벽체 타입의 모든 필드에서 해당 일위대가 사용 여부 확인
        wallTypes.forEach((wallType, index) => {
            console.log(`🔍 벽체타입[${index}]: ${wallType.wallType}`);

            const fields = [
                'layer3_1', 'layer2_1', 'layer1_1',
                'column1', 'infill', 'layer1_2', 'layer2_2', 'layer3_2', 'column2',
                'structure', 'insulation', 'exterior', 'interior', 'etc'
            ];

            // 각 필드의 값 로깅
            fields.forEach(field => {
                if (wallType[field]) {
                    console.log(`  📝 ${field}: "${wallType[field]}"`);
                    if (wallType[field] === unitPriceKey) {
                        console.log(`    ✅ 매치됨!`);
                    }
                }
            });

            const usesUnitPrice = fields.some(field => wallType[field] === unitPriceKey);

            if (usesUnitPrice) {
                console.log(`🎯 벽체타입 "${wallType.wallType}"에서 일위대가 사용됨`);
                relatedWallTypes.push({
                    wallType: wallType.wallType,
                    elementId: wallType.elementId,
                    fields: fields.filter(field => wallType[field] === unitPriceKey)
                });
            }
        });

    } catch (error) {
        console.error('벽체 타입 검색 중 오류:', error);
    }

    return relatedWallTypes;
}

// 벽체 타입들에서 특정 일위대가 참조 제거
function removeUnitPriceFromWallTypes(unitPriceId) {
    const unitPriceKey = `unitPrice_${unitPriceId}`;
    console.log(`🔄 일위대가 참조 제거 시작: ${unitPriceKey}`);

    try {
        // window.revitWallTypes에서 벽체 타입 데이터 가져오기
        if (!window.revitWallTypes) {
            console.log('⚠️ window.revitWallTypes가 없음');
            return 0;
        }

        const wallTypes = window.revitWallTypes;
        if (!Array.isArray(wallTypes)) {
            console.log('⚠️ revitWallTypes 데이터가 배열이 아님');
            return 0;
        }

        console.log(`📊 총 ${wallTypes.length}개 벽체 타입 검사 중...`);
        let updatedCount = 0;

        // 각 벽체 타입에서 해당 일위대가 참조 제거
        wallTypes.forEach((wallType, index) => {
            const fields = [
                'layer3_1', 'layer2_1', 'layer1_1',
                'column1', 'infill', 'layer1_2', 'layer2_2', 'layer3_2', 'column2',
                'structure', 'insulation', 'exterior', 'interior', 'etc'
            ];
            fields.forEach(field => {
                if (wallType[field] === unitPriceKey) {
                    console.log(`🔧 벽체타입[${index}] ${wallType.wallType}의 ${field} 필드에서 제거: ${wallType[field]} → 빈값`);
                    wallType[field] = ''; // 빈 문자열로 초기화
                    updatedCount++;
                }
            });
        });

        // 업데이트된 데이터를 저장 (window.revitWallTypes는 이미 참조로 업데이트됨)
        if (updatedCount > 0) {
            // revitTypeMatching.js의 저장 함수 호출
            if (typeof window.saveRevitWallTypes === 'function') {
                window.saveRevitWallTypes();
                console.log(`✅ 벽체 타입 데이터 저장 완료: ${updatedCount}개 필드 수정됨`);
            } else {
                console.log('⚠️ saveRevitWallTypes 함수를 찾을 수 없음');
            }
        } else {
            console.log('ℹ️ 수정할 필드가 없음');
        }

        return updatedCount;

    } catch (error) {
        console.error('❌ 벽체 타입 업데이트 중 오류:', error);
        return 0;
    }
}

// =============================================================================
// 데이터 내보내기/가져오기 함수들
// =============================================================================

// 일위대가 데이터 내보내기
function exportUnitPriceData() {
    if (unitPriceItems.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        itemsCount: unitPriceItems.length,
        items: unitPriceItems
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `kiyeno_unitprice_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    console.log('✅ 일위대가 데이터 내보내기 완료');
}

// 일위대가 데이터 가져오기
function importUnitPriceData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                
                // 데이터 검증
                if (!importData.items || !Array.isArray(importData.items)) {
                    alert('올바르지 않은 일위대가 데이터 형식입니다.');
                    return;
                }
                
                // 유효한 아이템만 필터링
                const validItems = importData.items.filter(item => 
                    item.basic && item.basic.itemName && item.totalCosts
                );
                
                if (validItems.length === 0) {
                    alert('가져올 수 있는 유효한 일위대가 데이터가 없습니다.');
                    return;
                }
                
                // 기존 데이터와 병합 (중복 ID는 새 데이터로 덮어쓰기)
                const confirmMessage = `${validItems.length}개의 일위대가 데이터를 가져오시겠습니까?\n(기존 데이터와 ID가 같은 경우 덮어쓰기됩니다)`;
                
                if (confirm(confirmMessage)) {
                    // IndexedDB에 데이터 저장
                    Promise.all(validItems.map(async newItem => {
                        await unitPriceDB.saveUnitPrice(newItem);
                        
                        // 메모리 배열도 업데이트
                        const existingIndex = unitPriceItems.findIndex(item => item.id === newItem.id);
                        if (existingIndex >= 0) {
                            unitPriceItems[existingIndex] = newItem;
                        } else {
                            unitPriceItems.push(newItem);
                        }
                    })).then(async () => {
                        await renderUnitPriceItemsList();
                        alert(`${validItems.length}개의 일위대가 아이템을 가져왔습니다.`);
                        console.log('✅ 일위대가 데이터 가져오기 완료');
                    }).catch(error => {
                        console.error('데이터 저장 실패:', error);
                        alert('일부 데이터 저장에 실패했습니다.');
                    });
                }
            } catch (error) {
                console.error('일위대가 데이터 가져오기 실패:', error);
                alert('파일을 읽는 중 오류가 발생했습니다.');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// =============================================================================
// 전역 함수 등록 (unitPriceManager.js)
// =============================================================================

// localStorage 정리 함수 (IndexedDB 마이그레이션 후 정리용)
function cleanupLocalStorage() {
    try {
        localStorage.removeItem('kiyeno_unitPriceItems');
        localStorage.removeItem('kiyeno_unitPriceSession');
        console.log('✅ localStorage 정리 완료');
    } catch (error) {
        console.error('localStorage 정리 실패:', error);
    }
}


// DB에서 일위대가 데이터 로드
async function loadUnitPriceDataFromDB() {
    try {
        console.log('🔄 DB에서 일위대가 데이터 로드 시작...');
        
        // IndexedDB에서 최신 데이터 로드
        const dbItems = await unitPriceDB.getAllUnitPrices();
        
        if (dbItems.length === 0) {
            alert('DB에 저장된 일위대가 데이터가 없습니다.');
            return;
        }
        
        // 메모리 배열 업데이트
        unitPriceItems.length = 0; // 기존 배열 비우기
        unitPriceItems.push(...dbItems); // 새 데이터로 채우기
        
        // 목록 새로고침
        await renderUnitPriceItemsList();
        
        console.log(`✅ DB에서 ${dbItems.length}개 일위대가 데이터 로드 완료`);
        alert(`DB에서 ${dbItems.length}개의 일위대가 데이터를 불러왔습니다.`);
        
    } catch (error) {
        console.error('❌ DB 데이터 로드 실패:', error);
        alert('DB에서 데이터를 불러오는 중 오류가 발생했습니다.');
    }
}


// =============================================================================
// CSS 스타일 추가 (원본에서 분리된 스타일)
// =============================================================================

// 일위대가 관리 관련 CSS 스타일 추가
const unitPriceStyles = document.createElement('style');
unitPriceStyles.textContent = `
/* 일위대가 관리 기본 폼 스타일 */
.unit-price-basic-form {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 30px;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-group label {
    font-weight: bold;
    margin-bottom: 8px;
    color: #333;
    font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s ease;
    background: white;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-group textarea {
    resize: vertical;
    min-height: 100px;
}

.form-grid.full-width {
    grid-template-columns: 1fr;
}

/* 일위대가 상세 입력 폼 스타일 */
.unit-price-detail-form {
    width: 100%;
    min-width: 840px;
    max-width: 1300px;
    margin: 0 auto;
}

.detail-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 25px;
    border: 1px solid #e9ecef;
}

.detail-section h3 {
    margin: 0 0 20px 0;
    color: #495057;
    font-size: 18px;
    font-weight: 600;
    border-bottom: 2px solid #007bff;
    padding-bottom: 10px;
}

.components-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.components-table th,
.components-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e9ecef;
}

.components-table th {
    background: #007bff;
    color: white;
    font-weight: 600;
    font-size: 14px;
}

.components-table td input,
.components-table td select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 14px;
}

.components-table td input:focus,
.components-table td select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.components-table .quantity-cell,
.components-table .unit-price-cell,
.components-table .total-cell {
    width: 120px;
    text-align: right;
}

.components-table .actions-cell {
    width: 80px;
    text-align: center;
}

.components-table .total-cell {
    font-weight: 600;
    color: #007bff;
}

/* 일위대가 관리 버튼 스타일 */
.btn-add-component {
    background: #28a745;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    margin: 10px 0;
    transition: background-color 0.3s ease;
}

.btn-add-component:hover {
    background: #218838;
}

.btn-remove-component {
    background: #dc3545;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.3s ease;
}

.btn-remove-component:hover {
    background: #c82333;
}

/* 일위대가 총계 표시 스타일 */
.grand-total-section {
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    margin-top: 25px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.grand-total-section h3 {
    margin: 0 0 10px 0;
    font-size: 18px;
    font-weight: 600;
}

.grand-total-amount {
    font-size: 24px;
    font-weight: bold;
    margin: 0;
}

/* 일위대가 목록 테이블 스타일 */
.unit-price-list-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-top: 20px;
}

.unit-price-list-table th,
.unit-price-list-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e9ecef;
}

.unit-price-list-table th {
    background: #f8f9fa;
    color: #495057;
    font-weight: 600;
    font-size: 14px;
}

.unit-price-list-table tr:hover {
    background: #f8f9fa;
}

.unit-price-list-table .actions-column {
    width: 120px;
    text-align: center;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
    .form-grid {
        grid-template-columns: 1fr;
        gap: 15px;
    }
    
    .components-table {
        font-size: 12px;
    }
    
    .components-table th,
    .components-table td {
        padding: 8px;
    }
    
    .grand-total-section {
        padding: 15px;
    }
    
    .grand-total-amount {
        font-size: 20px;
    }
}

@media (max-width: 480px) {
    .unit-price-basic-form,
    .unit-price-detail-form {
        padding: 10px;
    }
    
    .detail-section {
        padding: 15px;
        margin-bottom: 15px;
    }
    
    .components-table {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
    }
}
`;

document.head.appendChild(unitPriceStyles);

// =============================================================================
// 자재 선택 기능
// =============================================================================

// 현재 선택 중인 행을 저장하는 변수
let currentMaterialSelectRow = null;

// 자재 선택 모달 열기
function openMaterialSelector(button) {
    console.log('🔍 자재 선택 모달 열기');
    
    // 현재 행 저장 (버튼의 부모 요소들을 통해 tr 찾기)
    currentMaterialSelectRow = button.closest('tr');
    
    if (!currentMaterialSelectRow) {
        console.error('❌ 구성품 행을 찾을 수 없습니다.');
        alert('구성품 행을 찾을 수 없습니다.');
        return;
    }
    
    // 자재 선택 모달 창 생성
    createMaterialSelectModal();
}

// 자재 선택 모달 창 생성
function createMaterialSelectModal() {
    console.log('🏗️ 자재 선택 모달 창 생성');
    
    const modalHTML = `
        <div class="material-select-modal" style="
            position: fixed !important; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5) !important; z-index: 100000 !important; display: flex !important; 
            align-items: center; justify-content: center;
        ">
            <div class="material-select-content" style="
                background: white !important; border-radius: 12px; width: 90%; max-width: 1000px; 
                max-height: 80vh; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                z-index: 100001 !important; position: relative !important;
            ">
                <!-- 헤더 -->
                <div style="background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">
                        <i class="fas fa-search" style="margin-right: 8px;"></i>
                        자재 선택
                    </h3>
                    <button onclick="closeMaterialSelectModal()" style="
                        background: none; border: none; color: white; font-size: 24px; 
                        cursor: pointer; padding: 0; width: 30px; height: 30px; 
                        display: flex; align-items: center; justify-content: center;
                    ">&times;</button>
                </div>
                
                <!-- 필터 영역 -->
                <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                    <!-- 필터 칩 버튼들 -->
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px;">🔍 품명별 필터</label>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            <button class="material-filter-chip active" data-filter="all" onclick="setMaterialFilter('all')" style="
                                padding: 6px 12px; border: 2px solid #475569; background: #475569; color: white;
                                border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s;
                                font-weight: 500;
                            ">전체</button>
                            <button class="material-filter-chip" data-filter="스터드" onclick="setMaterialFilter('스터드')" 
                                onmouseover="this.style.background='#f3f4f6'" onmouseout="if(!this.classList.contains('active')) this.style.background='white'" style="
                                padding: 6px 12px; border: 2px solid #6b7280; background: white; color: #6b7280; 
                                border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s;
                            ">스터드</button>
                            <button class="material-filter-chip" data-filter="런너" onclick="setMaterialFilter('런너')" 
                                onmouseover="this.style.background='#f3f4f6'" onmouseout="if(!this.classList.contains('active')) this.style.background='white'" style="
                                padding: 6px 12px; border: 2px solid #6b7280; background: white; color: #6b7280; 
                                border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s;
                            ">런너</button>
                            <button class="material-filter-chip" data-filter="피스" onclick="setMaterialFilter('피스')" 
                                onmouseover="this.style.background='#f3f4f6'" onmouseout="if(!this.classList.contains('active')) this.style.background='white'" style="
                                padding: 6px 12px; border: 2px solid #6b7280; background: white; color: #6b7280; 
                                border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s;
                            ">피스</button>
                            <button class="material-filter-chip" data-filter="타정총알" onclick="setMaterialFilter('타정총알')" 
                                onmouseover="this.style.background='#f3f4f6'" onmouseout="if(!this.classList.contains('active')) this.style.background='white'" style="
                                padding: 6px 12px; border: 2px solid #6b7280; background: white; color: #6b7280; 
                                border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s;
                            ">타정총알</button>
                            <button class="material-filter-chip" data-filter="용접봉" onclick="setMaterialFilter('용접봉')" 
                                onmouseover="this.style.background='#f3f4f6'" onmouseout="if(!this.classList.contains('active')) this.style.background='white'" style="
                                padding: 6px 12px; border: 2px solid #6b7280; background: white; color: #6b7280; 
                                border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s;
                            ">용접봉</button>
                            <button class="material-filter-chip" data-filter="석고보드" onclick="setMaterialFilter('석고보드')" 
                                onmouseover="this.style.background='#f3f4f6'" onmouseout="if(!this.classList.contains('active')) this.style.background='white'" style="
                                padding: 6px 12px; border: 2px solid #6b7280; background: white; color: #6b7280; 
                                border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s;
                            ">석고보드</button>
                        </div>
                    </div>
                    <!-- 검색창 -->
                    <div style="display: flex; align-items: center;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 14px;">추가 검색</label>
                            <input type="text" id="materialSearchInput" placeholder="품명으로 추가 검색하세요" 
                                   oninput="filterMaterials()" style="
                                width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; 
                                border-radius: 6px; font-size: 14px;
                            ">
                        </div>
                        <button onclick="clearMaterialFilters()" style="
                            margin-left: 10px; margin-top: 20px; padding: 8px 12px;
                            background: #475569; color: white; border: none; border-radius: 6px;
                            font-size: 12px; cursor: pointer;
                        " title="필터 초기화">초기화</button>
                    </div>
                </div>
                
                <!-- 자재 목록 -->
                <div id="materialListContainer" style="padding: 20px; max-height: 400px; overflow-y: auto;">
                    자재 데이터를 로드하는 중...
                </div>
                
            </div>
        </div>
    `;
    
    // 기존 자재선택 모달이 있다면 제거
    const existingModal = document.querySelector('.material-select-modal');
    if (existingModal) {
        existingModal.remove();
        console.log('🗑️ 기존 자재선택 모달 제거');
    }
    
    // 모달 추가 (body 마지막에 확실히 추가)
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('📄 자재선택 모달 DOM 추가됨');
    
    // DOM 추가 후 z-index 강제 적용 (모든 모달 위에 표시)
    setTimeout(() => {
        const modal = document.querySelector('.material-select-modal');
        if (modal) {
            // 다른 모든 모달들보다 높은 z-index로 설정
            modal.style.zIndex = '100000';
            modal.style.position = 'fixed';
            // 추가로 CSS 속성들 강제 적용
            modal.style.display = 'flex';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            
            // 내부 content도 z-index 재설정
            const content = modal.querySelector('.material-select-content');
            if (content) {
                content.style.zIndex = '100001';
                content.style.position = 'relative';
            }
            
            console.log('🔝 자재선택 모달 z-index 강제 적용: 100000');
            console.log('📊 현재 DOM 내 모달들:', document.querySelectorAll('[class*="modal"]').length, '개');
            
            // 다른 모든 모달들의 z-index를 확인하고 낮춤
            const allModals = document.querySelectorAll('.modal-overlay, .sub-modal-overlay');
            allModals.forEach((m, index) => {
                if (!m.classList.contains('material-select-modal')) {
                    const currentZ = parseInt(m.style.zIndex) || 0;
                    if (currentZ >= 100000) {
                        m.style.zIndex = Math.min(currentZ, 99000);
                        console.log(`📉 다른 모달 z-index 조정: ${currentZ} → ${m.style.zIndex}`);
                    }
                }
            });
        } else {
            console.error('❌ 자재선택 모달을 DOM에서 찾을 수 없음');
        }
    }, 10);
    
    // 자재 데이터 로드
    loadMaterialsForSelection();
}

// 자재 선택 모달 닫기
function closeMaterialSelectModal() {
    const modal = document.querySelector('.material-select-modal');
    if (modal) {
        modal.remove();
    }
    currentMaterialSelectRow = null;
}

// 자재 데이터 로드 (KiyenoMaterialsDB v3 materials 테이블 직접 조회)
async function loadMaterialsForSelection() {
    console.log('📦 자재 선택용 데이터 로드 시작 (KiyenoMaterialsDB v3 materials 테이블 직접 조회)');
    
    try {
        let allMaterials = [];
        
        // 1순위: KiyenoMaterialsDB v3의 materials 테이블에서 직접 데이터 로드
        try {
            console.log('🔍 KiyenoMaterialsDB v3 materials 테이블 직접 조회...');
            
            const materialsFromDB = await new Promise((resolve, reject) => {
                const request = indexedDB.open('KiyenoMaterialsDB', 3);
                
                request.onerror = () => {
                    console.error('❌ KiyenoMaterialsDB 열기 실패');
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(['materials'], 'readonly');
                    const store = transaction.objectStore('materials');
                    const getAllRequest = store.getAll();
                    
                    getAllRequest.onsuccess = () => {
                        const materials = getAllRequest.result || [];
                        console.log(`✅ KiyenoMaterialsDB materials 테이블에서 ${materials.length}개 데이터 로드`);
                        resolve(materials);
                    };
                    
                    getAllRequest.onerror = () => {
                        console.error('❌ materials 테이블 데이터 조회 실패');
                        reject(getAllRequest.error);
                    };
                };
                
                request.onupgradeneeded = (event) => {
                    console.log('🔧 KiyenoMaterialsDB v3 구조 생성/업그레이드...');
                    const db = event.target.result;
                    
                    // materials 테이블이 없으면 생성
                    if (!db.objectStoreNames.contains('materials')) {
                        const materialsStore = db.createObjectStore('materials', { keyPath: 'id' });
                        materialsStore.createIndex('name', 'name', { unique: false });
                        materialsStore.createIndex('category', 'category', { unique: false });
                    }
                    
                    // gypsum 테이블이 없으면 생성
                    if (!db.objectStoreNames.contains('gypsum')) {
                        const gypsumStore = db.createObjectStore('gypsum', { keyPath: 'id' });
                        gypsumStore.createIndex('name', 'name', { unique: false });
                        gypsumStore.createIndex('category', 'category', { unique: false });
                    }
                    
                    // unitPrices 테이블이 없으면 생성 (일위대가용)
                    if (!db.objectStoreNames.contains('unitPrices')) {
                        const unitPricesStore = db.createObjectStore('unitPrices', { keyPath: 'id' });
                        unitPricesStore.createIndex('itemName', 'basic.itemName', { unique: false });
                        unitPricesStore.createIndex('createdAt', 'createdAt', { unique: false });
                    }
                    
                    // wallTypeMasters 테이블이 없으면 생성 (v3 신규 테이블)
                    if (!db.objectStoreNames.contains('wallTypeMasters')) {
                        const wallTypeMastersStore = db.createObjectStore('wallTypeMasters', { keyPath: 'id' });
                        wallTypeMastersStore.createIndex('name', 'name', { unique: false });
                        wallTypeMastersStore.createIndex('createdAt', 'createdAt', { unique: false });
                        wallTypeMastersStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    }
                };
            });
            
            // KiyenoMaterialsDB 데이터를 자재 선택 형식으로 변환
            if (materialsFromDB && materialsFromDB.length > 0) {
                console.log('✅ KiyenoMaterialsDB 데이터 변환 시작');
                
                // ID 순서로 정렬 (자재관리와 동일한 순서)
                materialsFromDB.sort((a, b) => {
                    const idA = a.id || 0;
                    const idB = b.id || 0;
                    return idA - idB;
                });
                
                materialsFromDB.forEach(item => {
                    // 실제 필드 구조 확인을 위한 로그
                    if (allMaterials.length === 0) {
                        console.log('📋 첫 번째 DB 아이템 구조:', item);
                    }
                    
                    const material = {
                        id: item.id || 0,  // ID 추가
                        품명: item.name || item.품명 || '',
                        규격: item.규격 || item.spec || item.specification || item.size || '',
                        싸이즈: item.size || item.싸이즈 || '',
                        단위: item.unit || item.단위 || '',
                        재료비단가: item.재료비단가 || item.materialCost || item.materialPrice || item.price || 0,
                        노무비단가: item.노무비단가 || item.laborPrice || item.laborCost || 0,
                        category: item.category || '기타',
                        source: 'KiyenoMaterialsDB',
                        originalData: item
                    };
                    
                    allMaterials.push(material);
                });
                
                console.log(`✅ KiyenoMaterialsDB 데이터 변환 완료: ${allMaterials.length}개`);
                
                // 첫 번째 변환된 데이터 샘플 로그
                if (allMaterials.length > 0) {
                    const sample = allMaterials[0];
                    console.log('📋 변환된 샘플 데이터:', {
                        품명: sample.품명,
                        재료비단가: sample.재료비단가,
                        노무비단가: sample.노무비단가,
                        source: sample.source
                    });
                }
            }
            
        } catch (dbError) {
            console.warn('⚠️ KiyenoMaterialsDB 조회 실패, fallback 사용:', dbError);
        }
        
        // 2순위: KiyenoMaterialsDB에 데이터가 없는 경우 기본 데이터 사용
        if (allMaterials.length === 0 && window.priceDatabase) {
            console.log('🔄 KiyenoMaterialsDB에 데이터가 없어 기본 데이터 사용');
            
            try {
                const hardcodedLightweight = window.priceDatabase.getOriginalLightweightData();
                const hardcodedGypsum = window.priceDatabase.getOriginalGypsumData();
                
                // 경량자재 기본 데이터
                hardcodedLightweight.forEach(item => {
                    const material = {
                        id: item.id || 0,  // ID 추가
                        품명: item.name,
                        규격: item.규격 || item.spec || item.specification || '',
                        싸이즈: item.size || item.싸이즈 || '',
                        단위: item.unit,
                        재료비단가: item.재료비단가 || item.materialCost || item.materialPrice || item.price || 0,
                        노무비단가: item.노무비단가 || item.laborPrice || item.laborCost || 0,
                        category: '경량자재',
                        source: 'hardcoded_fallback',
                        originalData: item
                    };
                    allMaterials.push(material);
                });
                
                // 석고보드 기본 데이터
                hardcodedGypsum.forEach(item => {
                    const material = {
                        id: item.id || 0,  // ID 추가
                        품명: item.name,
                        규격: item.규격 || item.spec || item.specification || '',
                        싸이즈: item.size || item.싸이즈 || '',
                        단위: item.unit,
                        재료비단가: item.재료비단가 || item.materialCost || item.materialPrice || item.price || 0,
                        노무비단가: item.노무비단가 || item.laborPrice || item.laborCost || 0,
                        category: '석고보드',
                        source: 'hardcoded_fallback',
                        originalData: item
                    };
                    allMaterials.push(material);
                });
                
                // fallback 데이터도 ID 순서로 정렬
                allMaterials.sort((a, b) => {
                    const idA = a.id || 0;
                    const idB = b.id || 0;
                    return idA - idB;
                });
                
                console.log(`✅ 기본 데이터 fallback 완료: ${allMaterials.length}개`);
                
            } catch (error) {
                console.error('❌ 기본 데이터 fallback 실패:', error);
            }
        }
        
        console.log(`📦 로드된 자재 수: ${allMaterials.length}개`);
        
        if (allMaterials.length === 0) {
            throw new Error('자재 데이터를 찾을 수 없습니다.');
        }
        
        // 자재 목록 렌더링
        renderMaterialsList(allMaterials);
        
        // 전역 변수에 저장 (필터링용 - 원본 데이터 보존)
        window.currentMaterialsData = allMaterials;
        window.originalMaterialsData = [...allMaterials]; // 원본 데이터 복사본 저장
        
    } catch (error) {
        console.error('❌ 자재 데이터 로드 실패:', error);
        
        const container = document.getElementById('materialListContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>자재 데이터를 로드할 수 없습니다.</p>
                    <p style="font-size: 14px; color: #6b7280;">KiyenoMaterialsDB 연결을 확인해주세요.</p>
                    <p style="font-size: 12px; color: #9ca3af;">오류: ${error.message}</p>
                </div>
            `;
        }
    }
}

// 자재 목록 렌더링
function renderMaterialsList(materials) {
    const container = document.getElementById('materialListContainer');
    if (!container) return;
    
    if (materials.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>조건에 맞는 자재가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 6px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="background: linear-gradient(135deg, #475569 0%, #334155 100%); position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 10px 8px; border-bottom: 1px solid #334155; text-align: center; font-weight: 600; color: white;">품명</th>
                        <th style="padding: 10px 8px; border-bottom: 1px solid #334155; text-align: center; font-weight: 600; color: white;">규격</th>
                        <th style="padding: 10px 8px; border-bottom: 1px solid #334155; text-align: center; font-weight: 600; color: white;">싸이즈</th>
                        <th style="padding: 10px 8px; border-bottom: 1px solid #334155; text-align: center; font-weight: 600; color: white;">단위</th>
                        <th style="padding: 10px 8px; border-bottom: 1px solid #334155; text-align: center; font-weight: 600; color: white;">재료비 단가</th>
                        <th style="padding: 10px 8px; border-bottom: 1px solid #334155; text-align: center; font-weight: 600; color: white;">노무비 단가</th>
                        <th style="padding: 10px 8px; border-bottom: 1px solid #334155; text-align: center; font-weight: 600; color: white;">선택</th>
                    </tr>
                </thead>
                <tbody>
                    ${materials.map((material, index) => `
                        <tr style="border-bottom: 1px solid #f3f4f6;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: 500;">
                                <span style="color: #6b7280; font-size: 10px; font-weight: 400; margin-right: 8px;">[${material.id || 'N/A'}]</span>${material.품명 || material.name || ''}
                            </td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: center;">${material.규격 || material.spec || ''}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: center;">${material.싸이즈 || material.size || ''}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: center;">${material.단위 || material.unit || ''}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: right;">${(material.재료비단가 || material.materialCost || material.materialPrice || 0).toLocaleString()}원</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: right;">${(material.노무비단가 || material.laborPrice || 0).toLocaleString()}원</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: center;">
                                <div style="display: flex; gap: 4px; justify-content: center;">
                                    <button onclick="selectUnitPriceMaterial(${index})" style="
                                        padding: 4px 8px; background: #475569; color: white; border: none;
                                        border-radius: 4px; cursor: pointer; font-size: 11px;
                                    " title="이 자재 선택">
                                        <i class="fas fa-check"></i> 선택
                                    </button>
                                    <button onclick="editMaterialFromSelector(${index})" style="
                                        padding: 4px 8px; background: #64748b; color: white; border: none;
                                        border-radius: 4px; cursor: pointer; font-size: 11px;
                                    " title="이 자재 수정">
                                        <i class="fas fa-edit"></i> 수정
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

// 현재 선택된 필터 (전역 변수)
let currentMaterialFilter = 'all';

// 자재 필터링 (품명 검색 + 필터 칩)
function filterMaterials() {
    console.log('🔍 자재 필터링 시작 (품명 검색 + 필터 칩)');
    
    // 원본 데이터 사용 (필터링으로 인한 데이터 손실 방지)
    const originalData = window.originalMaterialsData || window.currentMaterialsData;
    if (!originalData) {
        console.warn('⚠️ 원본 자재 데이터가 없습니다.');
        return;
    }
    
    const searchText = document.getElementById('materialSearchInput')?.value.toLowerCase() || '';
    
    console.log('🔍 검색어:', searchText, '| 필터:', currentMaterialFilter);
    
    const filteredMaterials = originalData.filter(material => {
        // 1. 필터 칩 조건 확인
        let filterMatch = true;
        if (currentMaterialFilter !== 'all') {
            const materialName = (material.품명 || material.name || '').toLowerCase();
            filterMatch = materialName.includes(currentMaterialFilter.toLowerCase());
        }
        
        // 2. 품명 검색 조건 확인
        const materialName = (material.품명 || material.name || '').toLowerCase();
        const materialSpec = (material.규격 || material.spec || '').toLowerCase();
        const materialUnit = (material.단위 || material.unit || '').toLowerCase();
        
        const searchMatch = !searchText || 
            materialName.includes(searchText) ||
            materialSpec.includes(searchText) ||
            materialUnit.includes(searchText);
        
        if (searchText && searchMatch && filterMatch) {
            console.log('🎯 검색 매치:', {
                품명: material.품명,
                searchText,
                materialName,
                match: materialName.includes(searchText)
            });
        }
        
        return filterMatch && searchMatch;
    });
    
    console.log(`✅ 필터링 완료: ${filteredMaterials.length}/${originalData.length}개`);
    
    // 필터된 결과를 currentMaterialsData에 저장 (selectUnitPriceMaterial에서 사용)
    window.currentMaterialsData = filteredMaterials;
    
    renderMaterialsList(filteredMaterials);
}

// 필터 칩 선택 함수
function setMaterialFilter(filterType) {
    console.log('🔍 필터 칩 선택:', filterType);
    
    // 현재 필터 업데이트
    currentMaterialFilter = filterType;
    
    // 모든 필터 칩 버튼의 스타일 초기화
    const allChips = document.querySelectorAll('.material-filter-chip');
    allChips.forEach(chip => {
        chip.style.background = 'white';
        chip.style.color = '#6b7280';
        chip.style.borderColor = '#6b7280';
        chip.classList.remove('active');
    });
    
    // 선택된 필터 칩 활성화
    const selectedChip = document.querySelector(`[data-filter="${filterType}"]`);
    if (selectedChip) {
        selectedChip.style.background = '#475569';
        selectedChip.style.color = 'white';
        selectedChip.style.borderColor = '#475569';
        selectedChip.style.fontWeight = '500';
        selectedChip.classList.add('active');
    }
    
    // 필터링 실행
    filterMaterials();
}

// 필터 초기화 함수
function clearMaterialFilters() {
    console.log('🔄 자재 필터 초기화');
    
    // 검색창 초기화
    const searchInput = document.getElementById('materialSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // 필터 칩을 '전체'로 설정
    setMaterialFilter('all');
}


// 자재 선택 처리 (일위대가용)
function selectUnitPriceMaterial(materialIndex) {
    console.log('🔍 자재 선택 시작 - 인덱스:', materialIndex);
    console.log('🔍 currentMaterialsData:', window.currentMaterialsData?.length || 0, '개');
    console.log('🔍 currentMaterialSelectRow:', currentMaterialSelectRow);
    
    if (!window.currentMaterialsData || !currentMaterialSelectRow) {
        console.error('❌ 자재 데이터 또는 선택 행이 없습니다.');
        console.error('  - 자재 데이터:', !!window.currentMaterialsData);
        console.error('  - 선택 행:', !!currentMaterialSelectRow);
        alert('자재 데이터 또는 구성품 행을 찾을 수 없습니다.');
        return;
    }
    
    const selectedMaterial = window.currentMaterialsData[materialIndex];
    if (!selectedMaterial) {
        console.error('❌ 선택된 자재를 찾을 수 없습니다. 인덱스:', materialIndex);
        console.error('  - 전체 자재 수:', window.currentMaterialsData.length);
        alert('선택된 자재를 찾을 수 없습니다.');
        return;
    }
    
    console.log('✅ 자재 선택됨:', selectedMaterial);
    
    // 구성품 행에 자재 데이터 입력
    fillComponentRowWithMaterial(currentMaterialSelectRow, selectedMaterial);
    
    // 모달 닫기
    closeMaterialSelectModal();
}

// 선택된 자재 데이터로 구성품 행 채우기
function fillComponentRowWithMaterial(row, material) {
    console.log('🔧 구성품 행 데이터 입력 시작');
    console.log('  - 행:', row);
    console.log('  - 자재:', material);
    
    if (!row || !material) {
        console.error('❌ 행 또는 자재 데이터가 없습니다.');
        return;
    }
    
    try {
        // 자재 ID 저장 (정확한 자재 추적을 위함)
        if (material.id) {
            row.setAttribute('data-material-id', material.id);
        }
        
        // 각 필드별로 데이터 입력 (span 요소 지원)
        const nameElement = row.querySelector('.component-name');
        const specElement = row.querySelector('.component-spec');
        const unitElement = row.querySelector('.component-unit');
        const materialPriceElement = row.querySelector('.component-material-price');
        const laborPriceElement = row.querySelector('.component-labor-price');
        const laborAmountElement = row.querySelector('.labor-amount');
        
        
        // span 요소인지 input 요소인지 확인하여 적절히 처리
        if (nameElement) {
            const materialName = material.품명 || material.name || '';
            if (nameElement.tagName === 'SPAN') {
                nameElement.textContent = materialName;
            } else {
                nameElement.value = materialName;
            }
        }
        
        if (specElement) {
            const materialSpec = material.규격 || material.spec || material.specification || '';
            if (specElement.tagName === 'SPAN') {
                specElement.textContent = materialSpec || '-';
            } else {
                specElement.value = materialSpec;
            }
        }
        
        if (unitElement) {
            const materialUnit = material.단위 || material.unit || '';
            if (unitElement.tagName === 'SPAN') {
                unitElement.textContent = materialUnit || '-';
            } else {
                unitElement.value = materialUnit;
            }
        }
        
        if (materialPriceElement) {
            const materialPrice = material.재료비단가 || material.materialCost || material.materialPrice || material.price || 0;
            if (materialPriceElement.tagName === 'SPAN') {
                materialPriceElement.textContent = `${Number(materialPrice).toLocaleString()}원`;
            } else {
                materialPriceElement.value = materialPrice;
            }
        }
        
        // 노무비 처리: 금액 컬럼에 입력 (노무비단가 값을 금액 컬럼에 입력)
        const laborCost = material.노무비단가 || material.laborPrice || material.laborCost || 0;
        
        if (laborCost > 0 && laborAmountElement) {
            // 노무비를 금액 컬럼에 설정 (단가가 아닌 금액으로)
            laborAmountElement.textContent = `${laborCost.toLocaleString()}원`;
            console.log(`🔧 노무비 금액 설정: ${laborCost}원 (금액 컬럼)`);
            
            // 단가 컬럼은 계산 후 자동 업데이트되도록 0으로 초기화
            if (laborPriceElement) {
                if (laborPriceElement.tagName === 'SPAN') {
                    laborPriceElement.textContent = '0원';
                } else {
                    laborPriceElement.value = 0;
                }
            }
        }
        
        // 수량을 기본값 1로 설정 (자재 선택 시에만)
        const quantityInput = row.querySelector('.component-quantity');
        if (quantityInput && (!quantityInput.value || quantityInput.value == 0)) {
            quantityInput.value = 1;
        }
        
        console.log('🔧 입력된 값들:');
        console.log('  - 품명:', material.품명 || material.name || '');
        console.log('  - 싸이즈:', material.규격 || material.size || material.spec || '');
        console.log('  - 단위:', material.단위 || material.unit || '');
        console.log('  - 재료비단가:', material.재료비단가 || material.materialCost || material.materialPrice || material.price || 0);
        console.log('  - 노무비금액:', material.노무비단가 || material.laborPrice || material.laborCost || 0, '(금액 컬럼에 입력)');
        console.log('  - 수량:', quantityInput?.value || 1);
        
        // 행 총계 다시 계산
        if (quantityInput) {
            console.log('🔄 자재 선택 후 calculateRowTotal 호출');
            calculateRowTotal(quantityInput);
        } else {
            console.log('❌ quantityInput이 없어서 calculateRowTotal 호출 실패');
        }
        
        console.log('✅ 구성품 행에 자재 데이터 입력 완료');
        
    } catch (error) {
        console.error('❌ 자재 데이터 입력 실패:', error);
        alert('자재 데이터를 입력하는 중 오류가 발생했습니다.');
    }
}

// 자재 선택기에서 수정 버튼 클릭 시 자재 관리 모달 열기
function editMaterialFromSelector(materialIndex) {
    console.log('🔧 자재 수정 요청 - 인덱스:', materialIndex);
    
    if (!window.currentMaterialsData || materialIndex >= window.currentMaterialsData.length) {
        console.error('❌ 유효하지 않은 자재 인덱스:', materialIndex);
        alert('유효하지 않은 자재입니다.');
        return;
    }
    
    const selectedMaterial = window.currentMaterialsData[materialIndex];
    console.log('🔧 수정할 자재:', selectedMaterial);
    
    // 자재선택 모달은 닫지 않고 유지 (자재관리 모달이 위에 표시됨)
    console.log('📌 자재선택 모달 유지, 자재관리 모달을 위에 표시');
    
    // 자재 관리 모달 열기 (자재선택 모달 위에) - 안정성을 위한 재시도 로직 포함
    function tryOpenMaterialManagementModal(retryCount = 0) {
        if (typeof window.showMaterialManagementModal === 'function') {
            console.log('✅ 자재관리 모달 열기 (자재선택 모달 위에)');
            try {
                window.showMaterialManagementModal();
                console.log('✅ showMaterialManagementModal 호출 완료');
                
                // 모달이 열린 후 해당 자재를 찾아서 수정 모드로 전환
                setTimeout(() => {
                    searchAndEditMaterial(selectedMaterial);
                }, 500);
            } catch (error) {
                console.error('❌ showMaterialManagementModal 호출 중 오류:', error);
                alert('자재관리 모달을 열 수 없습니다: ' + error.message);
            }
        } else if (retryCount < 3) {
            // 함수가 아직 로드되지 않은 경우 재시도 (최대 3회)
            console.log(`⏳ 함수 로딩 대기 중... (재시도 ${retryCount + 1}/3)`);
            setTimeout(() => {
                tryOpenMaterialManagementModal(retryCount + 1);
            }, 100);
        } else {
            console.error('❌ showMaterialManagementModal 함수를 찾을 수 없습니다.');
            alert('자재관리 모달 함수를 찾을 수 없습니다. 페이지를 새로고침해 주세요.');
        }
    }
    
    tryOpenMaterialManagementModal();
}

// 자재 관리 모달에서 특정 자재 찾아서 수정 모드로 전환
function searchAndEditMaterial(material) {
    console.log('🔍 자재 검색 및 수정 모드 전환:', material);
    
    try {
        // 자재 검색어로 자재명 사용
        const searchTerm = material.품명 || material.name || '';
        if (!searchTerm) {
            console.warn('⚠️ 검색할 자재명이 없습니다.');
            return;
        }
        
        // 검색 입력창 찾기 및 검색어 입력
        const searchInput = document.querySelector('#materialSearchInput, .search-input, input[placeholder*="검색"]');
        if (searchInput) {
            searchInput.value = searchTerm;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('✅ 검색어 설정:', searchTerm);
        }
        
        // 토스트 메시지로 사용자에게 안내
        if (typeof showToast === 'function') {
            showToast(`"${searchTerm}" 자재를 검색했습니다. 해당 자재를 찾아 수정하세요.`, 'info');
        }
        
    } catch (error) {
        console.error('❌ 자재 검색 중 오류:', error);
    }
}

// =============================================================================
// 자재 데이터 업데이트 이벤트 리스너 (자재 관리에서 저장 시 캐시 무효화)
// =============================================================================

// 자재 데이터 업데이트 이벤트 리스너 설정 (통합 버전)
window.addEventListener('materialDataUpdated', function(event) {
    console.log('📡 자재 데이터 업데이트 이벤트 수신:', event.detail);

    // 자재 선택용 캐시 무효화
    if (window.priceDatabase) {
        console.log('🔄 자재 선택용 캐시 무효화...');
        window.priceDatabase.lightweightItemsCache = null;
        window.priceDatabase.gypsumItemsCache = null;
        console.log('✅ 자재 선택에서 다음 선택 시 최신 데이터가 로드됩니다');
    }

    // 현재 자재선택 모달이 열려있다면 데이터 새로고침
    const materialSelectModal = document.querySelector('.material-select-modal');
    if (materialSelectModal && materialSelectModal.style.display !== 'none') {
        console.log('🔄 자재선택 모달 데이터 새로고침...');
        setTimeout(() => {
            loadMaterialsForSelection(); // 자재 데이터 다시 로드
        }, 300);
    }

    // 일위대가 관리 모달이 열려있으면 즉시 UI 갱신
    const unitPriceModal = document.getElementById('unitPriceModal');
    const isModalOpen = unitPriceModal && unitPriceModal.style.display !== 'none';

    if (isModalOpen) {
        console.log('🔄 일위대가 관리 모달이 열려있음 - 즉시 UI 갱신');
        setTimeout(() => {
            refreshActiveUnitPriceComponents();
        }, 100);
    }

    console.log('✅ 자재 데이터 업데이트 이벤트 처리 완료');
});

// =============================================================================
// 세션 상태 보존 시스템
// =============================================================================

// 일위대가 관리 모달 세션 상태 저장
function saveUnitPriceSession() {
    try {
        const modal = document.getElementById('unitPriceModal');
        if (!modal || modal.style.display === 'none') {
            return null;
        }

        console.log('💾 일위대가 관리 세션 상태 저장 중...');

        // 현재 입력된 모든 데이터 수집
        const sessionData = {
            // 기본 정보
            itemName: document.getElementById('unitPriceItemName')?.value || '',
            workType: document.getElementById('unitPriceWorkType')?.value || '',
            unit: document.getElementById('unitPriceUnit')?.value || '',
            note: document.getElementById('unitPriceNote')?.value || '',
            
            // 세부 구성품 데이터
            components: [],
            
            // 총합 정보
            totals: {
                materialTotal: 0,
                laborTotal: 0,
                grandTotal: 0
            },
            
            // 고정 비율 정보
            fixedRates: {
                materialLoss: parseFloat(document.querySelector('.material-loss-row .fixed-quantity')?.value) || 3,
                transportCost: parseFloat(document.querySelector('.transport-cost-row .fixed-quantity')?.value) || 1.5,
                materialProfit: parseFloat(document.querySelector('.material-profit-row .fixed-quantity')?.value) || 15,
                toolExpense: parseFloat(document.querySelector('.tool-expense-row .fixed-quantity')?.value) || 2
            },
            
            // 메타데이터
            savedAt: new Date().toISOString(),
            modalWasOpen: true
        };

        // 모든 세부 구성품 행 데이터 수집
        const componentRows = document.querySelectorAll('.component-row');
        componentRows.forEach((row, index) => {
            // span 요소와 input 요소를 모두 지원하는 데이터 읽기 함수
            const getElementValue = (element) => {
                if (!element) return '';
                if (element.tagName === 'SPAN') {
                    return element.textContent.replace(/원$/, '').replace(/,/g, '').trim();
                } else {
                    return element.value;
                }
            };
            
            const componentData = {
                name: getElementValue(row.querySelector('.component-name')) || '',
                materialId: row.getAttribute('data-material-id') || null, // 세션 저장 시 materialId 포함
                size: getElementValue(row.querySelector('.component-size') || row.querySelector('.component-spec')) || '',
                unit: getElementValue(row.querySelector('.component-unit')) || '',
                quantity: row.querySelector('.component-quantity')?.value || '1',
                materialPrice: getElementValue(row.querySelector('.component-material-price')) || '0',
                laborPrice: getElementValue(row.querySelector('.component-labor-price')) || '0',
                subtotal: row.querySelector('.component-subtotal')?.textContent || '0'
            };
            sessionData.components.push(componentData);
        });

        // 총합 정보 수집
        sessionData.totals.materialTotal = document.getElementById('unitPriceMaterialTotal')?.textContent?.replace(/[^\d]/g, '') || '0';
        sessionData.totals.laborTotal = document.getElementById('unitPriceLaborTotal')?.textContent?.replace(/[^\d]/g, '') || '0';
        sessionData.totals.grandTotal = document.getElementById('unitPriceGrandTotal')?.textContent?.replace(/[^\d]/g, '') || '0';

        // sessionStorage에 저장
        sessionStorage.setItem('unitPriceSession', JSON.stringify(sessionData));
        console.log(`✅ 일위대가 관리 세션 저장 완료 (구성품 ${sessionData.components.length}개)`);
        
        return sessionData;
    } catch (error) {
        console.error('❌ 세션 저장 실패:', error);
        return null;
    }
}

// 일위대가 관리 모달 세션 상태 복원
function restoreUnitPriceSession() {
    try {
        const sessionJson = sessionStorage.getItem('unitPriceSession');
        if (!sessionJson) {
            console.log('📝 저장된 세션이 없습니다.');
            return false;
        }

        const sessionData = JSON.parse(sessionJson);
        if (!sessionData.modalWasOpen) {
            console.log('📝 이전에 모달이 열려있지 않았습니다.');
            return false;
        }

        console.log('🔄 일위대가 관리 세션 복원 중...');

        // 기본 정보 복원
        if (document.getElementById('unitPriceItemName')) {
            document.getElementById('unitPriceItemName').value = sessionData.itemName || '';
        }
        if (document.getElementById('unitPriceWorkType')) {
            document.getElementById('unitPriceWorkType').value = sessionData.workType || '';
        }
        if (document.getElementById('unitPriceUnit')) {
            document.getElementById('unitPriceUnit').value = sessionData.unit || '';
        }
        if (document.getElementById('unitPriceNote')) {
            document.getElementById('unitPriceNote').value = sessionData.note || '';
        }

        // 고정 비율 복원
        if (sessionData.fixedRates) {
            const materialLossInput = document.querySelector('.material-loss-row .fixed-quantity');
            const transportCostInput = document.querySelector('.transport-cost-row .fixed-quantity');
            const materialProfitInput = document.querySelector('.material-profit-row .fixed-quantity');
            const toolExpenseInput = document.querySelector('.tool-expense-row .fixed-quantity');
            
            if (materialLossInput) materialLossInput.value = sessionData.fixedRates.materialLoss || 3;
            if (transportCostInput) transportCostInput.value = sessionData.fixedRates.transportCost || 1.5;
            if (materialProfitInput) materialProfitInput.value = sessionData.fixedRates.materialProfit || 15;
            if (toolExpenseInput) toolExpenseInput.value = sessionData.fixedRates.toolExpense || 2;
            
            console.log('✅ 고정 비율 복원:', sessionData.fixedRates);
        }

        // 기존 구성품 행 제거
        const existingRows = document.querySelectorAll('.component-row');
        existingRows.forEach(row => row.remove());

        // 세부 구성품 복원
        sessionData.components.forEach((componentData, index) => {
            const row = createComponentRow(componentData, index);
            const tbody = document.querySelector('#unitPriceComponentsTable tbody');
            if (tbody) {
                tbody.appendChild(row);
            }
        });

        // 총합 재계산
        setTimeout(() => {
            calculateGrandTotal();
            console.log(`✅ 일위대가 관리 세션 복원 완료 (구성품 ${sessionData.components.length}개)`);
        }, 100);

        return true;
    } catch (error) {
        console.error('❌ 세션 복원 실패:', error);
        return false;
    }
}

// 세션 상태 정리
function clearUnitPriceSession() {
    try {
        sessionStorage.removeItem('unitPriceSession');
        console.log('🗑️ 일위대가 관리 세션 정리 완료');
    } catch (error) {
        console.error('❌ 세션 정리 실패:', error);
    }
}

// 구성품 행 생성 함수 (복원용)
function createComponentRow(data, index) {
    const row = document.createElement('tr');
    row.className = 'component-row';
    row.innerHTML = `
        <td style="text-align: center; padding: 8px;">
            <span class="component-name" style="font-size: 12px; color: #374151;">${data.name || '자재를 선택해주세요'}</span>
        </td>
        <td style="text-align: center; padding: 8px;">
            <span class="component-size" style="font-size: 12px; color: #374151;">${data.size || '-'}</span>
        </td>
        <td style="text-align: center; padding: 8px;">
            <span class="component-unit" style="font-size: 12px; color: #374151;">${data.unit || '-'}</span>
        </td>
        <td style="text-align: center; padding: 8px;">
            <input type="number" class="component-quantity" value="${data.quantity}" 
                   style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;"
                   onchange="updateComponentSubtotal(this.closest('tr'))">
        </td>
        <td style="text-align: center; padding: 8px;">
            <span class="component-material-price" style="font-size: 12px; color: #374151;">${(data.materialPrice || 0).toLocaleString()}원</span>
        </td>
        <td style="text-align: center; padding: 8px;">
            <span class="component-labor-price" style="font-size: 12px; color: #374151;">${(data.laborPrice || 0).toLocaleString()}원</span>
        </td>
        <td style="text-align: center; padding: 8px;">
            <span class="component-subtotal" style="font-weight: 500;">${data.subtotal}</span>
        </td>
        <td style="text-align: center; padding: 8px;">
            <button onclick="openMaterialSelector(this)" 
                    style="background: #3b82f6; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-right: 4px;">
                자재선택
            </button>
            <button onclick="removeComponentRow(this)" 
                    style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">
                삭제
            </button>
        </td>
    `;
    return row;
}

// =============================================================================
// 실시간 UI 자동 갱신 시스템
// =============================================================================

// 활성화된 일위대가 관리 모달의 UI 자동 갱신
function refreshActiveUnitPriceComponents() {
    // 현재 열려있는 일위대가 관리 모달 확인
    const unitPriceModal = document.getElementById('unitPriceModal');
    if (!unitPriceModal || unitPriceModal.style.display === 'none') {
        console.log('📝 일위대가 관리 모달이 열려있지 않음 - UI 갱신 건너뜀');
        return;
    }
    
    console.log('🔄 일위대가 관리 UI 자동 갱신 시작...');
    
    // 모든 세부아이템 행에서 자재 정보 재로드
    const componentRows = document.querySelectorAll('.component-row');
    let updatedCount = 0;
    
    componentRows.forEach(async (row) => {
        const materialNameInput = row.querySelector('.component-name');
        const materialName = materialNameInput ? materialNameInput.value : '';
        
        if (materialName && materialName !== '자재 선택 버튼을 사용해주세요' && materialName.trim() !== '') {
            try {
                await updateComponentPricing(row, materialName);
                updatedCount++;
            } catch (error) {
                console.error(`컴포넌트 가격 업데이트 실패 (${materialName}):`, error);
            }
        }
    });
    
    // 총합 계산 갱신
    setTimeout(() => {
        calculateGrandTotal();
        console.log(`✅ 일위대가 관리 UI 자동 갱신 완료 (${updatedCount}개 항목 업데이트)`);
    }, 100);
}

// 4단계: ID 기반 정확한 자재 검색 (동일 이름 자재 혼동 방지)
async function findMaterialById(materialId) {
    try {
        const materialsFromDB = await new Promise((resolve, reject) => {
            const request = indexedDB.open('KiyenoMaterialsDB', 3);
            
            request.onerror = () => {
                console.error('❌ KiyenoMaterialsDB 열기 실패');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['materials'], 'readonly');
                const store = transaction.objectStore('materials');
                const getRequest = store.get(materialId); // ID로 직접 검색
                
                getRequest.onsuccess = () => {
                    const material = getRequest.result;
                    if (material) {
                        const materialPrice = material.materialCost || material.price || material.재료비단가 || 0;
                        const laborPrice = material.laborCost || material.노무비단가 || 0;
                        
                        resolve({
                            재료비단가: materialPrice,
                            노무비단가: laborPrice,
                            materialCost: materialPrice,
                            laborCost: laborPrice
                        });
                    } else {
                        resolve(null);
                    }
                };
                
                getRequest.onerror = () => {
                    console.error(`❌ ID 검색 실패: ${materialId}`);
                    reject(getRequest.error);
                };
            };
        });
        
        return materialsFromDB;
        
    } catch (error) {
        console.error(`KiyenoMaterialsDB ID 검색 오류 (${materialId}):`, error);
        return null;
    }
}

// 자재선택 모달과 완전히 동일한 방법으로 DB 검색 (KiyenoMaterialsDB 직접 접근)
async function findMaterialByNameDirect(materialName) {
    try {
        console.log(`🔍 KiyenoMaterialsDB를 사용한 직접 검색: ${materialName}`);
        
        // 자재선택 모달과 동일한 방법: KiyenoMaterialsDB v2 materials 테이블 직접 조회
        const materialsFromDB = await new Promise((resolve, reject) => {
            const request = indexedDB.open('KiyenoMaterialsDB', 3);
            
            request.onerror = () => {
                console.error('❌ KiyenoMaterialsDB 열기 실패');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['materials'], 'readonly');
                const store = transaction.objectStore('materials');
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = () => {
                    const materials = getAllRequest.result || [];
                    console.log(`✅ KiyenoMaterialsDB에서 ${materials.length}개 데이터 조회`);
                    resolve(materials);
                };
                
                getAllRequest.onerror = () => {
                    console.error('❌ materials 테이블 조회 실패');
                    reject(getAllRequest.error);
                };
            };
            
            request.onupgradeneeded = (event) => {
                console.log('🔧 findMaterialByNameDirect: KiyenoMaterialsDB v2 구조 생성...');
                const db = event.target.result;
                
                // materials 테이블이 없으면 생성
                if (!db.objectStoreNames.contains('materials')) {
                    const materialsStore = db.createObjectStore('materials', { keyPath: 'id' });
                    materialsStore.createIndex('name', 'name', { unique: false });
                    materialsStore.createIndex('category', 'category', { unique: false });
                }
                
                // unitPrices 테이블이 없으면 생성 (일위대가용)
                if (!db.objectStoreNames.contains('unitPrices')) {
                    const unitPricesStore = db.createObjectStore('unitPrices', { keyPath: 'id' });
                    unitPricesStore.createIndex('itemName', 'basic.itemName', { unique: false });
                    unitPricesStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
        
        // 자재명으로 검색
        for (const material of materialsFromDB) {
            const dbName = material.name || material.품명 || '';
            if (dbName === materialName || dbName.includes(materialName) || materialName.includes(dbName)) {
                console.log(`✅ KiyenoMaterialsDB에서 발견: ${dbName}`, material);
                
                // 자재선택 모달과 동일한 가격 필드 매핑
                const materialPrice = material.materialCost || material.price || material.재료비단가 || 0;
                const laborPrice = material.laborCost || material.노무비단가 || 0;
                
                return {
                    재료비단가: materialPrice,
                    노무비단가: laborPrice,
                    materialCost: materialPrice,
                    laborCost: laborPrice
                };
            }
        }
        
        console.warn(`❌ KiyenoMaterialsDB에서 찾을 수 없음: ${materialName}`);
        return null;
        
    } catch (error) {
        console.error(`KiyenoMaterialsDB 검색 오류 (${materialName}):`, error);
        
        // 백업: window.priceDB 사용
        console.log('🔄 백업: window.priceDB 사용');
        if (window.priceDB) {
            const lightweightComponents = window.priceDB.getLightweightComponents();
            for (const item of lightweightComponents.items) {
                const dbName = item.name || '';
                if (dbName === materialName || dbName.includes(materialName) || materialName.includes(dbName)) {
                    console.log(`✅ 백업 - 경량자재에서 발견: ${dbName}`, item);
                    
                    // 노무비 계산: DB 값이 있으면 사용, 없으면 재료비의 50% 적용
                    const materialPrice = item.price || 0;
                    const laborPrice = item.laborCost || Math.round(materialPrice * 0.5);
                    
                    return {
                        재료비단가: materialPrice,
                        노무비단가: laborPrice,
                        materialCost: materialPrice,
                        laborCost: laborPrice
                    };
                }
            }
        }
        
        return null;
    }
}

// 개별 컴포넌트 가격 업데이트
async function updateComponentPricing(row, materialName) {
    try {
        
        // ID 기반 정확한 검색 우선 사용 (호환성 유지)
        const materialId = row.getAttribute('data-material-id');
        let materialData = null;
        
        if (materialId) {
            materialData = await findMaterialById(materialId);
        }
        
        // ID로 찾지 못했거나 materialId가 없으면 기존 이름 기반 검색 (호환성)
        if (!materialData) {
            materialData = await findMaterialByNameDirect(materialName);
        }
        
        if (!materialData) {
            console.warn(`⚠️ 자재 정보를 찾을 수 없음: ${materialName}`);
            return;
        }
        
        // 가격 필드 업데이트
        const materialPriceInput = row.querySelector('.component-material-price');
        const laborPriceInput = row.querySelector('.component-labor-price');
        
        if (materialPriceInput) {
            const newMaterialPrice = materialData.재료비단가 || materialData.materialCost || materialData.materialPrice || materialData.price || 0;
            
            // span 요소와 input 요소를 모두 지원하는 현재 값 읽기
            let currentPrice = 0;
            if (materialPriceInput.tagName === 'SPAN') {
                currentPrice = parseInt(materialPriceInput.textContent.replace(/[,원]/g, '')) || 0;
            } else {
                currentPrice = parseInt(materialPriceInput.value) || 0;
            }
            
            console.log(`🔍 가격 비교: ${materialName} - 현재: ${currentPrice}, 신규: ${newMaterialPrice}, 자재데이터:`, materialData);
            
            if (currentPrice !== newMaterialPrice) {
                // span 요소와 input 요소를 모두 지원하는 값 설정
                if (materialPriceInput.tagName === 'SPAN') {
                    materialPriceInput.textContent = `${Number(newMaterialPrice).toLocaleString()}원`;
                } else {
                    // readonly 속성 임시 제거 후 값 변경
                    const wasReadonly = materialPriceInput.hasAttribute('readonly');
                    if (wasReadonly) {
                        materialPriceInput.removeAttribute('readonly');
                    }
                    
                    materialPriceInput.value = newMaterialPrice;
                    
                    // readonly 속성 복원
                    if (wasReadonly) {
                        materialPriceInput.setAttribute('readonly', 'readonly');
                    }
                }
                
                console.log(`💰 재료비 업데이트: ${materialName} - ${currentPrice} → ${newMaterialPrice}`);
            } else {
                console.log(`ℹ️ 재료비 변경 없음: ${materialName} - ${currentPrice}`);
            }
        }
        
        if (laborPriceInput) {
            const newLaborPrice = materialData.노무비단가 || materialData.laborCost || materialData.laborPrice || 0;
            
            // span 요소와 input 요소를 모두 지원하는 현재 값 읽기
            let currentLaborPrice = 0;
            if (laborPriceInput.tagName === 'SPAN') {
                currentLaborPrice = parseInt(laborPriceInput.textContent.replace(/[,원]/g, '')) || 0;
            } else {
                currentLaborPrice = parseInt(laborPriceInput.value) || 0;
            }
            
            console.log(`🔍 노무비 비교: ${materialName} - 현재: ${currentLaborPrice}, 신규: ${newLaborPrice}`);
            
            if (currentLaborPrice !== newLaborPrice) {
                // 💰 올바른 노무비 로직: 금액을 우선 설정, 단가는 calculateRowTotal()에서 자동계산
                const laborAmountElement = row.querySelector('.labor-amount');
                if (laborAmountElement) {
                    // 1. 노무비 금액에 새로운 단가 값 직접 입력
                    laborAmountElement.textContent = `${Number(newLaborPrice).toLocaleString()}원`;
                    
                    // 2. 단가는 calculateRowTotal()에서 금액÷수량으로 자동계산됨
                }
                
            } else {
            }
        }
        
        // 소계 재계산
        updateComponentSubtotal(row);
        
    } catch (error) {
        console.error('컴포넌트 가격 업데이트 실패:', error);
    }
}

// 자재명으로 최신 자재 데이터 조회
async function findMaterialByName(materialName) {
    try {
        // 1. priceDatabase에서 검색 (경량자재 + 석고보드)
        if (window.priceDatabase) {
            // 경량자재 검색
            const lightweightItems = window.priceDatabase.getLightweightComponents();
            const lightweightMatch = lightweightItems.items.find(item => 
                item.name === materialName || 
                item.name.includes(materialName) || 
                materialName.includes(item.name)
            );
            
            if (lightweightMatch) {
                // 노무비 계산: DB 값이 있으면 사용, 없으면 재료비의 50% 적용
                const materialPrice = lightweightMatch.price || 0;
                const laborPrice = lightweightMatch.laborCost || Math.round(materialPrice * 0.5);
                
                return {
                    재료비단가: materialPrice,
                    노무비단가: laborPrice,
                    materialCost: materialPrice,
                    laborCost: laborPrice
                };
            }
            
            // 석고보드 검색
            const gypsumItems = window.priceDatabase.getGypsumBoards();
            const gypsumMatch = gypsumItems.items.find(item => {
                const fullName = `${item.name} ${item.w}x${item.h}x${item.t}`;
                return fullName === materialName || 
                       fullName.includes(materialName) || 
                       materialName.includes(fullName) ||
                       item.name === materialName;
            });
            
            if (gypsumMatch) {
                return {
                    재료비단가: gypsumMatch.materialCost || gypsumMatch.priceChanged || gypsumMatch.priceOriginal || 0,
                    노무비단가: Math.round((gypsumMatch.materialCost || gypsumMatch.priceChanged || gypsumMatch.priceOriginal || 0) * 0.6),
                    materialCost: gypsumMatch.materialCost || gypsumMatch.priceChanged || gypsumMatch.priceOriginal || 0,
                    laborCost: Math.round((gypsumMatch.materialCost || gypsumMatch.priceChanged || gypsumMatch.priceOriginal || 0) * 0.6)
                };
            }
        }
        
        // 2. IndexedDB에서 검색
        if (window.KiyenoMaterialsDB) {
            const dbMaterials = await window.KiyenoMaterialsDB.materials
                .where('name')
                .startsWithIgnoreCase(materialName)
                .toArray();
            
            if (dbMaterials.length > 0) {
                const match = dbMaterials[0];
                return {
                    재료비단가: match.materialPrice || match.materialCost || 0,
                    노무비단가: match.laborPrice || match.laborCost || 0,
                    materialCost: match.materialPrice || match.materialCost || 0,
                    laborCost: match.laborPrice || match.laborCost || 0
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error('자재 검색 실패:', error);
        return null;
    }
}

// 컴포넌트 소계 업데이트
function updateComponentSubtotal(row) {
    try {
        // calculateRowTotal 함수를 사용하여 모든 계산을 처리
        const quantityInput = row.querySelector('.component-quantity');
        if (quantityInput) {
            calculateRowTotal(quantityInput);
        }
    } catch (error) {
        console.error('소계 계산 실패:', error);
    }
}

// ✅ 중복 이벤트 리스너 제거됨 (3592번 라인에 통합됨)
// 이전에는 materialDataUpdated 이벤트가 두 번 등록되어 메모리 누수 발생
// 현재는 3592번 라인의 통합 버전 하나만 사용

// 전역 함수 등록
window.closeMaterialSelectModal = closeMaterialSelectModal;
window.filterMaterials = filterMaterials;
window.selectUnitPriceMaterial = selectUnitPriceMaterial;

// 실시간 UI 갱신 전역 함수 등록
window.refreshActiveUnitPriceComponents = refreshActiveUnitPriceComponents;
window.updateComponentPricing = updateComponentPricing;
window.findMaterialByName = findMaterialByName;
window.updateComponentSubtotal = updateComponentSubtotal;

// =============================================================================
// DB 레벨 완전 동기화 시스템
// =============================================================================

// 자재 가격 변경 시 일위대가 DB의 모든 관련 항목 업데이트
async function updateUnitPriceDatabaseByMaterial(materialId, materialName, newMaterialPrice, newLaborPrice) {
    try {
        console.log(`🗄️ DB 레벨 동기화 시작: ${materialName} (ID: ${materialId})`);
        console.log(`  - 신규 재료비: ${newMaterialPrice}원, 신규 노무비: ${newLaborPrice}원`);
        
        // UnitPriceDB 인스턴스 생성 및 초기화
        const unitPriceDB = new UnitPriceDB();
        const db = await unitPriceDB.initDB();
        
        // 모든 일위대가 항목 조회
        const transaction = db.transaction(['unitPrices'], 'readwrite');
        const store = transaction.objectStore('unitPrices');
        const getAllRequest = store.getAll();
        
        const allUnitPrices = await new Promise((resolve, reject) => {
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        });
        
        let updatedCount = 0;
        
        // 각 일위대가 항목에서 해당 자재 사용하는 구성품 찾기 및 업데이트
        for (const unitPrice of allUnitPrices) {
            let unitPriceUpdated = false;
            
            if (unitPrice.components && Array.isArray(unitPrice.components)) {
                for (const component of unitPrice.components) {
                    // 자재 ID 또는 이름으로 매칭
                    const isMatch = (
                        (materialId && component.materialId === materialId) ||
                        (materialName && component.name === materialName) ||
                        (materialName && component.name && component.name.includes(materialName)) ||
                        (materialName && component.name && materialName.includes(component.name))
                    );
                    
                    if (isMatch) {
                        // 가격 정보 업데이트
                        if (newMaterialPrice !== undefined) {
                            component.materialPrice = newMaterialPrice;
                        }
                        if (newLaborPrice !== undefined) {
                            // 노무비는 금액으로 저장 (기존 수량 유지)
                            component.laborAmount = newLaborPrice;
                            // 단가는 자동 계산됨 (금액 ÷ 수량)
                        }
                        
                        // materialId가 없었다면 설정
                        if (materialId && !component.materialId) {
                            component.materialId = materialId;
                        }
                        
                        unitPriceUpdated = true;
                        console.log(`  ✅ 구성품 업데이트: ${component.name} in ${unitPrice.basic?.itemName}`);
                    }
                }
            }
            
            // 변경된 일위대가 항목 저장
            if (unitPriceUpdated) {
                // 수정 시간 업데이트
                unitPrice.updatedAt = new Date().toISOString();
                
                // DB에 저장
                const updateTransaction = db.transaction(['unitPrices'], 'readwrite');
                const updateStore = updateTransaction.objectStore('unitPrices');
                const updateRequest = updateStore.put(unitPrice);
                
                await new Promise((resolve, reject) => {
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                });
                
                updatedCount++;
                console.log(`  💾 DB 저장 완료: ${unitPrice.basic?.itemName}`);
            }
        }
        
        console.log(`🎯 DB 레벨 동기화 완료: ${updatedCount}개 일위대가 항목 업데이트`);
        return updatedCount;
        
    } catch (error) {
        console.error('❌ DB 레벨 동기화 실패:', error);
        throw error;
    }
}

// 세션 관리 전역 함수 등록
window.saveUnitPriceSession = saveUnitPriceSession;
window.restoreUnitPriceSession = restoreUnitPriceSession;
window.clearUnitPriceSession = clearUnitPriceSession;

// DB 동기화 전역 함수 등록
window.updateUnitPriceDatabaseByMaterial = updateUnitPriceDatabaseByMaterial;

// =============================================================================
// 단순한 모달 데이터 동기화 시스템
// =============================================================================

// 메인 모달 데이터 동기화 (일위대가 목록의 저장된 데이터 업데이트)
async function syncMainModalData() {
    // 저장된 일위대가 데이터에서 각 아이템의 가격 정보 업데이트
    const unitPriceData = JSON.parse(localStorage.getItem('unitPriceData') || '[]');
    let updatedItems = 0;
    
    for (const unitPriceItem of unitPriceData) {
        if (unitPriceItem.components && unitPriceItem.components.length > 0) {
            let itemUpdated = false;
            
            for (const component of unitPriceItem.components) {
                if (component.자재명 && component.자재명 !== '자재 선택 버튼을 사용해주세요') {
                    try {
                        const latestMaterialData = await findMaterialByName(component.자재명);
                        if (latestMaterialData) {
                            const newMaterialPrice = latestMaterialData.재료비단가 || latestMaterialData.materialCost || latestMaterialData.materialPrice || latestMaterialData.price || 0;
                            const newLaborPrice = latestMaterialData.노무비단가 || latestMaterialData.laborCost || latestMaterialData.laborPrice || 0;
                            
                            if (component.재료비단가 !== newMaterialPrice || component.노무비단가 !== newLaborPrice) {
                                component.재료비단가 = newMaterialPrice;
                                component.노무비단가 = newLaborPrice;
                                itemUpdated = true;
                            }
                        }
                    } catch (error) {
                        console.error(`메인 모달 동기화 실패 (${component.자재명}):`, error);
                    }
                }
            }
            
            if (itemUpdated) {
                updatedItems++;
            }
        }
    }
    
    // 업데이트된 데이터 저장
    if (updatedItems > 0) {
        localStorage.setItem('unitPriceData', JSON.stringify(unitPriceData));
        // 목록 다시 렌더링
        renderUnitPriceItemsList();
    }
    
    return updatedItems;
}

// 세부 모달 데이터 동기화 (component-row들의 실시간 가격 업데이트)
async function syncUnitPriceWithLatestData() {
    const componentRows = document.querySelectorAll('.component-row');
    let updatedCount = 0;
    
    // forEach 대신 for...of 사용하여 순차적 비동기 처리
    for (const row of componentRows) {
        // span 요소와 input 요소를 모두 지원하는 데이터 읽기
        const nameElement = row.querySelector('.component-name');
        const materialName = nameElement ? (nameElement.tagName === 'SPAN' ? nameElement.textContent : nameElement.value) : '';
        
        if (materialName && materialName !== '자재 선택 버튼을 사용해주세요' && materialName !== '자재를 선택해주세요' && materialName.trim() !== '') {
            try {
                await updateComponentPricing(row, materialName);
                updatedCount++;
            } catch (error) {
                console.error(`가격 동기화 실패 (${materialName}):`, error);
            }
        }
    }

    // 모든 비동기 작업 완료 후 총합 재계산
    calculateGrandTotal();
    return updatedCount;
}

// =============================================================================
// 수량 계산기 기능
// =============================================================================

// 현재 계산기가 열린 행을 저장하는 변수
let currentQuantityCalculatorRow = null;

// 일괄 소요량 계산기 모달 열기
function openBulkQuantityCalculator() {
    console.log('📐 일괄 소요량 계산기 모달 열기');
    
    // 일괄 계산 모달 생성
    createBulkQuantityCalculatorModal();
}

// 일괄 소요량 계산기 모달 생성
function createBulkQuantityCalculatorModal() {
    console.log('🏗️ 일괄 소요량 계산기 모달 생성');
    
    const modalHTML = `
        <div class="bulk-quantity-calc-modal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 999999999; display: flex; 
            align-items: center; justify-content: center;
        ">
            <div class="bulk-quantity-calc-content" style="
                background: white; border-radius: 12px; width: 95%; max-width: 1400px; 
                max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            ">
                <!-- 헤더 -->
                <div style="background: linear-gradient(135deg, #475569 0%, #334155 100%); padding: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: white; font-size: 20px; font-weight: 600;">
                        <i class="fas fa-calculator" style="margin-right: 8px;"></i>
                        6개 자재 소요량 일괄 계산기 (5개 기본 + 석고피스)
                    </h3>
                    <button onclick="closeBulkQuantityCalculatorModal()" style="
                        background: none; border: none; color: white; font-size: 24px; 
                        cursor: pointer; padding: 0; width: 30px; height: 30px; 
                        display: flex; align-items: center; justify-content: center;
                    ">&times;</button>
                </div>
                

                <!-- 6개 자재 계산 -->
                <div style="padding: 20px;">
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 25px;">
                        
                        <!-- 1. 스터드 -->
                        <div style="background: #fff; border: 2px solid #475569; border-radius: 8px; padding: 15px;">
                            <h5 style="margin: 0 0 12px 0; color: #334155; font-weight: 600; text-align: center; font-size: 14px;">
                                🔧 스터드
                            </h5>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 11px; color: #374151; font-weight: 500;">간격</label>
                                <select id="studSpacing" onchange="calculateAllQuantities()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;">
                                    <option value="0.300">@300</option>
                                    <option value="0.400" selected>@400</option>
                                    <option value="0.450">@450</option>
                                    <option value="0.600">@600</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 11px; color: #374151; font-weight: 500;">할증률</label>
                                <input type="number" id="studPremium" value="1.05" min="1" max="2" step="0.01"
                                       oninput="calculateAllQuantities()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;">
                            </div>
                            <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">계산식:</div>
                                <div id="studFormula" style="font-size: 11px; font-family: monospace; color: #334155;">-</div>
                            </div>
                            <div style="text-align: center; padding: 6px; background: #475569; border-radius: 4px;">
                                <strong style="color: white; font-size: 14px;" id="studResult">0</strong>
                                <div style="font-size: 9px; color: #e2e8f0;">개</div>
                            </div>
                        </div>

                        <!-- 2. 런너 -->
                        <div style="background: #fff; border: 2px solid #475569; border-radius: 8px; padding: 15px;">
                            <h5 style="margin: 0 0 12px 0; color: #334155; font-weight: 600; text-align: center; font-size: 14px;">
                                🔗 런너
                            </h5>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 11px; color: #374151; font-weight: 500;">타입</label>
                                <select id="runnerType" onchange="calculateAllQuantities()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;">
                                    <option value="single">일반 (0.68)</option>
                                    <option value="double">더블 (1.36)</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 11px; color: #374151; font-weight: 500;">할증률</label>
                                <input type="number" id="runnerPremium" value="0.34" min="0.1" max="2" step="0.01"
                                       oninput="calculateAllQuantities()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;">
                            </div>
                            <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">계산식:</div>
                                <div id="runnerFormula" style="font-size: 11px; font-family: monospace; color: #334155;">-</div>
                            </div>
                            <div style="text-align: center; padding: 6px; background: #475569; border-radius: 4px;">
                                <strong style="color: white; font-size: 14px;" id="runnerResult">0</strong>
                                <div style="font-size: 9px; color: #e2e8f0;">개</div>
                            </div>
                        </div>

                        <!-- 3. 피스 -->
                        <div style="background: #fff; border: 2px solid #475569; border-radius: 8px; padding: 15px;">
                            <h5 style="margin: 0 0 12px 0; color: #334155; font-weight: 600; text-align: center; font-size: 14px;">
                                📌 피스
                            </h5>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 11px; color: #374151; font-weight: 500;">간격</label>
                                <select id="pieceSpacing" onchange="calculateAllQuantities()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;">
                                    <option value="400">@400</option>
                                    <option value="450" selected>@450</option>
                                    <option value="500">@500</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 11px; color: #374151; font-weight: 500;">기본값</label>
                                <input type="number" id="pieceBase" value="12" min="1" step="1"
                                       oninput="calculateAllQuantities()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;">
                            </div>
                            <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">계산식:</div>
                                <div id="pieceFormula" style="font-size: 11px; font-family: monospace; color: #334155;">-</div>
                            </div>
                            <div style="text-align: center; padding: 6px; background: #475569; border-radius: 4px;">
                                <strong style="color: white; font-size: 14px;" id="pieceResult">0</strong>
                                <div style="font-size: 9px; color: #e2e8f0;">개</div>
                            </div>
                        </div>

                        <!-- 4. 타정총알 -->
                        <div style="background: #fff; border: 2px solid #475569; border-radius: 8px; padding: 15px;">
                            <h5 style="margin: 0 0 12px 0; color: #334155; font-weight: 600; text-align: center; font-size: 14px;">
                                🔨🔩 타정총알
                            </h5>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 11px; color: #374151; font-weight: 500;">간격 선택</label>
                                <select id="nailBulletSpacing" onchange="calculateAllQuantities()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;">
                                    <option value="400">@400</option>
                                    <option value="450" selected>@450</option>
                                    <option value="500">@500</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 11px; color: #374151; font-weight: 500;">할증률</label>
                                <input type="number" id="nailBulletPremium" value="1.00" min="1" max="2" step="0.01"
                                       oninput="calculateAllQuantities()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;">
                            </div>
                            <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">계산식:</div>
                                <div id="nailBulletFormula" style="font-size: 11px; font-family: monospace; color: #334155;">-</div>
                            </div>
                            <div style="text-align: center; padding: 6px; background: #475569; border-radius: 4px;">
                                <strong style="color: white; font-size: 14px;" id="nailBulletResult">0</strong>
                                <div style="font-size: 9px; color: #e2e8f0;">SET</div>
                            </div>
                        </div>

                        <!-- 5. 용접봉 -->
                        <div style="background: #fff; border: 2px solid #475569; border-radius: 8px; padding: 15px;">
                            <h5 style="margin: 0 0 12px 0; color: #334155; font-weight: 600; text-align: center; font-size: 14px;">
                                ⚡ 용접봉
                            </h5>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 11px; color: #374151; font-weight: 500;">간격 선택</label>
                                <select id="weldingSpacing" onchange="calculateAllQuantities()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;">
                                    <option value="400">@400</option>
                                    <option value="450" selected>@450</option>
                                    <option value="500">@500</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 3px; font-size: 11px; color: #374151; font-weight: 500;">할증률</label>
                                <input type="number" id="weldingPremium" value="1.00" min="1" max="2" step="0.01"
                                       oninput="calculateAllQuantities()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;">
                            </div>
                            <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">계산식:</div>
                                <div id="weldingFormula" style="font-size: 11px; font-family: monospace; color: #334155;">-</div>
                            </div>
                            <div style="text-align: center; padding: 6px; background: #475569; border-radius: 4px;">
                                <strong style="color: white; font-size: 14px;" id="weldingResult">0</strong>
                                <div style="font-size: 9px; color: #e2e8f0;">KG</div>
                            </div>
                        </div>

                    </div>
                    
                    <!-- 6. 석고피스 (하단 전체 너비) -->
                    <div style="background: #fff; border: 2px solid #475569; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h5 style="margin: 0 0 20px 0; color: #334155; font-weight: 600; text-align: center; font-size: 16px;">
                            🧱 석고피스 계산기
                        </h5>

                        <!-- 석고피스 계산 영역 -->
                        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 30px;">
                            <!-- 입력 섹션 -->
                            <div>
                                <h6 style="margin: 0 0 15px 0; color: #334155; font-size: 14px; font-weight: 600;">📝 입력값</h6>
                                <div style="display: grid; gap: 12px;">
                                    <div>
                                        <label style="display: block; margin-bottom: 6px; font-size: 12px; color: #374151; font-weight: 500;">가로 (mm)</label>
                                        <input type="number" id="gypsumWidth" value="900" min="1" step="1"
                                               oninput="calculateGypsumPiece()" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                                    </div>
                                    <div>
                                        <label style="display: block; margin-bottom: 6px; font-size: 12px; color: #374151; font-weight: 500;">세로 (mm)</label>
                                        <input type="number" id="gypsumHeight" value="1800" min="1" step="1"
                                               oninput="calculateGypsumPiece()" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                                    </div>
                                </div>
                            </div>

                            <!-- 계산 결과 섹션 -->
                            <div>
                                <h6 style="margin: 0 0 15px 0; color: #334155; font-size: 14px; font-weight: 600;">📊 계산 결과</h6>

                                <!-- 계산 테이블 -->
                                <div style="background: #f1f5f9; border-radius: 8px; overflow: hidden; margin-bottom: 15px;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                        <thead>
                                            <tr style="background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white;">
                                                <th style="padding: 8px; text-align: center; font-weight: 600;">사이즈</th>
                                                <th style="padding: 8px; text-align: center; font-weight: 600;">가로</th>
                                                <th style="padding: 8px; text-align: center; font-weight: 600;">세로</th>
                                                <th style="padding: 8px; text-align: center; font-weight: 600;">가로갯수</th>
                                                <th style="padding: 8px; text-align: center; font-weight: 600;">세로갯수</th>
                                                <th style="padding: 8px; text-align: center; font-weight: 600;">합계</th>
                                                <th style="padding: 8px; text-align: center; font-weight: 600;">M2개수</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style="background: white;">
                                                <td style="padding: 8px; text-align: center; font-weight: 500;" id="gypsumSize">-</td>
                                                <td style="padding: 8px; text-align: center;" id="gypsumWidthDisplay">-</td>
                                                <td style="padding: 8px; text-align: center;" id="gypsumHeightDisplay">-</td>
                                                <td style="padding: 8px; text-align: center; color: #334155;" id="gypsumWidthCount">-</td>
                                                <td style="padding: 8px; text-align: center; color: #334155;" id="gypsumHeightCount">-</td>
                                                <td style="padding: 8px; text-align: center; color: #334155; font-weight: 600;" id="gypsumTotal">-</td>
                                                <td style="padding: 8px; text-align: center; color: #334155; font-weight: 600;" id="gypsumM2Count">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <!-- 최종 결과 -->
                                <div style="background: linear-gradient(135deg, #475569 0%, #334155 100%); padding: 15px; border-radius: 8px; text-align: center;">
                                    <div style="color: #e2e8f0; font-size: 12px; margin-bottom: 5px;">최종 석고피스 소요량</div>
                                    <div style="color: white; font-size: 18px; font-weight: 700;" id="gypsumPieceResult">0</div>
                                    <div style="color: #e2e8f0; font-size: 11px;">개</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 하단 버튼 -->
                <div style="padding: 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; text-align: right; display: flex; gap: 12px; justify-content: flex-end;">
                    <button onclick="closeBulkQuantityCalculatorModal()" style="
                        padding: 12px 24px; background: #64748b; color: white; border: none;
                        border-radius: 6px; cursor: pointer; font-weight: 500;
                    ">취소</button>
                    <button onclick="applyBulkCalculatedQuantities()" style="
                        padding: 12px 24px; background: #475569; color: white; border: none;
                        border-radius: 6px; cursor: pointer; font-weight: 600;
                    ">일괄 적용</button>
                </div>
            </div>
        </div>
    `;
    
    // 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 초기 계산 실행
    calculateAllQuantities();
}

// 일괄 계산 모달 닫기
function closeBulkQuantityCalculatorModal() {
    const modal = document.querySelector('.bulk-quantity-calc-modal');
    if (modal) {
        modal.remove();
    }
}

// 7개 자재 전체 수량 계산
function calculateAllQuantities() {
    
    // 1. 스터드 계산: 1 ÷ 간격값 × 할증률 (소수점 3째자리 반올림, 2자리 표시)
    const studSpacing = parseFloat(document.getElementById('studSpacing')?.value) || 0.4;
    const studPremium = parseFloat(document.getElementById('studPremium')?.value) || 1.05;
    const studQuantity = studSpacing > 0 ? (1 / studSpacing * studPremium) : 0;
    const studQuantityRounded = Math.round(studQuantity * 1000) / 1000; // 소수점 3째자리 반올림
    const studFormula = `1 ÷ ${studSpacing} × ${studPremium}`;
    document.getElementById('studFormula').textContent = studFormula;
    document.getElementById('studResult').textContent = studQuantityRounded.toFixed(2); // 소수점 2자리 표시
    
    // 2. 런너 계산: 일반일 때 0.34×2, 더블일 때 0.34×4
    const runnerType = document.getElementById('runnerType')?.value || 'single';
    const runnerPremium = parseFloat(document.getElementById('runnerPremium')?.value) || 0.34;
    const multiplier = runnerType === 'double' ? 4 : 2;
    const runnerQuantity = runnerPremium * multiplier;
    const runnerFormula = `${runnerPremium} × ${multiplier}`;
    const displayValue = runnerType === 'double' ? '1.36' : '0.68';
    document.getElementById('runnerFormula').textContent = runnerFormula;
    document.getElementById('runnerResult').textContent = displayValue;
    
    // 3. 피스 계산: @450 기본값, @400은 1.125배, @500은 0.9배, 나머지 버림
    const pieceSpacing = document.getElementById('pieceSpacing')?.value || '450';
    const pieceBase = parseFloat(document.getElementById('pieceBase')?.value) || 12;
    let pieceQuantity, pieceFormula;
    
    if (pieceSpacing === '400') {
        const calculated = pieceBase * 1.125;
        pieceQuantity = Math.floor(calculated);
        pieceFormula = `${pieceBase} × 1.125 = ${calculated.toFixed(3)} → ${pieceQuantity}`;
    } else if (pieceSpacing === '500') {
        const calculated = pieceBase * 0.9;
        pieceQuantity = Math.floor(calculated);
        pieceFormula = `${pieceBase} × 0.9 = ${calculated.toFixed(3)} → ${pieceQuantity}`;
    } else { // @450 기본값
        pieceQuantity = pieceBase;
        pieceFormula = `${pieceBase} (기본값)`;
    }
    
    document.getElementById('pieceFormula').textContent = pieceFormula;
    document.getElementById('pieceResult').textContent = pieceQuantity;
    
    // 4. 타정총알 계산: 기본값 4, 간격 선택 지원
    const nailBulletSpacing = document.getElementById('nailBulletSpacing')?.value || '450';
    const nailBulletPremium = parseFloat(document.getElementById('nailBulletPremium')?.value) || 1.00;
    const nailBulletQuantity = 4; // 기본값 4 (간격과 관계없이)
    const nailBulletFormula = `4 (기본값, 간격: @${nailBulletSpacing})`;
    document.getElementById('nailBulletFormula').textContent = nailBulletFormula;
    document.getElementById('nailBulletResult').textContent = nailBulletQuantity.toFixed(0);
    
    // 5. 용접봉 계산: 피스와 동일 방식, 기본값 0.08, 셋째자리 버림
    const weldingSpacing = document.getElementById('weldingSpacing')?.value || '450';
    const weldingPremium = parseFloat(document.getElementById('weldingPremium')?.value) || 1.00;
    const weldingBase = 0.08; // 기본값 0.08
    let weldingQuantity, weldingFormula;
    
    if (weldingSpacing === '400') {
        const calculated = weldingBase * 1.125;
        weldingQuantity = Math.floor(calculated * 100) / 100; // 셋째자리 버림
        weldingFormula = `${weldingBase} × 1.125 = ${calculated.toFixed(3)} → ${weldingQuantity.toFixed(2)}`;
    } else if (weldingSpacing === '500') {
        const calculated = weldingBase * 0.9;
        weldingQuantity = Math.floor(calculated * 100) / 100; // 셋째자리 버림
        weldingFormula = `${weldingBase} × 0.9 = ${calculated.toFixed(3)} → ${weldingQuantity.toFixed(2)}`;
    } else { // @450 기본값
        weldingQuantity = weldingBase;
        weldingFormula = `${weldingBase} (기본값, 간격: @${weldingSpacing})`;
    }
    
    document.getElementById('weldingFormula').textContent = weldingFormula;
    document.getElementById('weldingResult').textContent = weldingQuantity.toFixed(2);
    
    // 6. 석고피스 계산
    const gypsumPieceQuantity = calculateGypsumPiece();
    
    
    console.log('📊 6개 자재 계산 완료 (타정총알 통합):', {
        스터드: `${studQuantityRounded.toFixed(2)} (할증률: ${studPremium})`,
        런너: `${displayValue} (타입: ${runnerType})`,
        피스: `${pieceQuantity} (간격: @${pieceSpacing})`,
        타정총알: `${nailBulletQuantity.toFixed(0)} (기본값, 간격: @${nailBulletSpacing})`,
        용접봉: `${weldingQuantity.toFixed(2)} (간격: @${weldingSpacing})`,
        석고피스: `${gypsumPieceQuantity.toFixed(0)} (복잡계산)`
    });
}

// 석고피스 복잡 계산 함수
function calculateGypsumPiece() {
    const width = parseFloat(document.getElementById('gypsumWidth')?.value) || 900;
    const height = parseFloat(document.getElementById('gypsumHeight')?.value) || 1800;
    
    // 계산식 구현
    // 1. 가로갯수 = (가로/450) + 1
    const widthCount = (width / 450) + 1;
    
    // 2. 세로갯수 = (세로/250) + 1  
    const heightCount = (height / 250) + 1;
    
    // 3. 합계 = 가로갯수 + 세로갯수
    const total = widthCount + heightCount;
    
    // 4. M2개수 = 합계 ÷ (가로/1000 × 세로/1000), 라운드업
    const area = (width / 1000) * (height / 1000); // m² 계산
    const m2Count = Math.ceil(total / area);
    
    // 5. 최종 결과 = M2개수
    const finalResult = m2Count;
    
    // 사이즈 계산 (3*6, 4*8 형식)
    const widthInM = Math.round(width / 300);
    const heightInM = Math.round(height / 300);
    const sizeLabel = `${widthInM}*${heightInM}`;
    
    // UI 업데이트
    document.getElementById('gypsumSize').textContent = sizeLabel;
    document.getElementById('gypsumWidthDisplay').textContent = width;
    document.getElementById('gypsumHeightDisplay').textContent = height;
    document.getElementById('gypsumWidthCount').textContent = widthCount.toFixed(2);
    document.getElementById('gypsumHeightCount').textContent = heightCount.toFixed(2);
    document.getElementById('gypsumTotal').textContent = total.toFixed(2);
    document.getElementById('gypsumM2Count').textContent = m2Count.toFixed(0);
    document.getElementById('gypsumPieceResult').textContent = finalResult.toFixed(0);
    
    console.log('🧱 석고피스 계산:', {
        입력: `${width}×${height}mm`,
        가로갯수: widthCount.toFixed(2),
        세로갯수: heightCount.toFixed(2),
        합계: total.toFixed(2),
        면적: `${area.toFixed(3)}m²`,
        M2개수: m2Count,
        최종결과: finalResult
    });
    
    return finalResult;
}

// 자재 카테고리 지능형 매칭 함수 (품명 + 규격 결합 검색)
function intelligentMaterialMatching(materialName, calculatedResults, row) {
    // 추가 정보 수집: 규격/사이즈 필드
    const specElement = row.querySelector('.component-spec, .component-size');
    const specification = specElement ? specElement.textContent.trim() : '';
    
    // 품명 + 규격을 결합한 전체 텍스트
    const combinedText = `${materialName} ${specification}`.trim();
    const upperCombinedText = combinedText.toUpperCase();
    
    console.log(`🔍 자재 분류 검사: "${materialName}" + 규격: "${specification}"`);
    console.log(`🔍 결합된 텍스트: "${combinedText}"`);
    
    // 1단계: 석고보드 관련 키워드 확인 (품명 + 규격에서 검색)
    const gypsumKeywords = [
        '석고보드', '석고판', '석고패널', 'GYPSUM', '보드', '패널',
        '석고취부용', '석고', '석고전용', '보드용', '석고보드용'
    ];
    const isGypsumMaterial = gypsumKeywords.some(keyword => 
        upperCombinedText.includes(keyword.toUpperCase())
    );
    
    // 2단계: 경량자재 관련 키워드 확인 (품명 + 규격에서 검색)
    const lightweightKeywords = [
        '스터드', '런너', 'STUD', 'RUNNER', '경량', 'LIGHT',
        '경량취부용', '경량용', '경량자재용', '메거진피스'
    ];
    const isLightweightMaterial = lightweightKeywords.some(keyword => 
        upperCombinedText.includes(keyword.toUpperCase())
    );
    
    // 3단계: 피스 포함 자재 지능형 분류
    if (materialName.includes('피스') || upperCombinedText.includes('PIECE')) {
        if (isGypsumMaterial) {
            console.log(`🧱 석고보드 피스로 분류: ${materialName} (규격: ${specification})`);
            return calculatedResults['석고피스'];
        } else if (isLightweightMaterial) {
            console.log(`🔧 경량자재 피스로 분류: ${materialName} (규격: ${specification})`);
            return calculatedResults['피스'];
        } else {
            // 명확하지 않은 경우 기본값 (경량피스) 사용
            console.log(`❓ 불분명한 피스, 경량피스로 기본 분류: ${materialName} (규격: ${specification})`);
            return calculatedResults['피스'];
        }
    }
    
    // 4단계: 기타 자재 매칭 (품명 + 규격에서 검색)
    const materialMappings = [
        { keywords: ['스터드', 'STUD'], result: '스터드' },
        { keywords: ['런너', 'RUNNER'], result: '런너' }, 
        { keywords: ['타정총알', '총알', '타정', 'NAIL'], result: '타정총알' },
        { keywords: ['용접봉', '용접', 'WELDING'], result: '용접봉' }
    ];
    
    for (const mapping of materialMappings) {
        if (mapping.keywords.some(keyword => upperCombinedText.includes(keyword.toUpperCase()))) {
            console.log(`📝 일반 자재 매칭: ${materialName} → ${mapping.result} (규격: ${specification})`);
            return calculatedResults[mapping.result];
        }
    }
    
    console.log(`❌ 매칭 실패: ${materialName} (규격: ${specification}) - 지원되지 않는 자재`);
    return null;
}

// 일괄 계산 결과 적용 (지능형 매칭 적용)
function applyBulkCalculatedQuantities() {
    // 현재 구성품 테이블의 모든 행 가져오기
    const tbody = document.getElementById('componentsTable');
    if (!tbody) {
        alert('구성품 테이블을 찾을 수 없습니다.');
        return;
    }
    
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0) {
        alert('적용할 구성품이 없습니다. 먼저 구성품을 추가해주세요.');
        return;
    }
    
    // 계산된 결과 수집
    const calculatedResults = {
        '스터드': parseFloat(document.getElementById('studResult')?.textContent) || 0,
        '런너': parseFloat(document.getElementById('runnerResult')?.textContent) || 0,
        '피스': parseFloat(document.getElementById('pieceResult')?.textContent) || 0,
        '타정총알': parseFloat(document.getElementById('nailBulletResult')?.textContent) || 0,
        '용접봉': parseFloat(document.getElementById('weldingResult')?.textContent) || 0,
        '석고피스': parseFloat(document.getElementById('gypsumPieceResult')?.textContent) || 0
    };
    
    console.log('📊 계산된 결과:', calculatedResults);
    
    let appliedCount = 0;
    const matchingResults = [];
    
    // 각 행의 자재명을 확인하고 지능형 매칭으로 계산 결과 적용
    rows.forEach(row => {
        const nameElement = row.querySelector('.component-name');
        const quantityInput = row.querySelector('.component-quantity');
        
        if (!nameElement || !quantityInput) return;
        
        const materialName = nameElement.textContent.trim();
        
        // 지능형 매칭 시도 (row 매개변수 추가로 규격 정보도 함께 전달)
        const matchedValue = intelligentMaterialMatching(materialName, calculatedResults, row);
        
        if (matchedValue !== null && matchedValue > 0) {
            quantityInput.value = matchedValue.toFixed(3);
            calculateRowTotal(quantityInput);
            appliedCount++;
            
            // 규격 정보도 함께 표시
            const specElement = row.querySelector('.component-spec, .component-size');
            const specification = specElement ? specElement.textContent.trim() : '';
            const displayText = specification ? `${materialName} (${specification})` : materialName;
            
            matchingResults.push(`${displayText}: ${matchedValue.toFixed(3)}`);
            console.log(`✅ 지능형 매칭 성공: ${displayText} → ${matchedValue.toFixed(3)}`);
        } else {
            console.log(`❌ 매칭 실패: ${materialName} (지원되지 않는 자재)`);
        }
    });
    
    if (appliedCount > 0) {
        const resultMessage = `${appliedCount}개 자재의 수량이 적용되었습니다.\n\n적용된 자재:\n${matchingResults.join('\n')}`;
        alert(resultMessage);
        console.log(`📊 지능형 일괄 적용 완료: ${appliedCount}개 자재`);
    } else {
        alert('매칭되는 자재를 찾을 수 없습니다.\n\n지원되는 자재:\n- 스터드 (경량자재)\n- 런너 (경량자재)\n- 피스 (경량/석고보드 구분)\n- 타정총알\n- 용접봉\n- 석고피스 (석고보드 전용)');
    }
    
    // 모달 닫기
    closeBulkQuantityCalculatorModal();
}

// =============================================================================
// 전역 함수 등록 (window 객체에 할당)
// =============================================================================

// 일위대가 관리 메인 함수들
window.openUnitPriceManagement = openUnitPriceManagement;
window.openUnitPriceBasicModal = openUnitPriceBasicModal;
window.proceedToDetailInput = proceedToDetailInput;
window.openUnitPriceDetailModal = openUnitPriceDetailModal;

// 구성품 관리 함수들
window.addComponentRow = addComponentRow;
window.removeComponentRow = removeComponentRow;
window.fillComponentRowWithMaterial = fillComponentRowWithMaterial;

// 계산 함수들
window.calculateRowTotal = calculateRowTotal;
window.calculateGrandTotal = calculateGrandTotal;

// 데이터 관리 함수들
window.saveUnitPriceItem = saveUnitPriceItem;
window.loadUnitPriceItems = loadUnitPriceItems;
window.saveUnitPriceItems = saveUnitPriceItems;
window.renderUnitPriceItemsList = renderUnitPriceItemsList;
window.editUnitPriceItem = editUnitPriceItem;
window.deleteUnitPriceItem = deleteUnitPriceItem;
window.exportUnitPriceData = exportUnitPriceData;
window.importUnitPriceData = importUnitPriceData;
window.cleanupLocalStorage = cleanupLocalStorage;
window.loadUnitPriceDataFromDB = loadUnitPriceDataFromDB;

// 6가지 소요량 계산 함수들
window.openBulkQuantityCalculator = openBulkQuantityCalculator;
window.closeBulkQuantityCalculatorModal = closeBulkQuantityCalculatorModal;

// 데이터 동기화 전역 함수 등록
window.syncMainModalData = syncMainModalData;
window.syncUnitPriceWithLatestData = syncUnitPriceWithLatestData;

// 외부 모듈에서 일위대가 데이터에 접근하기 위한 전용 getter 함수
async function getAllUnitPricesForExternal() {
    try {
        console.log('🔄 외부 모듈용 일위대가 데이터 로드 중...');
        const unitPrices = await unitPriceDB.getAllUnitPrices();
        console.log(`✅ 일위대가 데이터 로드 완료: ${unitPrices.length}개 항목`);
        return unitPrices;
    } catch (error) {
        console.error('❌ 일위대가 데이터 로드 실패:', error);
        return [];
    }
}
window.getAllUnitPricesForExternal = getAllUnitPricesForExternal;

// =============================================================================
// 벽체 타입 마스터 마이그레이션 및 전역 함수
// =============================================================================

// LocalStorage → IndexedDB 벽체 타입 마이그레이션
async function migrateWallTypesToIndexedDB() {
    try {
        console.log('🔄 LocalStorage → IndexedDB 벽체 타입 마이그레이션 시작...');
        
        // 1단계: LocalStorage 데이터 확인
        const localData = localStorage.getItem('kiyeno_revit_wall_types');
        if (!localData) {
            console.log('ℹ️ LocalStorage에 마이그레이션할 벽체 타입 데이터가 없습니다.');
            return { success: true, migratedCount: 0, message: 'LocalStorage에 데이터 없음' };
        }

        const { types, lastSaved } = JSON.parse(localData);
        if (!types || !Array.isArray(types) || types.length === 0) {
            console.log('ℹ️ 유효한 벽체 타입 데이터가 없습니다.');
            return { success: true, migratedCount: 0, message: '유효한 데이터 없음' };
        }

        console.log(`📋 발견된 벽체 타입: ${types.length}개 (마지막 저장: ${lastSaved})`);

        // 2단계: 기존 IndexedDB 벽체 타입 확인 (중복 방지)
        const existingWallTypes = await unitPriceDB.getAllWallTypeMasters();
        const existingIds = new Set(existingWallTypes.map(wt => wt.id));
        
        let migratedCount = 0;
        const errors = [];

        // 3단계: 각 벽체 타입을 IndexedDB 형식으로 변환 및 저장
        for (const oldWallType of types) {
            try {
                // 중복 확인
                if (existingIds.has(oldWallType.id)) {
                    console.log(`⏩ 건너뜀 (이미 존재): ${oldWallType.id} - ${oldWallType.wallType}`);
                    continue;
                }

                // IndexedDB 형식으로 변환
                const newWallType = await convertToWallTypeMaster(oldWallType);
                
                // IndexedDB에 저장
                await unitPriceDB.saveWallTypeMaster(newWallType);
                migratedCount++;
                
                console.log(`✅ 마이그레이션 완료: ${newWallType.id} - ${newWallType.name}`);
                
            } catch (error) {
                const errorMsg = `❌ 마이그레이션 실패: ${oldWallType.id} - ${error.message}`;
                console.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        // 4단계: 백업 생성 후 LocalStorage 정리
        if (migratedCount > 0) {
            // 백업 생성
            const backupKey = `kiyeno_revit_wall_types_backup_${new Date().toISOString().slice(0, 10)}`;
            localStorage.setItem(backupKey, localData);
            
            // 원본 데이터 삭제
            localStorage.removeItem('kiyeno_revit_wall_types');
            
            console.log(`📦 LocalStorage 백업 생성: ${backupKey}`);
            console.log(`🗑️ 원본 LocalStorage 데이터 정리 완료`);
        }

        const result = {
            success: true,
            migratedCount,
            totalFound: types.length,
            skippedCount: types.length - migratedCount - errors.length,
            errors,
            message: `${migratedCount}개 벽체 타입 마이그레이션 완료`
        };

        console.log('✅ 벽체 타입 마이그레이션 완료:', result);
        return result;

    } catch (error) {
        console.error('❌ 벽체 타입 마이그레이션 실패:', error);
        return {
            success: false,
            error: error.message,
            migratedCount: 0,
            message: '마이그레이션 중 오류 발생'
        };
    }
}

// LocalStorage 벽체 타입을 IndexedDB 형식으로 변환
async function convertToWallTypeMaster(oldWallType) {
    // 일위대가 참조 변환 함수
    async function convertUnitPriceReference(unitPriceField) {
        if (!unitPriceField) return null;
        
        // 이미 unitPrice_ 형태인 경우
        if (typeof unitPriceField === 'string' && unitPriceField.startsWith('unitPrice_')) {
            const unitPriceId = unitPriceField.replace('unitPrice_', '');
            
            // 해당 일위대가 정보 조회하여 displayName 추가
            try {
                const unitPrice = await unitPriceDB.getUnitPriceById(unitPriceId);
                if (unitPrice && unitPrice.basic) {
                    return {
                        unitPriceId: unitPriceId,
                        displayName: unitPrice.basic.itemName || 'Unknown Item',
                        unitCost: unitPrice.totalCosts?.total || 0,
                        unit: unitPrice.basic?.unit || 'EA',
                        lastUpdated: new Date().toISOString(),
                        cacheVersion: 1
                    };
                }
            } catch (error) {
                console.warn(`⚠️ 일위대가 정보 조회 실패 (${unitPriceId}):`, error.message);
            }
        }
        
        // 일반 텍스트인 경우 (기존 자재명 등)
        return {
            unitPriceId: null,
            displayName: unitPriceField || 'Unknown',
            unitCost: 0,
            unit: 'EA',
            lastUpdated: new Date().toISOString(),
            cacheVersion: 1,
            isLegacy: true  // 기존 데이터임을 표시
        };
    }

    // 새로운 벽체 타입 마스터 객체 생성
    const wallTypeMaster = {
        // 기본 정보
        id: oldWallType.id || `wt_${Date.now()}`,
        name: oldWallType.wallType || `벽체타입_${oldWallType.no || 'Unknown'}`,
        description: oldWallType.description || '',
        
        // 물리적 속성
        thickness: oldWallType.thickness || 200,
        category: 'migrated',  // 마이그레이션된 데이터 표시
        
        // 일위대가 참조들 (하이브리드 방식)
        unitPrices: {
            stud: await convertUnitPriceReference(oldWallType.studPrice),
            runner: await convertUnitPriceReference(oldWallType.runnerPrice),
            gypsumBoard1: await convertUnitPriceReference(oldWallType.gypsumBoard1Price),
            gypsumBoard2: await convertUnitPriceReference(oldWallType.gypsumBoard2Price),
            insulation: await convertUnitPriceReference(oldWallType.insulationPrice),
            finishing: await convertUnitPriceReference(oldWallType.finishingPrice)
        },
        
        // 메타데이터
        createdAt: oldWallType.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        isTemplate: true,
        tags: ['마이그레이션', oldWallType.wallType || ''].filter(Boolean),
        
        // 마이그레이션 정보
        migratedFrom: 'localStorage',
        originalData: {
            no: oldWallType.no,
            elementId: oldWallType.elementId,
            area: oldWallType.area,
            source: oldWallType.source
        }
    };

    return wallTypeMaster;
}

// =============================================================================
// Excel 내보내기 기능
// =============================================================================

/**
 * 현재 세부 아이템의 구성품 테이블을 Excel로 내보내기
 */
async function exportUnitPriceDetailToExcel() {
    console.log('📊 세부 아이템 Excel 내보내기 시작');

    // 현재 편집 중인 데이터 확인
    if (!currentUnitPriceData || !currentUnitPriceData.id) {
        alert('세부 아이템 데이터가 없습니다. 먼저 세부 아이템을 선택해주세요.');
        return;
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('세부 아이템');

        // 데이터 가져오기
        const data = currentUnitPriceData;
        const basic = data.basic || {};
        const components = data.components || [];
        const fixedRows = data.fixedRows || {};

        // =============================================================================
        // 1. 타이틀 행 (행1) - 확장된 정보 포함
        // =============================================================================
        const titleText = `${basic.itemName || '세부아이템'} | ${basic.location || ''} | ${basic.workType1 || ''}/${basic.workType2 || ''} | ${basic.unit || ''}`;
        const titleRow = worksheet.addRow([titleText]);
        titleRow.font = { bold: true, size: 16, color: { argb: 'FF8B5CF6' } };
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
        titleRow.height = 30;
        worksheet.mergeCells(1, 1, 1, 12); // 12개 컬럼 병합

        // =============================================================================
        // 2. 빈 행 (행2)
        // =============================================================================
        worksheet.addRow([]);

        // =============================================================================
        // 3-4. 헤더 행 생성 (getRow 방식으로 변경)
        // =============================================================================

        // 빈 행 2개 추가
        worksheet.addRow([]);  // 3행
        worksheet.addRow([]);  // 4행

        // 3행 설정 (메인 헤더)
        const headerRow1 = worksheet.getRow(3);
        headerRow1.values = ['품명', '싸이즈', '단위', '수량', '재료비', '', '노무비', '', '경비', '', '합계', ''];

        // 4행 설정 (서브 헤더)
        const headerRow2 = worksheet.getRow(4);
        headerRow2.values = ['', '', '', '', '단가', '금액', '단가', '금액', '단가', '금액', '단가', '금액'];

        // 병합 (3-4행 사이)
        worksheet.mergeCells(3, 1, 4, 1); // 품명
        worksheet.mergeCells(3, 2, 4, 2); // 싸이즈
        worksheet.mergeCells(3, 3, 4, 3); // 단위
        worksheet.mergeCells(3, 4, 4, 4); // 수량
        worksheet.mergeCells(3, 5, 3, 6); // 재료비 (가로 병합)
        worksheet.mergeCells(3, 7, 3, 8); // 노무비 (가로 병합)
        worksheet.mergeCells(3, 9, 3, 10); // 경비 (가로 병합)
        worksheet.mergeCells(3, 11, 3, 12); // 합계 (가로 병합)

        // 3행 스타일 적용 (모든 컬럼)
        for (let i = 1; i <= 12; i++) {
            const cell = headerRow1.getCell(i);
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF667EEA' }
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' },
                bottom: { style: 'thin' }
            };
        }
        headerRow1.height = 20;

        // 4행 스타일 적용 (5-12번 컬럼만)
        for (let i = 5; i <= 12; i++) {
            const cell = headerRow2.getCell(i);

            // 컬럼별 색상
            let bgColor = 'FFECFDF5'; // 재료비 (녹색)
            let textColor = 'FF065F46';

            if (i === 7 || i === 8) { // 노무비
                bgColor = 'FFEFF6FF'; // 파란색
                textColor = 'FF1E40AF';
            } else if (i === 9 || i === 10) { // 경비
                bgColor = 'FFFEFBEB'; // 노란색
                textColor = 'FF92400E';
            } else if (i === 11 || i === 12) { // 합계
                bgColor = 'FFFEF2F2'; // 빨간색
                textColor = 'FFB91C1C';
            }

            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: bgColor }
            };
            cell.font = { bold: true, color: { argb: textColor }, size: 12 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' },
                bottom: { style: 'thin' }
            };
        }
        headerRow2.height = 18;

        // =============================================================================
        // 5. 구성품 데이터 행들 (행5부터)
        // =============================================================================
        let currentRow = 5;

        // 구성품 합계 누적 변수
        let materialTotal = 0;
        let laborTotal = 0;
        let expenseTotal = 0;

        components.forEach((comp, index) => {
            // 실제 저장된 데이터 구조에 맞게 추출
            const quantity = comp.quantity || 0;
            const materialPrice = comp.materialPrice || 0;  // 재료비 단가
            const laborPrice = comp.laborPrice || 0;        // 노무비 단가 (저장된 값 사용)
            const laborAmount = comp.laborAmount || 0;      // 노무비 금액 (고정)
            const expensePrice = comp.expensePrice || 0;    // 경비 단가

            // 계산 필요한 값들 (반올림 적용)
            const materialAmount = Math.round(materialPrice * quantity);
            const expenseAmount = Math.round(expensePrice * quantity);
            const totalPrice = Math.round(materialPrice + laborPrice + expensePrice);
            const totalAmount = Math.round(materialAmount + laborAmount + expenseAmount);

            // 합계 누적
            materialTotal += materialAmount;
            laborTotal += laborAmount;
            expenseTotal += expenseAmount;

            const dataRow = worksheet.addRow([
                comp.name || '',
                comp.spec || '',  // 싸이즈는 spec 필드
                comp.unit || '',
                quantity,
                materialPrice,
                materialAmount,
                laborPrice,
                laborAmount,
                expensePrice,
                expenseAmount,
                totalPrice,
                totalAmount
            ]);

            // 스타일 적용
            dataRow.eachCell((cell, colNum) => {
                // 배경색 (홀수/짝수)
                const bgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: bgColor }
                };

                // 정렬 (품명은 왼쪽, 싸이즈/단위는 중앙, 수량/금액은 오른쪽)
                if (colNum === 1) {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                } else if (colNum === 2 || colNum === 3) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };

                    // 숫자 포맷
                    if (colNum === 4) {
                        // 수량: 포맷 미적용 (Excel 기본 숫자 표시, 점 제거)
                        // 4 → "4", 2.33 → "2.33"
                    } else {
                        // 단가, 금액: 모두 정수 (소수점 없음)
                        cell.numFmt = '#,##0';
                    }
                }

                // 테두리
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' },
                    bottom: { style: 'thin' }
                };

                // 폰트
                cell.font = { size: 11 };
            });

            dataRow.height = 18;
            currentRow++;
        });

        // =============================================================================
        // 6. 고정 행들 (자재로스, 운반비, 이윤, 공구손료, 총합계)
        // =============================================================================

        // 고정비율 가져오기
        const fixedRates = data.fixedRates || {
            materialLoss: 3,
            transportCost: 1.5,
            materialProfit: 15,
            toolExpense: 2
        };

        // 고정비용 계산
        const materialLoss = Math.round(materialTotal * fixedRates.materialLoss / 100);
        const transportCost = Math.round(materialTotal * fixedRates.transportCost / 100);
        const materialProfitBase = materialTotal + materialLoss + transportCost;
        const materialProfit = Math.round(materialProfitBase * fixedRates.materialProfit / 100);
        const toolExpense = Math.round(laborTotal * fixedRates.toolExpense / 100);

        // 최종 합계
        const finalMaterial = materialTotal + materialLoss + transportCost + materialProfit;
        const finalLabor = laborTotal + toolExpense;  // 공구손료는 노무비에 포함
        const finalExpense = expenseTotal;            // 경비는 경비 합계만
        const finalTotal = finalMaterial + finalLabor + finalExpense;

        // 단수정리 계산: 재료비/노무비/경비 각각 100원 단위 절사
        const roundedMaterial = Math.floor(finalMaterial / 100) * 100;
        const roundedLabor = Math.floor(finalLabor / 100) * 100;
        const roundedExpense = Math.floor(finalExpense / 100) * 100;

        const materialRounding = roundedMaterial - finalMaterial;
        const laborRounding = roundedLabor - finalLabor;
        const expenseRounding = roundedExpense - finalExpense;
        const totalRounding = materialRounding + laborRounding + expenseRounding;

        const roundedTotal = roundedMaterial + roundedLabor + roundedExpense;

        // 고정 행 데이터 배열
        const fixedRowsData = [
            {
                name: '자재로스',
                spec: '자재비의',
                unit: '%',
                quantity: fixedRates.materialLoss,
                materialPrice: materialTotal,
                materialAmount: materialLoss,
                totalPrice: materialTotal,
                totalAmount: materialLoss
            },
            {
                name: '자재운반비 및 양중비',
                spec: '자재비의',
                unit: '%',
                quantity: fixedRates.transportCost,
                materialPrice: materialTotal,
                materialAmount: transportCost,
                totalPrice: materialTotal,
                totalAmount: transportCost
            },
            {
                name: '자재비 이윤',
                spec: '자재비의',
                unit: '%',
                quantity: fixedRates.materialProfit,
                materialPrice: materialProfitBase,
                materialAmount: materialProfit,
                totalPrice: materialProfitBase,
                totalAmount: materialProfit
            },
            {
                name: '공구손료 및 기계경비',
                spec: '자재비의',
                unit: '%',
                quantity: fixedRates.toolExpense,
                laborPrice: laborTotal,
                laborAmount: toolExpense,
                totalPrice: laborTotal,
                totalAmount: toolExpense
            },
            {
                name: '단수정리',
                spec: '원미만',
                unit: '절사',
                quantity: '',
                materialAmount: materialRounding,  // 6열: 재료비 단수정리
                laborAmount: laborRounding,        // 8열: 노무비 단수정리
                expenseAmount: expenseRounding,    // 10열: 경비 단수정리
                totalAmount: totalRounding         // 12열: 합계 단수정리
            }
        ];

        // 고정 행 추가
        fixedRowsData.forEach((rowData, index) => {
            const fixedRow = worksheet.addRow([
                rowData.name,
                rowData.spec || '', // 싸이즈 (자재비의)
                rowData.unit || '', // 단위 (%)
                rowData.quantity,
                rowData.materialPrice || '',
                rowData.materialAmount || '',
                rowData.laborPrice || '',
                rowData.laborAmount || '',
                rowData.expensePrice || '',      // 경비 단가
                rowData.expenseAmount || '',     // 경비 금액 (단수정리에서 사용)
                rowData.totalPrice || '',
                rowData.totalAmount || ''
            ]);

            // 스타일 적용
            fixedRow.eachCell((cell, colNum) => {
                // 배경색 (연한 노란색)
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFF3CD' }
                };

                // 정렬
                if (colNum === 1) {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    cell.font = { bold: true, size: 11, color: { argb: 'FF8B5CF6' } };
                } else if (colNum === 2 || colNum === 3) {
                    // B열(싸이즈), C열(단위) - 중앙 정렬
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.font = { bold: true, size: 11 };
                } else if (colNum === 4) {
                    // D열(수량) - 오른쪽 정렬, 포맷 미적용 (Excel 기본 숫자 표시)
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    cell.font = { bold: true, size: 11 };
                    // 포맷 미적용 - 4 → "4", 2.33 → "2.33" (점 제거)
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    cell.font = { bold: true, size: 11 };

                    // 숫자 포맷 (단가/금액 모두 정수)
                    if (colNum === 5 || colNum === 6 || colNum === 7 || colNum === 8 || colNum === 11 || colNum === 12) {
                        cell.numFmt = '#,##0';
                    }
                }

                // 테두리
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' },
                    bottom: { style: 'thin' }
                };
            });

            fixedRow.height = 20;
        });

        // =============================================================================
        // 7. 총합계 행
        // =============================================================================
        const totalRow = worksheet.addRow([
            '총합계',          // 1열: 품명
            '',                // 2열: 싸이즈
            '',                // 3열: 단위
            '',                // 4열: 수량
            '',                // 5열: 재료비 단가
            roundedMaterial,   // 6열: 재료비 금액 (단수정리 적용)
            '',                // 7열: 노무비 단가
            roundedLabor,      // 8열: 노무비 금액 (단수정리 적용)
            '',                // 9열: 경비 단가
            roundedExpense,    // 10열: 경비 금액 (단수정리 적용)
            '',                // 11열: 합계 단가
            roundedTotal       // 12열: 합계 금액 (단수정리 적용)
        ]);

        // 총합계 행 스타일
        totalRow.eachCell((cell, colNum) => {
            // 배경색 (진한 주황색)
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFE0B2' }
            };

            // 정렬
            if (colNum === 1) {
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.font = { bold: true, size: 12, color: { argb: 'FFD32F2F' } };
            } else {
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
                cell.font = { bold: true, size: 12, color: { argb: 'FFD32F2F' } };

                // 숫자 포맷 (금액만)
                if (colNum === 6 || colNum === 8 || colNum === 10 || colNum === 12) {
                    cell.numFmt = '#,##0';
                }
            }

            // 테두리
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' },
                bottom: { style: 'thin' }
            };
        });

        totalRow.height = 24;

        // =============================================================================
        // 9. 컬럼 너비 설정
        // =============================================================================
        worksheet.columns = [
            { width: 25 },  // 품명
            { width: 20 },  // 싸이즈
            { width: 10 },  // 단위
            { width: 12 },  // 수량
            { width: 15 },  // 재료비 단가
            { width: 15 },  // 재료비 금액
            { width: 15 },  // 노무비 단가
            { width: 15 },  // 노무비 금액
            { width: 15 },  // 경비 단가
            { width: 15 },  // 경비 금액
            { width: 15 },  // 합계 단가
            { width: 15 }   // 합계 금액
        ];

        // =============================================================================
        // 10. 파일 다운로드
        // =============================================================================
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // 파일명 생성
        const today = new Date().toISOString().split('T')[0];
        const itemName = (basic.itemName || '세부아이템').replace(/[/\\?%*:|"<>]/g, '-');
        const fileName = `일위대가_세부아이템_${itemName}_${today}.xlsx`;

        // 다운로드
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();

        console.log(`✅ Excel 파일 다운로드 완료: ${fileName}`);

    } catch (error) {
        console.error('❌ Excel 내보내기 실패:', error);
        alert('Excel 파일을 생성하는 중 오류가 발생했습니다.\n' + error.message);
    }
}

// 벽체 타입 마스터 전역 함수들
window.migrateWallTypesToIndexedDB = migrateWallTypesToIndexedDB;
window.getAllWallTypeMasters = () => unitPriceDB.getAllWallTypeMasters();
window.getWallTypeMasterById = (id) => unitPriceDB.getWallTypeMasterById(id);
window.saveWallTypeMaster = (wallTypeData) => unitPriceDB.saveWallTypeMaster(wallTypeData);
window.deleteWallTypeMaster = (id) => unitPriceDB.deleteWallTypeMaster(id);
window.searchWallTypeMasters = (query) => unitPriceDB.searchWallTypeMasters(query);

// Excel 내보내기 전역 함수 등록
window.exportUnitPriceDetailToExcel = exportUnitPriceDetailToExcel;

console.log('✅ unitPriceManager.js 로드 완료 - 일위대가 관리 전담 모듈, 자재 선택 기능, 수량 계산기, 벽체 타입 마스터 포함');

// UnitPriceDB 클래스를 전역으로 노출 (revitTypeMatching.js에서 사용)
window.UnitPriceDB = UnitPriceDB;

// unitPriceDB 인스턴스를 전역으로 노출 (wall-cost-calculator.js에서 사용)
window.unitPriceDB = unitPriceDB;

// 테스트: window 객체에 함수가 제대로 할당되었는지 확인
console.log('🔍 테스트: window.openUnitPriceManagement 존재 여부:', typeof window.openUnitPriceManagement);
if (typeof window.openUnitPriceManagement !== 'function') {
    console.error('❌ openUnitPriceManagement 함수가 window 객체에 할당되지 않았습니다!');
} else {
    console.log('✅ openUnitPriceManagement 함수가 올바르게 할당되었습니다.');
}