/**
 * 유효성 검사 유틸리티
 * 데이터 유효성 검사를 위한 함수들
 */

import { VALIDATION_RULES, REGEX_PATTERNS } from './constants.js';

/**
 * 기본 유효성 검사 결과 객체
 */
function createValidationResult(isValid, message = '', field = '') {
    return {
        isValid,
        message,
        field,
        timestamp: new Date().toISOString()
    };
}

/**
 * 필수 값 검사
 */
export function validateRequired(value, fieldName = '') {
    if (value === null || value === undefined || value === '') {
        return createValidationResult(false, `${fieldName}은(는) 필수 입력 항목입니다.`, fieldName);
    }
    return createValidationResult(true);
}

/**
 * 문자열 길이 검사
 */
export function validateLength(value, min, max, fieldName = '') {
    if (typeof value !== 'string') {
        return createValidationResult(false, `${fieldName}은(는) 문자열이어야 합니다.`, fieldName);
    }
    
    if (value.length < min) {
        return createValidationResult(false, `${fieldName}은(는) 최소 ${min}자 이상이어야 합니다.`, fieldName);
    }
    
    if (value.length > max) {
        return createValidationResult(false, `${fieldName}은(는) 최대 ${max}자 이하여야 합니다.`, fieldName);
    }
    
    return createValidationResult(true);
}

/**
 * 숫자 범위 검사
 */
export function validateRange(value, min, max, fieldName = '') {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
        return createValidationResult(false, `${fieldName}은(는) 유효한 숫자여야 합니다.`, fieldName);
    }
    
    if (num < min) {
        return createValidationResult(false, `${fieldName}은(는) ${min} 이상이어야 합니다.`, fieldName);
    }
    
    if (num > max) {
        return createValidationResult(false, `${fieldName}은(는) ${max} 이하여야 합니다.`, fieldName);
    }
    
    return createValidationResult(true);
}

/**
 * 정규식 패턴 검사
 */
export function validatePattern(value, pattern, fieldName = '', errorMessage = '') {
    if (!pattern.test(value)) {
        const message = errorMessage || `${fieldName}의 형식이 올바르지 않습니다.`;
        return createValidationResult(false, message, fieldName);
    }
    return createValidationResult(true);
}

/**
 * 이메일 유효성 검사
 */
export function validateEmail(email) {
    const result = validatePattern(email, REGEX_PATTERNS.EMAIL, '이메일', '유효한 이메일 주소를 입력해주세요.');
    return result;
}

/**
 * 전화번호 유효성 검사
 */
export function validatePhone(phone) {
    const result = validatePattern(phone, REGEX_PATTERNS.PHONE, '전화번호', '유효한 전화번호를 입력해주세요.');
    return result;
}

/**
 * 벽체 이름 유효성 검사
 */
export function validateWallName(name) {
    const requiredCheck = validateRequired(name, '벽체 이름');
    if (!requiredCheck.isValid) return requiredCheck;
    
    const lengthCheck = validateLength(name, 
        VALIDATION_RULES.WALL_NAME.MIN_LENGTH, 
        VALIDATION_RULES.WALL_NAME.MAX_LENGTH, 
        '벽체 이름'
    );
    if (!lengthCheck.isValid) return lengthCheck;
    
    const patternCheck = validatePattern(name, 
        VALIDATION_RULES.WALL_NAME.PATTERN, 
        '벽체 이름', 
        '벽체 이름은 한글, 영문, 숫자, 공백, 하이픈, 언더스코어만 사용할 수 있습니다.'
    );
    
    return patternCheck;
}

/**
 * 자재 이름 유효성 검사
 */
export function validateMaterialName(name) {
    const requiredCheck = validateRequired(name, '자재 이름');
    if (!requiredCheck.isValid) return requiredCheck;
    
    const lengthCheck = validateLength(name, 
        VALIDATION_RULES.MATERIAL_NAME.MIN_LENGTH, 
        VALIDATION_RULES.MATERIAL_NAME.MAX_LENGTH, 
        '자재 이름'
    );
    if (!lengthCheck.isValid) return lengthCheck;
    
    const patternCheck = validatePattern(name, 
        VALIDATION_RULES.MATERIAL_NAME.PATTERN, 
        '자재 이름', 
        '자재 이름은 한글, 영문, 숫자, 공백, 하이픈, 언더스코어, 괄호만 사용할 수 있습니다.'
    );
    
    return patternCheck;
}

/**
 * 두께 유효성 검사
 */
export function validateThickness(thickness) {
    const requiredCheck = validateRequired(thickness, '두께');
    if (!requiredCheck.isValid) return requiredCheck;
    
    const rangeCheck = validateRange(thickness, 
        VALIDATION_RULES.THICKNESS.MIN, 
        VALIDATION_RULES.THICKNESS.MAX, 
        '두께'
    );
    
    return rangeCheck;
}

/**
 * 가격 유효성 검사
 */
