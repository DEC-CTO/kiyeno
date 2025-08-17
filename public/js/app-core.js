// =============================================================================
// Kiyeno 벽체 관리 시스템 - 핵심 모듈
// 데이터베이스, 네임스페이스, 핵심 데이터 관리
// =============================================================================

// 네임스페이스 초기화
window.Kiyeno = window.Kiyeno || {};

// =============================================================================
// 데이터베이스 설정 (Dexie.js 기반 IndexedDB)
// =============================================================================
const KIYENO_DB_VERSION = 2;
const KIYENO_DB_NAME = 'KiyenoDB';

class KiyenoDB extends Dexie {
    constructor() {
        super(KIYENO_DB_NAME);
        
        // 버전 1: 기본 테이블들
        this.version(1).stores({
            materials: '++id, name, category, subcategory, unit, materialPrice, laborPrice, expensePrice, totalPrice, created, updated',
            wallData: '++id, no, wallType, area, thickness, fire, created, updated'
        });

        // 버전 2: elementId 인덱스 추가
        this.version(2).stores({
            // Revit 연동 데이터 테이블 (elementId 인덱스 추가)
            revitData: '++id, elementId, revitId, name, wallType, area, height, length, thickness, level, material, comments, created, updated',
            // 기존 테이블 유지
            materials: '++id, name, category, subcategory, unit, materialPrice, laborPrice, expensePrice, totalPrice, created, updated',
            wallData: '++id, no, wallType, area, thickness, fire, created, updated',
            // 사용자 설정 및 프로젝트 정보
            settings: '++id, key, value, updated',
            projects: '++id, name, description, created, updated'
        });
    }
}

// 전역 데이터베이스 인스턴스
let kiyenoDB;

// KiyenoDB 자동 생성 주석 처리 (KiyenoMaterialsDB 통합 사용)
/*
try {
    kiyenoDB = new KiyenoDB();
    window.kiyenoDB = kiyenoDB;
    console.log('✅ Kiyeno 데이터베이스 초기화 완료');
} catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
}
*/

// =============================================================================
// 핵심 데이터 관리
// =============================================================================

// 중앙 데이터 관리
Kiyeno.Data = {
    wallData: [],
    selectedRows: new Set(),
    selectedWallTypes: new Set(),
    
    // 데이터 상태 관리
    isDataModified: false,
    
    // 마지막 ID 추적
    lastWallId: 0,
    
    // 벽체 데이터 추가
    addWall(wallData) {
        this.lastWallId++;
        const newWall = {
            id: this.lastWallId,
            no: this.wallData.length + 1,
            ...wallData,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };
        this.wallData.push(newWall);
        this.markAsModified();
        return newWall;
    },
    
    // 벽체 데이터 삭제
    removeWall(id) {
        const index = this.wallData.findIndex(wall => wall.id === id);
        if (index !== -1) {
            this.wallData.splice(index, 1);
            this.selectedRows.delete(id);
            this.markAsModified();
            this.renumberWalls();
            return true;
        }
        return false;
    },
    
    // 벽체 번호 재정렬
    renumberWalls() {
        this.wallData.forEach((wall, index) => {
            wall.no = index + 1;
        });
    },
    
    // 데이터 수정 표시
    markAsModified() {
        this.isDataModified = true;
    },
    
    // 선택된 벽체 정보
    getSelectedWalls() {
        return this.wallData.filter(wall => this.selectedRows.has(wall.id));
    },
    
    // 벽체 타입별 통계
    getWallTypeStats() {
        const stats = {};
        this.wallData.forEach(wall => {
            if (!stats[wall.wallType]) {
                stats[wall.wallType] = { count: 0, totalArea: 0 };
            }
            stats[wall.wallType].count++;
            stats[wall.wallType].totalArea += parseFloat(wall.area) || 0;
        });
        return stats;
    }
};

// =============================================================================
// 핵심 벽체 관리 함수들
// =============================================================================

