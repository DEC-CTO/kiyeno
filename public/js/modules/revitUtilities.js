// =============================================================================
// Kiyeno 벽체 관리 시스템 - Revit 유틸리티 모듈
// 공통 유틸리티 함수, 헬퍼 함수, 상수 정의 전담 모듈
// =============================================================================

// =============================================================================
// 공통 유틸리티 함수들
// =============================================================================

// 현재 모달 닫기 (공통 함수)
function closeCurrentModal() {
    // 서브 모달 우선 확인
    const subModal = document.querySelector('.sub-modal-overlay');
    if (subModal && typeof closeSubModal === 'function') {
        closeSubModal(subModal);
        return;
    }
    
    // 일반 모달 확인
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// 필드 라벨 매핑 함수
function getFieldLabel(field) {
    const labels = {
        itemName: '아이템',
        spacing: '간격',
        height: '높이',
        size: 'SIZE',
        location: '부위',
        workType: '공종',
        unit: 'UNIT'
    };
    return labels[field] || field;
}

// 필드 표시 이름 매핑 함수
function getFieldDisplayName(fieldName) {
    const fieldNames = {
        fire: '방화',
        sound: '차음', 
        thermal: '단열',
        structure: '구조',
        waterproof: '방수',
        finish: '마감'
    };
    return fieldNames[fieldName] || fieldName;
}

// 숫자를 천단위 콤마 형식으로 변환
function formatNumberWithCommas(number) {
    if (typeof number !== 'number') {
        return number;
    }
    return number.toLocaleString();
}

// 천단위 콤마가 포함된 문자열을 숫자로 변환
function parseNumberFromCommaString(str) {
    if (typeof str !== 'string') {
        return parseInt(str) || 0;
    }
    return parseInt(str.replace(/,/g, '')) || 0;
}

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDateToYMD(date) {
    if (!date) return '';
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toISOString().split('T')[0];
}

// 안전한 JSON 파싱
function safeJsonParse(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('JSON 파싱 실패:', error);
        return defaultValue;
    }
}

// 로컬스토리지 안전 저장
function safeLocalStorageSet(key, value) {
    try {
        const jsonString = JSON.stringify(value);
        localStorage.setItem(key, jsonString);
        return true;
    } catch (error) {
        console.error('로컬스토리지 저장 실패:', error);
        return false;
    }
}

// 로컬스토리지 안전 로드
function safeLocalStorageGet(key, defaultValue = null) {
    try {
        const jsonString = localStorage.getItem(key);
        if (jsonString === null) {
            return defaultValue;
        }
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('로컬스토리지 로드 실패:', error);
        return defaultValue;
    }
}

// 배열에서 중복 제거
function removeDuplicatesFromArray(array, keyFunction = null) {
    if (!Array.isArray(array)) {
        return [];
    }
    
    if (keyFunction && typeof keyFunction === 'function') {
        const seen = new Set();
        return array.filter(item => {
            const key = keyFunction(item);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    } else {
        return [...new Set(array)];
    }
}

// 딥 클론 (간단한 객체용)
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    
    const cloned = {};
    Object.keys(obj).forEach(key => {
        cloned[key] = deepClone(obj[key]);
    });
    
    return cloned;
}

// 문자열이 비어있거나 공백만 있는지 확인
function isEmptyOrWhitespace(str) {
    return !str || typeof str !== 'string' || str.trim().length === 0;
}

// 객체에서 빈 값 제거
function removeEmptyValues(obj) {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== null && value !== undefined && value !== '') {
            if (typeof value === 'object' && !Array.isArray(value)) {
                const cleanedValue = removeEmptyValues(value);
                if (Object.keys(cleanedValue).length > 0) {
                    cleaned[key] = cleanedValue;
                }
            } else {
                cleaned[key] = value;
            }
        }
    });
    return cleaned;
}

// 디바운스 함수
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

// 스로틀 함수
function throttle(func, wait) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    };
}

// 요소가 뷰포트에 보이는지 확인
function isElementInViewport(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// 스크롤을 부드럽게 이동
function smoothScrollToElement(element, offset = 0) {
    if (!element) return;
    
    const elementPosition = element.offsetTop - offset;
    window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
    });
}

