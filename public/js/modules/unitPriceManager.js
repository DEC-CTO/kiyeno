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

            // 타임스탬프 추가
            const now = new Date().toISOString();
            if (!wallTypeData.createdAt) {
                wallTypeData.createdAt = now;
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

// 일위대가 관리 모달 열기
async function openUnitPriceManagement() {
    console.log('💰 일위대가 관리 모달 열기');
    
    // 모달 열기 시 최신 자재 데이터 캐시 강제 로드
    console.log('🔄 자재 데이터 캐시 강제 갱신...');
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
    const modalHTML = createUnitPriceManagementModal();
    
    // 모달 표시 (닫기 버튼 추가)
    const modal = createSubModal('💰 일위대가 관리', modalHTML, [
        { text: '닫기', class: 'btn-secondary', onClick: (modal) => {
            // 모달 닫기 전 세션 저장
            saveUnitPriceSession();
            closeSubModal(modal);
        }}
    ], {
        disableBackgroundClick: true,
        disableEscapeKey: true
    });
    
    if (modal) {
        // 모달이 DOM에 추가된 후 초기화
        setTimeout(async () => {
            await loadUnitPriceItems();
            await renderUnitPriceItemsList();
            
            // 세션 복원 시도 (모달이 닫힌 후 재열기 시)
            const sessionRestored = restoreUnitPriceSession();
            
            // 일위대가 목록 렌더링 완료 후 메인 모달 데이터 동기화
            setTimeout(async () => {
                await syncMainModalData();
                if (sessionRestored) {
                    console.log('✅ 세션 복원 및 메인 모달 데이터 동기화 완료');
                } else {
                    console.log('✅ 메인 모달 데이터 동기화 완료');
                }
            }, 200);
        }, 100);
    }
}

// 일위대가 관리 모달 HTML 생성
function createUnitPriceManagementModal() {
    return `
        <div class="unit-price-management-container">
            <!-- 헤더 및 컨트롤 -->
            <div class="unit-price-header">
                <div class="controls-section">
                    <button class="btn btn-success" onclick="openUnitPriceBasicModal()">
                        <i class="fas fa-plus"></i> 새 일위대가 추가
                    </button>
                    <button class="btn btn-primary" onclick="loadUnitPriceDataFromDB()">
                        <i class="fas fa-sync-alt"></i> DB에서 로드
                    </button>
                    <button class="btn btn-info" onclick="exportUnitPriceData()">
                        <i class="fas fa-download"></i> 데이터 내보내기
                    </button>
                    <button class="btn btn-warning" onclick="importUnitPriceData()">
                        <i class="fas fa-upload"></i> 데이터 가져오기
                    </button>
                </div>
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
    
    const isEdit = editData !== null;
    const modalTitle = isEdit ? '일위대가 수정' : '새 일위대가 추가';
    
    const basicModalHTML = `
        <div class="unit-price-basic-form">
            <div class="form-grid">
                <!-- 아이템명 -->
                <div class="form-group">
                    <label>아이템 <span class="required">*</span></label>
                    <input type="text" id="itemName" placeholder="예: C-STUD" value="${editData?.basic?.itemName || ''}" required>
                </div>
                
                <!-- 간격 입력 -->
                <div class="form-group">
                    <label>간격 <span class="required">*</span></label>
                    <input type="text" id="spacing" placeholder="예: @400" value="${editData?.basic?.spacing || ''}" required>
                </div>
                
                <!-- 높이 입력 -->
                <div class="form-group">
                    <label>높이 <span class="required">*</span></label>
                    <input type="text" id="height" placeholder="예: 3600이하" value="${editData?.basic?.height || ''}" required>
                </div>
                
                <!-- 규격 -->
                <div class="form-group">
                    <label>SIZE <span class="required">*</span></label>
                    <input type="text" id="size" placeholder="예: 50형" value="${editData?.basic?.size || ''}" required>
                </div>
                
                <!-- 부위 -->
                <div class="form-group">
                    <label>부위 <span class="required">*</span></label>
                    <input type="text" id="location" placeholder="예: 벽체" value="${editData?.basic?.location || ''}" required>
                </div>
                
                <!-- 공종1 -->
                <div class="form-group">
                    <label>공종1 <span class="required">*</span></label>
                    <input type="text" id="workType1" placeholder="예: 경량" value="${editData?.basic?.workType1 || ''}" required>
                </div>
                
                <!-- 공종2 -->
                <div class="form-group">
                    <label>공종2</label>
                    <input type="text" id="workType2" placeholder="예: 벽체" value="${editData?.basic?.workType2 || ''}">
                </div>
                
                <!-- 단위 드롭다운 -->
                <div class="form-group">
                    <label>UNIT <span class="required">*</span></label>
                    <select id="unit" required>
                        <option value="">선택하세요</option>
                        <option value="M2" ${editData?.basic?.unit === 'M2' ? 'selected' : ''}>M2</option>
                        <option value="M" ${editData?.basic?.unit === 'M' ? 'selected' : ''}>M</option>
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
    
    // 기본 정보 입력 모달 표시 (취소 및 세부 설정 버튼)
    const modal = createSubModal(modalTitle, basicModalHTML, [
        { text: '닫기', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: isEdit ? '수정 계속' : '세부 설정', class: 'btn-primary', onClick: (modal) => proceedToDetailInput(isEdit) }
    ], {
        disableBackgroundClick: true,
        disableEscapeKey: true
    });
}

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
    
    // 세부 입력 모달 표시 (취소 및 저장 버튼)
    const modal = createSubModal(modalTitle, detailModalHTML, [
        { text: '닫기', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: isEdit ? '수정 완료' : '저장', class: 'btn-primary', onClick: (modal) => saveUnitPriceItem() }
    ], {
        disableBackgroundClick: true,
        disableEscapeKey: true,
        width: '95%',
        maxWidth: '1400px'
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
        <div class="unit-price-detail-form">
            <div class="detail-header">
                <h4><i class="fas fa-info-circle"></i> ${itemSummary}</h4>
            </div>
            
            <div class="controls-section">
                <button class="btn btn-success btn-sm" onclick="addComponentRow()">
                    <i class="fas fa-plus"></i> 구성품 추가
                </button>
                <button class="btn btn-primary btn-sm" onclick="openBulkQuantityCalculator()" style="margin-left: 8px;">
                    <i class="fas fa-calculator"></i> 소요량 계산
                </button>
            </div>
            
            <!-- 세부 아이템 테이블 (석고보드 스타일) -->
            <div class="unit-price-table-container" style="max-height: 500px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                <table class="unit-price-detail-table" style="width: 100%; border-collapse: collapse; font-size: 12px; background: white;">
                    <thead style="background: #f8fafc; position: sticky; top: 0; z-index: 10;">
                        <tr>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 160px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">품명</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 120px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">싸이즈</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 60px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">단위</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">수량</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-align: center; font-weight: 600;">재료비</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-align: center; font-weight: 600;">노무비</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-align: center; font-weight: 600;">경비</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-align: center; font-weight: 600;">합계</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 60px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">삭제</th>
                        </tr>
                        <tr>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 80px; background: #ecfdf5; color: #065f46; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 90px; background: #ecfdf5; color: #065f46; text-align: center; font-weight: 500;">금액</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 80px; background: #eff6ff; color: #1e40af; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 90px; background: #eff6ff; color: #1e40af; text-align: center; font-weight: 500;">금액</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 80px; background: #fefbeb; color: #92400e; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 90px; background: #fefbeb; color: #92400e; text-align: center; font-weight: 500;">금액</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 80px; background: #fef2f2; color: #b91c1c; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 90px; background: #fef2f2; color: #b91c1c; text-align: center; font-weight: 500;">금액</th>
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
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 자재운반비 및 양중비 -->
                        <tr class="fixed-row transport-cost-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">자재운반비 및 양중비</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">자재비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="1.5" step="0.1" oninput="calculateGrandTotal()" placeholder="1.5" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;" class="fixed-material-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 자재비 이윤 -->
                        <tr class="fixed-row material-profit-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">자재비 이윤</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">자재비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="15" step="0.1" oninput="calculateGrandTotal()" placeholder="15.0" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;" class="fixed-material-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 공구손료 및 기계경비 -->
                        <tr class="fixed-row tool-expense-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">공구손료 및 기계경비</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">노무비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="2" step="0.1" oninput="calculateGrandTotal()" placeholder="2.0" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: right;" class="fixed-expense-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;" class="fixed-expense-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 단수 정리 -->
                        <tr class="fixed-row rounding-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e; font-weight: 600;">단수 정리</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e; text-align: center;">원미만</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e; text-align: center;">절사</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e;"><select class="rounding-unit" onchange="calculateGrandTotal()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; background: white;">
                                <option value="1">원</option>
                                <option value="10">10원</option>
                                <option value="100" selected>100원</option>
                                <option value="1000">1000원</option>
                            </select></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="rounding-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;" class="rounding-labor-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e; text-align: right;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;" class="rounding-expense-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="rounding-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 600;" class="rounding-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #fef3c7;"></td>
                        </tr>
                    </tbody>
                    <tfoot style="background: #f9fafb; position: sticky; bottom: 0;">
                        <tr class="summary-row">
                            <td colspan="4" style="padding: 12px 8px; border: 1px solid #e2e8f0; font-weight: 700; text-align: center; background: #6366f1; color: white;"><strong>총 합계</strong></td>
                            <td colspan="2" id="totalMaterial" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; background: #ecfdf5; color: #065f46;">0원</td>
                            <td colspan="2" id="totalLabor" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; background: #eff6ff; color: #1e40af;">0원</td>
                            <td colspan="2" id="totalExpense" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; background: #fefbeb; color: #92400e;">0원</td>
                            <td colspan="2" id="grandTotal" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; background: #fef2f2; color: #b91c1c;">0원</td>
                            <td style="border: 1px solid #e2e8f0; background: #6366f1;"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <!-- 버튼들은 createSubModal에서 처리 -->
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
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="material-amount">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right;">
            <span class="component-labor-price" style="font-size: 12px; color: #374151;">
                ${data.laborPrice ? data.laborPrice.toLocaleString() + '원' : '0원'}
            </span>
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #eff6ff; color: #1e40af; font-weight: 600;" class="labor-amount">${data.laborAmount ? data.laborAmount.toLocaleString() + '원' : '0원'}</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">
            <input type="number" class="expense-price" value="${data.expensePrice}" min="0"
                   oninput="calculateRowTotal(this)"
                   style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right;">
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;" class="expense-amount">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="total-price">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #b91c1c; font-weight: bold; font-size: 12px;" class="total-amount">0원</td>
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
        row.remove();
    }
    calculateGrandTotal();
}

// 행별 계산
function calculateRowTotal(input) {
    const row = input.closest('tr');
    if (!row) return;
    
    // span, td, input 요소를 모두 지원하는 값 읽기 함수
    const getElementValue = (element) => {
        console.log('🔧 getElementValue 디버깅 - element:', element);
        if (!element) {
            console.log('🔧 getElementValue 디버깅 - element가 null/undefined, 0 반환');
            return 0;
        }
        
        console.log('🔧 getElementValue 디버깅 - tagName:', element.tagName);
        
        // SPAN이나 TD 태그는 textContent 사용 (콤마와 "원" 제거)
        if (element.tagName === 'SPAN' || element.tagName === 'TD') {
            const textContent = element.textContent;
            console.log('🔧 getElementValue 디버깅 - textContent (원본):', textContent);
            const cleaned = textContent.replace(/[,원]/g, '');
            console.log('🔧 getElementValue 디버깅 - 정리된 텍스트:', cleaned);
            const result = parseFloat(cleaned) || 0;
            console.log('🔧 getElementValue 디버깅 - parseFloat 결과:', result);
            return result;
        } else {
            // INPUT 등은 value 속성 사용
            const value = element.value;
            console.log('🔧 getElementValue 디버깅 - input value:', value);
            const result = parseFloat(value) || 0;
            console.log('🔧 getElementValue 디버깅 - parseFloat 결과:', result);
            return result;
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
    
    console.log(`🧮 행 계산: 수량(${quantity}) × 재료비(${materialPrice}) = ${materialAmount}, 노무비 금액(${laborAmount})`);
    console.log(`🧮 노무비 단가: ${laborAmount} ÷ ${quantity} = ${laborUnitPrice}`);
    console.log(`💰 합계 단가: ${materialPrice} + ${laborUnitPrice} + ${expensePrice} = ${totalPrice}`);
    console.log(`💰 합계 금액: ${materialAmount} + ${laborAmount} + ${expenseAmount} = ${totalAmount}`);
    
    // 각 금액 업데이트
    const materialAmountElement = row.querySelector('.material-amount');
    const laborPriceElement = row.querySelector('.component-labor-price');
    // laborAmountElement는 이미 위에서 선언됨
    const expenseAmountElement = row.querySelector('.expense-amount');
    const totalPriceElement = row.querySelector('.total-price');
    const totalAmountElement = row.querySelector('.total-amount');
    
    if (materialAmountElement) materialAmountElement.textContent = Math.round(materialAmount).toLocaleString() + '원';
    
    // 노무비: 단가 컬럼에는 계산된 단가(laborUnitPrice), 금액 컬럼은 고정값 유지
    console.log('🔍 단가 표시 디버깅 - laborPriceElement:', laborPriceElement);
    console.log('🔍 단가 표시 디버깅 - laborUnitPrice:', laborUnitPrice);
    
    if (laborPriceElement) {
        const displayValue = Math.round(laborUnitPrice).toLocaleString() + '원';
        console.log('🔍 단가 표시 디버깅 - 표시할 값:', displayValue);
        laborPriceElement.textContent = displayValue;
        console.log('🔍 단가 표시 디버깅 - 설정 후 textContent:', laborPriceElement.textContent);
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
        const roundedGrandTotal = Math.floor(grandTotal / roundingUnit) * roundingUnit;
        
        // 단수 정리 차액 계산
        const materialDiff = totalMaterial - roundedMaterial;
        const laborDiff = totalLabor - roundedLabor;
        const expenseDiff = totalExpense - roundedExpense;
        const totalDiff = grandTotal - roundedGrandTotal;
        
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
        grandTotal = roundedGrandTotal;
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
        
        const component = {
            name: componentName,
            materialId: row.getAttribute('data-material-id') || null, // materialId 수집
            spec: getElementValue(row.querySelector('.component-spec')) || '',
            unit: getElementValue(row.querySelector('.component-unit')) || '',
            quantity: quantity,
            materialPrice: getElementValue(row.querySelector('.material-price'), true) || getElementValue(row.querySelector('.component-material-price'), true) || 0,
            laborPrice: laborPrice,
            laborAmount: laborAmount,
            expensePrice: getElementValue(row.querySelector('.expense-price'), true) || 0
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
    
    currentUnitPriceData.totalCosts = {
        material: totalMaterial,
        labor: totalLabor,
        expense: totalExpense,
        total: grandTotal
    };
    
    // 고정 비용 비율 저장
    currentUnitPriceData.fixedRates = {
        materialLoss: parseFloat(document.querySelector('.material-loss-row .fixed-quantity')?.value) || 3,
        transportCost: parseFloat(document.querySelector('.transport-cost-row .fixed-quantity')?.value) || 1.5,
        materialProfit: parseFloat(document.querySelector('.material-profit-row .fixed-quantity')?.value) || 15,
        toolExpense: parseFloat(document.querySelector('.tool-expense-row .fixed-quantity')?.value) || 2
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
        
        // 모달 닫기
        closeCurrentModal();
        
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
    const modal = document.querySelector('.modal.show') || document.querySelector('.modal');
    if (modal && typeof closeSubModal === 'function') {
        closeSubModal(modal);
    }
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
                <thead style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; position: sticky; top: 0; z-index: 10;">
                    <tr>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 120px; text-align: center; font-weight: 600;">아이템</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">간격</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">높이</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">SIZE</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">부위</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">공종1</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">공종2</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 60px; text-align: center; font-weight: 600;">단위</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 90px; text-align: center; font-weight: 600; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">재료비</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 90px; text-align: center; font-weight: 600; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">노무비</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 90px; text-align: center; font-weight: 600; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">경비</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 100px; text-align: center; font-weight: 600; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">총계</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 100px; text-align: center; font-weight: 600;">작업</th>
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
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #ecfdf5; color: #065f46; font-weight: 600;">${Math.round(costs.material).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #eff6ff; color: #1e40af; font-weight: 600;">${Math.round(costs.labor).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fefbeb; color: #92400e; font-weight: 600;">${Math.round(costs.expense).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #b91c1c; font-weight: 600;">${Math.round(costs.total).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
                                    <button onclick="editUnitPriceItem('${item.id}')" class="btn btn-sm" 
                                            style="padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; margin-right: 4px; font-size: 11px;">
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
    const item = unitPriceItems.find(item => item.id === id);
    if (!item) {
        alert('해당 아이템을 찾을 수 없습니다.');
        return;
    }
    
    const itemName = item.basic?.itemName || 'Unknown';
    if (confirm(`"${itemName}" 일위대가를 삭제하시겠습니까?`)) {
        const success = await unitPriceDB.deleteUnitPrice(id);
        if (success) {
            unitPriceItems = unitPriceItems.filter(item => item.id !== id);
            await renderUnitPriceItemsList();
            console.log('✅ 일위대가 아이템 삭제됨:', id);
        } else {
            alert('삭제에 실패했습니다.');
        }
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
    max-width: 1200px;
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
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 99999; display: flex; 
            align-items: center; justify-content: center;
        ">
            <div class="material-select-content" style="
                background: white; border-radius: 12px; width: 90%; max-width: 1000px; 
                max-height: 80vh; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            ">
                <!-- 헤더 -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
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
                                padding: 6px 12px; border: 2px solid #3b82f6; background: #3b82f6; color: white; 
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
                            background: #ef4444; color: white; border: none; border-radius: 6px; 
                            font-size: 12px; cursor: pointer;
                        " title="필터 초기화">초기화</button>
                    </div>
                </div>
                
                <!-- 자재 목록 -->
                <div id="materialListContainer" style="padding: 20px; max-height: 400px; overflow-y: auto;">
                    자재 데이터를 로드하는 중...
                </div>
                
                <!-- 하단 버튼 -->
                <div style="padding: 20px; border-top: 1px solid #e2e8f0; text-align: right;">
                    <button onclick="closeMaterialSelectModal()" style="
                        padding: 10px 20px; background: #6b7280; color: white; border: none; 
                        border-radius: 6px; cursor: pointer; margin-right: 10px;
                    ">취소</button>
                </div>
            </div>
        </div>
    `;
    
    // 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
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
                <thead style="background: #f9fafb; position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; font-weight: 600;">품명</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">규격</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">싸이즈</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">단위</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">재료비 단가</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">노무비 단가</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">선택</th>
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
                                <button onclick="selectUnitPriceMaterial(${index})" style="
                                    padding: 4px 8px; background: #10b981; color: white; border: none; 
                                    border-radius: 4px; cursor: pointer; font-size: 11px;
                                " title="이 자재 선택">
                                    <i class="fas fa-check"></i> 선택
                                </button>
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
        selectedChip.style.background = '#3b82f6';
        selectedChip.style.color = 'white';
        selectedChip.style.borderColor = '#3b82f6';
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

// =============================================================================
// 자재 데이터 업데이트 이벤트 리스너 (자재 관리에서 저장 시 캐시 무효화)
// =============================================================================

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
        console.log(`🔍 자재 가격 업데이트 중: ${materialName}`);
        
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
                    console.log(`💰 노무비 금액 업데이트: ${newLaborPrice.toLocaleString()}원 (금액에 직접 입력)`);
                    
                    // 2. 단가는 calculateRowTotal()에서 금액÷수량으로 자동계산됨
                    console.log(`👷 노무비 단가는 calculateRowTotal()에서 자동계산: ${newLaborPrice.toLocaleString()} ÷ 수량`);
                }
                
                console.log(`✅ 노무비 업데이트: ${materialName} - ${currentLaborPrice} → ${newLaborPrice} (금액 우선)`);
            } else {
                console.log(`ℹ️ 노무비 변경 없음: ${materialName} - ${currentLaborPrice}`);
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

// 자재 데이터 업데이트 이벤트 리스너 등록 (단순화된 버전)
window.addEventListener('materialDataUpdated', function(event) {
    console.log('🔔 자재 데이터 업데이트 이벤트 수신:', event.detail);
    
    // priceDatabase 캐시 무효화
    if (window.priceDatabase) {
        console.log('🔄 자재 선택용 캐시 무효화...');
        window.priceDatabase.lightweightItemsCache = null;
        window.priceDatabase.gypsumItemsCache = null;
        console.log('✅ 자재 선택에서 다음 선택 시 최신 데이터가 로드됩니다');
    }
    
    // 일위대가 관리 모달이 열려있으면 즉시 UI 갱신
    const unitPriceModal = document.getElementById('unitPriceModal');
    const isModalOpen = unitPriceModal && unitPriceModal.style.display !== 'none';
    
    if (isModalOpen) {
        console.log('🔄 일위대가 관리 모달이 열려있음 - 즉시 UI 갱신');
        setTimeout(() => {
            refreshActiveUnitPriceComponents();
        }, 100);
    } else {
        console.log('📝 일위대가 관리 모달이 닫혀있음 - 다음 모달 열기 시 최신 데이터 자동 로드');
    }
});

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
            background: rgba(0,0,0,0.8); z-index: 99999; display: flex; 
            align-items: center; justify-content: center;
        ">
            <div class="bulk-quantity-calc-content" style="
                background: white; border-radius: 12px; width: 95%; max-width: 1400px; 
                max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            ">
                <!-- 헤더 -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; display: flex; justify-content: space-between; align-items: center;">
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
                        <div style="background: #fff; border: 2px solid #dc2626; border-radius: 8px; padding: 15px;">
                            <h5 style="margin: 0 0 12px 0; color: #dc2626; font-weight: 600; text-align: center; font-size: 14px;">
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
                            <div style="background: #fef2f2; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">계산식:</div>
                                <div id="studFormula" style="font-size: 11px; font-family: monospace; color: #dc2626;">-</div>
                            </div>
                            <div style="text-align: center; padding: 6px; background: #dc2626; border-radius: 4px;">
                                <strong style="color: white; font-size: 14px;" id="studResult">0</strong>
                                <div style="font-size: 9px; color: #fecaca;">개</div>
                            </div>
                        </div>

                        <!-- 2. 런너 -->
                        <div style="background: #fff; border: 2px solid #ea580c; border-radius: 8px; padding: 15px;">
                            <h5 style="margin: 0 0 12px 0; color: #ea580c; font-weight: 600; text-align: center; font-size: 14px;">
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
                            <div style="background: #fff7ed; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">계산식:</div>
                                <div id="runnerFormula" style="font-size: 11px; font-family: monospace; color: #ea580c;">-</div>
                            </div>
                            <div style="text-align: center; padding: 6px; background: #ea580c; border-radius: 4px;">
                                <strong style="color: white; font-size: 14px;" id="runnerResult">0</strong>
                                <div style="font-size: 9px; color: #fed7aa;">개</div>
                            </div>
                        </div>

                        <!-- 3. 피스 -->
                        <div style="background: #fff; border: 2px solid #ca8a04; border-radius: 8px; padding: 15px;">
                            <h5 style="margin: 0 0 12px 0; color: #ca8a04; font-weight: 600; text-align: center; font-size: 14px;">
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
                            <div style="background: #fffbeb; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">계산식:</div>
                                <div id="pieceFormula" style="font-size: 11px; font-family: monospace; color: #ca8a04;">-</div>
                            </div>
                            <div style="text-align: center; padding: 6px; background: #ca8a04; border-radius: 4px;">
                                <strong style="color: white; font-size: 14px;" id="pieceResult">0</strong>
                                <div style="font-size: 9px; color: #fef3c7;">개</div>
                            </div>
                        </div>

                        <!-- 4. 타정총알 -->
                        <div style="background: #fff; border: 2px solid #65a30d; border-radius: 8px; padding: 15px;">
                            <h5 style="margin: 0 0 12px 0; color: #65a30d; font-weight: 600; text-align: center; font-size: 14px;">
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
                            <div style="background: #f7fee7; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">계산식:</div>
                                <div id="nailBulletFormula" style="font-size: 11px; font-family: monospace; color: #65a30d;">-</div>
                            </div>
                            <div style="text-align: center; padding: 6px; background: #65a30d; border-radius: 4px;">
                                <strong style="color: white; font-size: 14px;" id="nailBulletResult">0</strong>
                                <div style="font-size: 9px; color: #dcfce7;">SET</div>
                            </div>
                        </div>

                        <!-- 5. 용접봉 -->
                        <div style="background: #fff; border: 2px solid #7c3aed; border-radius: 8px; padding: 15px;">
                            <h5 style="margin: 0 0 12px 0; color: #7c3aed; font-weight: 600; text-align: center; font-size: 14px;">
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
                            <div style="background: #faf5ff; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">계산식:</div>
                                <div id="weldingFormula" style="font-size: 11px; font-family: monospace; color: #7c3aed;">-</div>
                            </div>
                            <div style="text-align: center; padding: 6px; background: #7c3aed; border-radius: 4px;">
                                <strong style="color: white; font-size: 14px;" id="weldingResult">0</strong>
                                <div style="font-size: 9px; color: #ede9fe;">KG</div>
                            </div>
                        </div>

                    </div>
                    
                    <!-- 6. 석고피스 (하단 전체 너비) -->
                    <div style="background: #fff; border: 2px solid #be185d; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h5 style="margin: 0 0 20px 0; color: #be185d; font-weight: 600; text-align: center; font-size: 16px;">
                            🧱 석고피스 계산기
                        </h5>
                        
                        <!-- 석고피스 계산 영역 -->
                        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 30px;">
                            <!-- 입력 섹션 -->
                            <div>
                                <h6 style="margin: 0 0 15px 0; color: #be185d; font-size: 14px; font-weight: 600;">📝 입력값</h6>
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
                                <h6 style="margin: 0 0 15px 0; color: #be185d; font-size: 14px; font-weight: 600;">📊 계산 결과</h6>
                                
                                <!-- 계산 테이블 -->
                                <div style="background: #fdf2f8; border-radius: 8px; overflow: hidden; margin-bottom: 15px;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                        <thead>
                                            <tr style="background: #be185d; color: white;">
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
                                                <td style="padding: 8px; text-align: center; color: #059669;" id="gypsumWidthCount">-</td>
                                                <td style="padding: 8px; text-align: center; color: #059669;" id="gypsumHeightCount">-</td>
                                                <td style="padding: 8px; text-align: center; color: #dc2626; font-weight: 600;" id="gypsumTotal">-</td>
                                                <td style="padding: 8px; text-align: center; color: #be185d; font-weight: 600;" id="gypsumM2Count">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <!-- 최종 결과 -->
                                <div style="background: #be185d; padding: 15px; border-radius: 8px; text-align: center;">
                                    <div style="color: #fce7f3; font-size: 12px; margin-bottom: 5px;">최종 석고피스 소요량</div>
                                    <div style="color: white; font-size: 18px; font-weight: 700;" id="gypsumPieceResult">0</div>
                                    <div style="color: #fce7f3; font-size: 11px;">개</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 하단 버튼 -->
                <div style="padding: 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; text-align: right; display: flex; gap: 12px; justify-content: flex-end;">
                    <button onclick="closeBulkQuantityCalculatorModal()" style="
                        padding: 12px 24px; background: #6b7280; color: white; border: none; 
                        border-radius: 6px; cursor: pointer; font-weight: 500;
                    ">취소</button>
                    <button onclick="applyBulkCalculatedQuantities()" style="
                        padding: 12px 24px; background: #10b981; color: white; border: none; 
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
    
    // 1. 스터드 계산: 1 ÷ 간격값 × 할증률
    const studSpacing = parseFloat(document.getElementById('studSpacing')?.value) || 0.4;
    const studPremium = parseFloat(document.getElementById('studPremium')?.value) || 1.05;
    const studQuantity = studSpacing > 0 ? (1 / studSpacing * studPremium) : 0;
    const studFormula = `1 ÷ ${studSpacing} × ${studPremium}`;
    document.getElementById('studFormula').textContent = studFormula;
    document.getElementById('studResult').textContent = studQuantity.toFixed(3);
    
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
        스터드: `${studQuantity.toFixed(3)} (할증률: ${studPremium})`,
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

// 일괄 계산 결과 적용
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
    
    let appliedCount = 0;
    
    // 각 행의 자재명을 확인하고 해당하는 계산 결과 적용
    rows.forEach(row => {
        const nameElement = row.querySelector('.component-name');
        const quantityInput = row.querySelector('.component-quantity');
        
        if (!nameElement || !quantityInput) return;
        
        const materialName = nameElement.textContent.trim();
        
        // 자재명 매칭 (부분 매칭)
        for (const [calcName, calcValue] of Object.entries(calculatedResults)) {
            if (materialName.includes(calcName) || calcName.includes(materialName)) {
                quantityInput.value = calcValue.toFixed(3);
                calculateRowTotal(quantityInput);
                appliedCount++;
                console.log(`✅ ${materialName} → ${calcName}: ${calcValue.toFixed(3)}`);
                break;
            }
        }
    });
    
    if (appliedCount > 0) {
        alert(`${appliedCount}개 자재의 수량이 적용되었습니다.`);
        console.log(`📊 일괄 적용 완료: ${appliedCount}개 자재`);
    } else {
        alert('매칭되는 자재를 찾을 수 없습니다.\n자재명이 스터드, 런너, 피스, 타정총알, 용접봉, 석고피스 중 하나를 포함하는지 확인해주세요.');
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

// 벽체 타입 마스터 전역 함수들
window.migrateWallTypesToIndexedDB = migrateWallTypesToIndexedDB;
window.getAllWallTypeMasters = () => unitPriceDB.getAllWallTypeMasters();
window.getWallTypeMasterById = (id) => unitPriceDB.getWallTypeMasterById(id);
window.saveWallTypeMaster = (wallTypeData) => unitPriceDB.saveWallTypeMaster(wallTypeData);
window.deleteWallTypeMaster = (id) => unitPriceDB.deleteWallTypeMaster(id);
window.searchWallTypeMasters = (query) => unitPriceDB.searchWallTypeMasters(query);

console.log('✅ unitPriceManager.js 로드 완료 - 일위대가 관리 전담 모듈, 자재 선택 기능, 수량 계산기, 벽체 타입 마스터 포함');

// UnitPriceDB 클래스를 전역으로 노출 (revitTypeMatching.js에서 사용)
window.UnitPriceDB = UnitPriceDB;

// 테스트: window 객체에 함수가 제대로 할당되었는지 확인
console.log('🔍 테스트: window.openUnitPriceManagement 존재 여부:', typeof window.openUnitPriceManagement);
if (typeof window.openUnitPriceManagement !== 'function') {
    console.error('❌ openUnitPriceManagement 함수가 window 객체에 할당되지 않았습니다!');
} else {
    console.log('✅ openUnitPriceManagement 함수가 올바르게 할당되었습니다.');
}