Kiyeno.Core = {
    Wall: {
        // 새 벽체 추가
        addWallType() {
            const newWall = Kiyeno.Data.addWall({
                wallType: '새 벽체 타입',
                area: '',
                thickness: '',
                fire: '',
                layer1_1: '',
                layer2_1: '',
                layer3_1: '',
                column1: '',
                infill: '',
                layer1_2: '',
                layer2_2: '',
                layer3_2: '',
                column2: '',
                channel: '',
                runner: '',
                steelPlate: ''
            });
            
            if (typeof renderTable === 'function') {
                renderTable();
            }
            
            console.log('새 벽체 추가됨:', newWall);
            return newWall;
        },
        
        // 벽체 삭제
        deleteSelectedWalls() {
            const selectedIds = Array.from(Kiyeno.Data.selectedRows);
            let deletedCount = 0;
            
            selectedIds.forEach(id => {
                if (Kiyeno.Data.removeWall(id)) {
                    deletedCount++;
                }
            });
            
            if (deletedCount > 0) {
                if (typeof renderTable === 'function') {
                    renderTable();
                }
                if (typeof showToast === 'function') {
                    showToast(`${deletedCount}개 벽체가 삭제되었습니다.`, 'success');
                }
            }
            
            return deletedCount;
        },
        
        // 벽체 복사
        duplicateSelectedWalls() {
            const selectedWalls = Kiyeno.Data.getSelectedWalls();
            let duplicatedCount = 0;
            
            selectedWalls.forEach(originalWall => {
                const { id, no, created, updated, ...wallData } = originalWall;
                const duplicatedWall = Kiyeno.Data.addWall({
                    ...wallData,
                    wallType: `${wallData.wallType} (복사)`
                });
                duplicatedCount++;
            });
            
            // 선택 초기화
            Kiyeno.Data.selectedRows.clear();
            
            if (duplicatedCount > 0) {
                if (typeof renderTable === 'function') {
                    renderTable();
                }
                if (typeof showToast === 'function') {
                    showToast(`${duplicatedCount}개 벽체가 복사되었습니다.`, 'success');
                }
            }
            
            return duplicatedCount;
        },
        
        // 필드 업데이트 (토스트 메시지 없음)
        updateFieldSilent(id, field, value) {
            const wall = Kiyeno.Data.wallData.find(w => w.id === id);
            if (wall && wall[field] !== value) {
                wall[field] = value;
                wall.updated = new Date().toISOString();
                Kiyeno.Data.markAsModified();
                
                // 즉시 렌더링
                if (typeof renderTable === 'function') {
                    renderTable();
                }
                return true;
            }
            return false;
        },
        
        // 필드 업데이트 (토스트 메시지 포함)
        updateField(id, field, value) {
            const updated = this.updateFieldSilent(id, field, value);
            if (updated && typeof showToast === 'function') {
                showToast('벽체 정보가 업데이트되었습니다.', 'success');
            }
            return updated;
        }
    }
};

// =============================================================================
// 로컬 저장소 관리
// =============================================================================

Kiyeno.Storage = {
    // 데이터 저장
    saveToLocalStorage() {
        try {
            const dataToSave = {
                wallData: Kiyeno.Data.wallData,
                lastWallId: Kiyeno.Data.lastWallId,
                savedAt: new Date().toISOString(),
                version: '2.0'
            };
            
            localStorage.setItem('kiyeno_wallData', JSON.stringify(dataToSave));
            Kiyeno.Data.isDataModified = false;
            
            console.log('✅ 데이터가 localStorage에 저장되었습니다.');
            return true;
        } catch (error) {
            console.error('❌ localStorage 저장 실패:', error);
            return false;
        }
    },
    
    // 데이터 로드
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('kiyeno_wallData');
            if (!saved) {
                console.log('저장된 데이터가 없습니다.');
                return false;
            }
            
            const data = JSON.parse(saved);
            Kiyeno.Data.wallData = data.wallData || [];
            Kiyeno.Data.lastWallId = data.lastWallId || 0;
            Kiyeno.Data.isDataModified = false;
            
            console.log(`✅ ${Kiyeno.Data.wallData.length}개 벽체 데이터를 로드했습니다.`);
            return true;
        } catch (error) {
            console.error('❌ localStorage 로드 실패:', error);
            return false;
        }
    },
    
    // 데이터 초기화
    clearAllData() {
        Kiyeno.Data.wallData = [];
        Kiyeno.Data.selectedRows.clear();
        Kiyeno.Data.selectedWallTypes.clear();
        Kiyeno.Data.lastWallId = 0;
        Kiyeno.Data.isDataModified = false;
        
        localStorage.removeItem('kiyeno_wallData');
        
        if (typeof renderTable === 'function') {
            renderTable();
        }
        
        console.log('✅ 모든 데이터가 초기화되었습니다.');
    }
};

