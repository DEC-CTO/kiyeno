/**
 * 상수 정의
 * 애플리케이션에서 사용하는 상수들을 정의
 */

// 애플리케이션 설정
export const APP_CONFIG = {
    NAME: 'Kiyeno 벽체 관리 시스템',
    VERSION: '1.0.0',
    DEBUG: window.location.hostname === 'localhost',
    API_TIMEOUT: 30000, // 30초
    AUTOSAVE_INTERVAL: 60000, // 1분
    MAX_RETRY_COUNT: 3
};

// 벽체 관련 상수
export const WALL_TYPES = {
    LIGHTWEIGHT: '경량벽체',
    HEAVY: '중량벽체',
    PARTITION: '파티션',
    COMPOSITE: '복합벽체'
};

export const FIRE_RATINGS = {
    NONE: '무',
    ONE_HOUR: '1H',
    TWO_HOUR: '2H',
    THREE_HOUR: '3H'
};

export const WALL_LAYERS = {
    LAYER1_1: 'layer1_1',
    LAYER1_2: 'layer1_2',
    LAYER2_1: 'layer2_1',
    LAYER2_2: 'layer2_2',
    COLUMN1: 'column1',
    INFILL: 'infill',
    CHANNEL: 'channel',
    RUNNER: 'runner'
};

// 자재 관련 상수
export const MATERIAL_CATEGORIES = {
    STRUCTURE: '구조재',
    FINISH: '마감재',
    INSULATION: '단열재',
    WATERPROOF: '방수재',
    SOUNDPROOF: '차음재'
};

export const MATERIAL_UNITS = {
    SQUARE_METER: '㎡',
    METER: 'M',
    PIECE: 'EA',
    KILOGRAM: 'kg',
    LITER: 'L'
};

// 계산 방법 상수
export const CALCULATION_METHODS = {
    AREA: 'area',
    LENGTH_DIVIDED_SPACING_TIMES_HEIGHT: 'length_divided_spacing_times_height',
    LENGTH_TIMES_HEIGHT_DIVIDED_SPACING: 'length_times_height_divided_spacing',
    PERIMETER: 'perimeter'
};

// UI 상수
export const UI_STATES = {
    LOADING: 'loading',
    READY: 'ready',
    ERROR: 'error',
    SAVING: 'saving'
};

export const MODAL_TYPES = {
    MATERIAL_MANAGE: 'material_manage',
    REVIT_TYPE_MATCHING: 'revit_type_matching',
    WALL_DETAIL: 'wall_detail',
    CONFIRM: 'confirm',
    ALERT: 'alert'
};

// 이벤트 타입
export const EVENT_TYPES = {
    WALL_CREATED: 'wall_created',
    WALL_UPDATED: 'wall_updated',
    WALL_DELETED: 'wall_deleted',
    MATERIAL_CREATED: 'material_created',
    MATERIAL_UPDATED: 'material_updated',
    MATERIAL_DELETED: 'material_deleted',
    REVIT_SYNC: 'revit_sync',
    DATA_LOADED: 'data_loaded',
    ERROR_OCCURRED: 'error_occurred'
};

// 로그 레벨
export const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

// 색상 상수
export const COLORS = {
    PRIMARY: '#3b82f6',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#6b7280',
    LIGHT: '#f8fafc',
    DARK: '#1f2937'
};

// 데이터 검증 규칙
export const VALIDATION_RULES = {
    WALL_NAME: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 100,
        PATTERN: /^[가-힣a-zA-Z0-9\s\-_]+$/
    },
    MATERIAL_NAME: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 100,
        PATTERN: /^[가-힣a-zA-Z0-9\s\-_()]+$/
    },
    THICKNESS: {
        MIN: 0,
        MAX: 1000
    },
    PRICE: {
        MIN: 0,
        MAX: 999999999
    }
};

// 키보드 단축키
export const KEYBOARD_SHORTCUTS = {
    SAVE: 'Ctrl+S',
    NEW: 'Ctrl+N',
    DELETE: 'Delete',
    COPY: 'Ctrl+C',
    PASTE: 'Ctrl+V',
    UNDO: 'Ctrl+Z',
    REDO: 'Ctrl+Y',
    SEARCH: 'Ctrl+F'
};

// 디바운스 시간 (ms)
export const DEBOUNCE_TIMES = {
    SEARCH: 300,
    AUTOSAVE: 1000,
    RESIZE: 100,
    SCROLL: 50
};

// 파일 관련 상수
export const FILE_TYPES = {
    JSON: 'application/json',
    CSV: 'text/csv',
    EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

export const FILE_EXTENSIONS = {
    JSON: '.json',
    CSV: '.csv',
    EXCEL: '.xlsx'
};

// 정규식 패턴
export const REGEX_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[0-9-+().\s]+$/,
    NUMBER: /^[0-9]+$/,
    DECIMAL: /^[0-9]+\.?[0-9]*$/,
    KOREAN: /^[가-힣]+$/,
    ENGLISH: /^[a-zA-Z]+$/,
    ALPHANUMERIC: /^[a-zA-Z0-9]+$/
};

// 기본값
export const DEFAULT_VALUES = {
    WALL_THICKNESS: 150,
    MATERIAL_PRICE: 0,
    FIRE_RATING: '1H',
    WALL_TYPE: '경량벽체',
    MATERIAL_CATEGORY: '구조재',
    MATERIAL_UNIT: '㎡'
};

export default {
    APP_CONFIG,
    WALL_TYPES,
    FIRE_RATINGS,
    WALL_LAYERS,
    MATERIAL_CATEGORIES,
    MATERIAL_UNITS,
    CALCULATION_METHODS,
    UI_STATES,
    MODAL_TYPES,
    EVENT_TYPES,
    LOG_LEVELS,
    COLORS,
    VALIDATION_RULES,
    KEYBOARD_SHORTCUTS,
    DEBOUNCE_TIMES,
    FILE_TYPES,
    FILE_EXTENSIONS,
    REGEX_PATTERNS,
    DEFAULT_VALUES
};