export function validatePrice(price) {
    const requiredCheck = validateRequired(price, '가격');
    if (!requiredCheck.isValid) return requiredCheck;
    
    const rangeCheck = validateRange(price, 
        VALIDATION_RULES.PRICE.MIN, 
        VALIDATION_RULES.PRICE.MAX, 
        '가격'
    );
    
    return rangeCheck;
}

/**
 * 벽체 데이터 전체 유효성 검사
 */
export function validateWallData(wallData) {
    const errors = [];
    
    // 필수 필드 검사
    const nameCheck = validateWallName(wallData.name);
    if (!nameCheck.isValid) errors.push(nameCheck);
    
    const typeCheck = validateRequired(wallData.type, '벽체 타입');
    if (!typeCheck.isValid) errors.push(typeCheck);
    
    // 선택 필드 검사
    if (wallData.thickness !== undefined && wallData.thickness !== null) {
        const thicknessCheck = validateThickness(wallData.thickness);
        if (!thicknessCheck.isValid) errors.push(thicknessCheck);
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        message: errors.length > 0 ? errors.map(e => e.message).join('\n') : '유효성 검사 통과'
    };
}

/**
 * 자재 데이터 전체 유효성 검사
 */
export function validateMaterialData(materialData) {
    const errors = [];
    
    // 필수 필드 검사
    const nameCheck = validateMaterialName(materialData.name);
    if (!nameCheck.isValid) errors.push(nameCheck);
    
    const categoryCheck = validateRequired(materialData.category, '카테고리');
    if (!categoryCheck.isValid) errors.push(categoryCheck);
    
    const unitCheck = validateRequired(materialData.unit, '단위');
    if (!unitCheck.isValid) errors.push(unitCheck);
    
    const priceCheck = validatePrice(materialData.price);
    if (!priceCheck.isValid) errors.push(priceCheck);
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        message: errors.length > 0 ? errors.map(e => e.message).join('\n') : '유효성 검사 통과'
    };
}

/**
 * 파일 유효성 검사
 */
export function validateFile(file, allowedTypes = [], maxSize = 5 * 1024 * 1024) {
    if (!file) {
        return createValidationResult(false, '파일을 선택해주세요.');
    }
    
    // 파일 타입 검사
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        return createValidationResult(false, `허용되지 않는 파일 형식입니다. (${allowedTypes.join(', ')})`);
    }
    
    // 파일 크기 검사
    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        return createValidationResult(false, `파일 크기가 ${maxSizeMB}MB를 초과했습니다.`);
    }
    
    return createValidationResult(true);
}

/**
 * 사용자 정의 유효성 검사 함수
 */
export function validateCustom(value, validator, fieldName = '') {
    try {
        const result = validator(value);
        if (typeof result === 'boolean') {
            return createValidationResult(result, result ? '' : `${fieldName} 유효성 검사 실패`, fieldName);
        }
        return result;
    } catch (error) {
        return createValidationResult(false, `${fieldName} 유효성 검사 중 오류 발생: ${error.message}`, fieldName);
    }
}

/**
 * 다중 유효성 검사
 */
export function validateMultiple(validations) {
    const results = [];
    let isValid = true;
    
    for (const validation of validations) {
        const result = validation();
        results.push(result);
        if (!result.isValid) {
            isValid = false;
        }
    }
    
    return {
        isValid,
        results,
        errors: results.filter(r => !r.isValid),
        message: isValid ? '모든 유효성 검사 통과' : '유효성 검사 실패'
    };
}

/**
 * 조건부 유효성 검사
 */
export function validateIf(condition, validator, value, fieldName = '') {
    if (!condition) {
        return createValidationResult(true);
    }
    
    return validator(value, fieldName);
}

/**
 * 유효성 검사 데코레이터
 */
export function createValidator(validationRules) {
    return function(data) {
        const errors = [];
        
        for (const [field, rules] of Object.entries(validationRules)) {
            const value = data[field];
            
            for (const rule of rules) {
                const result = rule(value, field);
                if (!result.isValid) {
                    errors.push(result);
                    break; // 첫 번째 오류에서 중단
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            message: errors.length > 0 ? errors.map(e => e.message).join('\n') : '유효성 검사 통과'
        };
    };
}

/**
 * 실시간 유효성 검사
 */
export function createRealTimeValidator(element, validator, errorContainer) {
    let timeoutId;
    
    element.addEventListener('input', function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            const result = validator(this.value);
            
            if (result.isValid) {
                element.classList.remove('error');
                element.classList.add('valid');
                if (errorContainer) {
                    errorContainer.textContent = '';
                }
            } else {
                element.classList.remove('valid');
                element.classList.add('error');
                if (errorContainer) {
                    errorContainer.textContent = result.message;
                }
            }
        }, 300);
    });
}

export default {
    validateRequired,
    validateLength,
    validateRange,
    validatePattern,
    validateEmail,
    validatePhone,
    validateWallName,
    validateMaterialName,
    validateThickness,
    validatePrice,
    validateWallData,
    validateMaterialData,
    validateFile,
    validateCustom,
    validateMultiple,
    validateIf,
    createValidator,
    createRealTimeValidator
};