// 파일 크기를 읽기 쉬운 형식으로 변환
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// CSV 문자열 생성
function generateCSVString(data, headers = null) {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }
    
    const csvRows = [];
    
    // 헤더 추가
    if (headers && Array.isArray(headers)) {
        csvRows.push(headers.join(','));
    } else if (typeof data[0] === 'object') {
        csvRows.push(Object.keys(data[0]).join(','));
    }
    
    // 데이터 행 추가
    data.forEach(row => {
        if (typeof row === 'object') {
            const values = Object.values(row).map(value => {
                // CSV에서 쉼표나 따옴표가 포함된 값은 따옴표로 감싸기
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            });
            csvRows.push(values.join(','));
        } else {
            csvRows.push(String(row));
        }
    });
    
    return csvRows.join('\n');
}

// URL에서 쿼리 파라미터 추출
function getQueryParams() {
    const params = {};
    const queryString = window.location.search.slice(1);
    
    if (queryString) {
        queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });
    }
    
    return params;
}

// 브라우저 타입 감지
function getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "Unknown";
    
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
        browserName = "Chrome";
        browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || "Unknown";
    } else if (userAgent.includes("Firefox")) {
        browserName = "Firefox";
        browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || "Unknown";
    } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
        browserName = "Safari";
        browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || "Unknown";
    } else if (userAgent.includes("Edg")) {
        browserName = "Edge";
        browserVersion = userAgent.match(/Edg\/(\d+)/)?.[1] || "Unknown";
    }
    
    return {
        name: browserName,
        version: browserVersion,
        userAgent: userAgent
    };
}

// =============================================================================
// 상수 정의
// =============================================================================

// 로컬스토리지 키 상수
const STORAGE_KEYS = {
    REVIT_WALL_TYPES: 'kiyeno_revitWallTypes',
    UNIT_PRICE_ITEMS: 'kiyeno_unitPriceItems',
    USER_PREFERENCES: 'kiyeno_userPreferences',
    APP_SETTINGS: 'kiyeno_appSettings'
};

// 벽체 필드 타입 상수
const WALL_FIELD_TYPES = {
    FIRE: 'fire',
    SOUND: 'sound',
    THERMAL: 'thermal',
    STRUCTURE: 'structure',
    WATERPROOF: 'waterproof',
    FINISH: 'finish'
};

// 일위대가 상태 상수
const UNIT_PRICE_STATUS = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    ARCHIVED: 'archived'
};

// 파일 타입 상수
const FILE_TYPES = {
    JSON: 'application/json',
    CSV: 'text/csv',
    EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

// 모달 크기 상수
const MODAL_SIZES = {
    SMALL: 'modal-sm',
    MEDIUM: 'modal-md',
    LARGE: 'modal-lg',
    EXTRA_LARGE: 'modal-xl'
};

// =============================================================================
// 전역 함수 등록 (revitUtilities.js)
// =============================================================================

// 공통 유틸리티 함수들
window.closeCurrentModal = closeCurrentModal;
window.getFieldLabel = getFieldLabel;
window.getFieldDisplayName = getFieldDisplayName;
window.formatNumberWithCommas = formatNumberWithCommas;
window.parseNumberFromCommaString = parseNumberFromCommaString;
window.formatDateToYMD = formatDateToYMD;

// JSON 및 로컬스토리지 유틸리티
window.safeJsonParse = safeJsonParse;
window.safeLocalStorageSet = safeLocalStorageSet;
window.safeLocalStorageGet = safeLocalStorageGet;

// 배열 및 객체 유틸리티
window.removeDuplicatesFromArray = removeDuplicatesFromArray;
window.deepClone = deepClone;
window.isEmptyOrWhitespace = isEmptyOrWhitespace;
window.removeEmptyValues = removeEmptyValues;

// 함수 유틸리티
window.debounce = debounce;
window.throttle = throttle;

// DOM 유틸리티
window.isElementInViewport = isElementInViewport;
window.smoothScrollToElement = smoothScrollToElement;

// 파일 및 데이터 유틸리티
window.formatFileSize = formatFileSize;
window.generateCSVString = generateCSVString;

// 브라우저 유틸리티
window.getQueryParams = getQueryParams;
window.getBrowserInfo = getBrowserInfo;

// 상수들
window.STORAGE_KEYS = STORAGE_KEYS;
window.WALL_FIELD_TYPES = WALL_FIELD_TYPES;
window.UNIT_PRICE_STATUS = UNIT_PRICE_STATUS;
window.FILE_TYPES = FILE_TYPES;
window.MODAL_SIZES = MODAL_SIZES;

console.log('✅ revitUtilities.js 로드 완료 - 공통 유틸리티 함수들 및 상수 등록됨');