// =============================================================================
// 이벤트 시스템
// =============================================================================

Kiyeno.Events = {
    listeners: new Map(),
    
    // 이벤트 리스너 등록
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    },
    
    // 이벤트 발생
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`이벤트 핸들러 오류 (${event}):`, error);
                }
            });
        }
    },
    
    // 이벤트 리스너 제거
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
};

// =============================================================================
// 유틸리티 함수들
// =============================================================================

Kiyeno.Utils = {
    // 디바운스
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 숫자 검증
    validateNumber(value, fieldName, min = 0, max = Number.MAX_SAFE_INTEGER) {
        const num = parseFloat(value);
        if (isNaN(num)) {
            console.warn(`${fieldName}: 숫자가 아님`);
            return null;
        }
        if (num < min || num > max) {
            console.warn(`${fieldName}: 범위 초과 (${min}-${max})`);
            return null;
        }
        return num;
    },
    
    // 텍스트 검증
    validateText(value, fieldName) {
        if (typeof value !== 'string') {
            return String(value).trim();
        }
        return value.trim();
    },
    
    // 포맷팅
    formatNumber(value) {
        return parseFloat(value).toLocaleString();
    },
    
    formatCurrency(value) {
        return `₩${parseFloat(value).toLocaleString()}`;
    }
};

// =============================================================================
// 전역 함수 별칭 (하위 호환성)
// =============================================================================

// 벽체 관리 API 연결
Kiyeno.Core.Wall = {
    async addWallType() {
        try {
            const newWall = {
                name: '새 벽체',
                type: 'custom',
                wallType: '새 벽체',
                area: 0,
                no: Kiyeno.Data.wallData.length + 1
            };
            
            const createdWall = await window.priceDB.createWall(newWall);
            
            // 로컬 데이터에 추가
            Kiyeno.Data.wallData.push(createdWall);
            
            // UI 업데이트
            renderTable();
            updateSelectionInfo();
            
            showToast('새 벽체가 추가되었습니다.', 'success');
            console.log('✅ 벽체 추가 완료:', createdWall);
            
            return createdWall;
        } catch (error) {
            console.error('❌ 벽체 추가 실패:', error);
            showToast('벽체 추가 중 오류가 발생했습니다.', 'error');
        }
    },

    async deleteSelectedWalls() {
        try {
            const selectedIds = Array.from(Kiyeno.Data.selectedRows);
            let deleteCount = 0;
            
            for (const wallId of selectedIds) {
                await window.priceDB.deleteWall(wallId);
                
                // 로컬 데이터에서 제거
                const index = Kiyeno.Data.wallData.findIndex(w => w.id === wallId);
                if (index !== -1) {
                    Kiyeno.Data.wallData.splice(index, 1);
                    deleteCount++;
                }
            }
            
            // 선택 해제
            Kiyeno.Data.selectedRows.clear();
            
            // 번호 재정렬
            Kiyeno.Data.wallData.forEach((wall, i) => {
                wall.no = i + 1;
            });
            
            // UI 업데이트
            renderTable();
            updateSelectionInfo();
            
            showToast(`${deleteCount}개의 벽체가 삭제되었습니다.`, 'success');
            return deleteCount;
        } catch (error) {
            console.error('❌ 벽체 삭제 실패:', error);
            showToast('벽체 삭제 중 오류가 발생했습니다.', 'error');
            return 0;
        }
    },

    duplicateSelectedWalls() {
        // 복사 기능은 로컬에서 처리 (임시)
        const selectedIds = Array.from(Kiyeno.Data.selectedRows);
        let duplicateCount = 0;
        
        selectedIds.forEach(wallId => {
            const wall = Kiyeno.Data.wallData.find(w => w.id === wallId);
            if (wall) {
                const newWall = {
                    ...wall,
                    id: `wall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    no: Kiyeno.Data.wallData.length + 1,
                    wallType: `${wall.wallType} (복사)`
                };
                
                Kiyeno.Data.wallData.push(newWall);
                duplicateCount++;
            }
        });
        
        if (duplicateCount > 0) {
            renderTable();
            updateSelectionInfo();
            showToast(`${duplicateCount}개의 벽체가 복사되었습니다.`, 'success');
        }
        
        return duplicateCount;
    },

    async updateField(id, field, value) {
        try {
            const wall = Kiyeno.Data.wallData.find(w => w.id === id);
            if (!wall) return;
            
            const updatedWall = { ...wall, [field]: value };
            await window.priceDB.updateWall(id, updatedWall);
            
            // 로컬 데이터 업데이트
            Object.assign(wall, updatedWall);
            
            // UI 업데이트
            renderTable();
            
        } catch (error) {
            console.error('❌ 벽체 업데이트 실패:', error);
            showToast('벽체 업데이트 중 오류가 발생했습니다.', 'error');
        }
    },

    updateFieldSilent(id, field, value) {
        // 무음 업데이트 (로컬만)
        const wall = Kiyeno.Data.wallData.find(w => w.id === id);
        if (wall) {
            wall[field] = value;
        }
    }
};

// 자주 사용되는 함수들의 전역 별칭
window.addWallType = () => Kiyeno.Core.Wall.addWallType();
window.deleteSelectedWalls = () => Kiyeno.Core.Wall.deleteSelectedWalls();
window.duplicateSelectedWalls = () => Kiyeno.Core.Wall.duplicateSelectedWalls();
window.updateWallField = (id, field, value) => Kiyeno.Core.Wall.updateField(id, field, value);
window.updateWallFieldSilent = (id, field, value) => Kiyeno.Core.Wall.updateFieldSilent(id, field, value);

// 네임스페이스 함수 별칭
Kiyeno.Core.exportData = () => {
    if (typeof showDataManagementModal === 'function') {
        showDataManagementModal();
    }
};

// 데이터 관리 함수들
window.saveToLocalStorage = () => Kiyeno.Storage.saveToLocalStorage();
window.loadFromLocalStorage = () => Kiyeno.Storage.loadFromLocalStorage();
window.clearAllData = () => Kiyeno.Storage.clearAllData();

// 데이터 수정 상태 관리
window.markDataAsModified = () => Kiyeno.Data.markAsModified();

// 디버깅 함수들
window.debugLocalStorage = function() {
    console.log('=== localStorage 디버깅 ===');
    console.log('wallData 키 존재:', localStorage.getItem('kiyeno_wallData') !== null);
    console.log('현재 wallData 길이:', Kiyeno.Data.wallData.length);
    console.log('마지막 ID:', Kiyeno.Data.lastWallId);
    console.log('수정됨:', Kiyeno.Data.isDataModified);
};

window.clearAllLocalStorageData = function() {
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        Kiyeno.Storage.clearAllData();
        alert('모든 데이터가 삭제되었습니다.');
    }
};

// =============================================================================
// 초기화
// =============================================================================

console.log('[INFO] Kiyeno 핵심 모듈 로드 완료');

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Kiyeno 핵심 시스템 초기화 완료');
    
    // 자동 저장 (30초마다)
    setInterval(() => {
        if (Kiyeno.Data.isDataModified) {
            Kiyeno.Storage.saveToLocalStorage();
        }
    }, 30000);
});