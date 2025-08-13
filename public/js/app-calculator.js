// =============================================================================
// Kiyeno 벽체 관리 시스템 - 계산 모듈
// 벽체 상세내역 계산 및 자재 매핑
// =============================================================================

// =============================================================================
// 표준 자재 데이터
// =============================================================================

Kiyeno.StandardMaterials = {
    // priceDatabase.js에서 모든 자재 데이터 가져오기
    get MATERIALS() {
        const allMaterials = [];
        
        // 경량부품 데이터 변환
        if (window.priceDB && window.priceDB.getLightweightComponents) {
            const lightweightData = window.priceDB.getLightweightComponents();
            lightweightData.items.forEach(item => {
                allMaterials.push({
                    id: item.id,
                    name: item.name,
                    category: lightweightData.categories[item.category]?.name || item.category,
                    subcategory: item.spec,
                    unit: item.unit,
                    materialPrice: item.price,
                    laborPrice: Math.round(item.price * 0.8), // 자재비의 80%를 노무비로 설정
                    expensePrice: Math.round(item.price * 0.1) // 자재비의 10%를 경비로 설정
                });
            });
        }
        
        // 석고보드 데이터 변환
        if (window.priceDB && window.priceDB.getGypsumBoards) {
            const gypsumData = window.priceDB.getGypsumBoards();
            gypsumData.items.forEach(item => {
                allMaterials.push({
                    id: item.id,
                    name: `${item.name} ${item.w}x${item.h}x${item.t}`,
                    category: gypsumData.categories[item.category]?.name || item.category,
                    subcategory: `${item.w}x${item.h}x${item.t}`,
                    unit: item.unit,
                    materialPrice: item.priceChanged || item.priceOriginal,
                    laborPrice: Math.round((item.priceChanged || item.priceOriginal) * 0.6), // 자재비의 60%를 노무비로
                    expensePrice: Math.round((item.priceChanged || item.priceOriginal) * 0.15) // 자재비의 15%를 경비로
                });
            });
        }
        
        return allMaterials;
    },

    // 표준 자재 데이터베이스에 삽입
    async insertStandardMaterials() {
        try {
            if (typeof kiyenoDB === 'undefined') {
                console.warn('🔄 데이터베이스가 준비되지 않음. 표준 자재 삽입을 건너뜁니다.');
                return false;
            }

            const existingCount = await kiyenoDB.materials.count();
            if (existingCount > 0) {
                console.log(`📊 기존 자재 ${existingCount}개 발견. 표준 자재 삽입을 건너뜁니다.`);
                return true;
            }

            await kiyenoDB.materials.bulkAdd(this.MATERIALS);
            console.log(`✅ 표준 자재 ${this.MATERIALS.length}개가 데이터베이스에 삽입되었습니다.`);
            return true;
        } catch (error) {
            console.error('❌ 표준 자재 삽입 실패:', error);
            return false;
        }
    },

    // ID로 표준 자재 조회
    getMaterialById(id) {
        return this.MATERIALS.find(material => material.id === id) || null;
    },

    // 이름으로 표준 자재 검색
    searchMaterialsByName(name) {
        const searchTerm = name.toLowerCase();
        return this.MATERIALS.filter(material => 
            material.name.toLowerCase().includes(searchTerm)
        );
    }
};

// =============================================================================
// ID 매핑 시스템
// =============================================================================

Kiyeno.IdMappingSystem = {
    // 구성요소별 표준 자재 매핑
    COMPONENT_TO_MATERIAL_MAPPING: {
        // 석고보드 관련
        '석고보드 9.5mm 방습 (GB-S)': 'GB004',
        '석고보드 12.5mm 일반': 'GB002',
        '석고보드 15mm 일반': 'GB003',
        '내화석고보드 12.5mm': 'GB006',
        '내화석고보드 15mm': 'GB007',
        '방습석고보드 9.5mm': 'GB004',
        '방습석고보드 12.5mm': 'GB005',
        
        // 스터드 관련
        '스터드 75mm': 'ST002',
        '스터드 100mm': 'ST003',
        '스터드 150mm': 'ST004',
        
        // 단열재 관련
        '글라스울 50mm': 'IN001',
        '글라스울 75mm': 'IN002',
        '글라스울 100mm': 'IN003',
        '암면 50mm': 'IN004',
        '암면 75mm': 'IN005',
        
        // 채널/러너 관련
        '러너 75mm': 'RN002',
        '러너 100mm': 'RN003',
        '채널 75mm': 'CH002'
    },

    // 별칭 매핑 (다양한 표기법 지원)
    ALIAS_MAPPING: {
        'gypsum board 9.5': 'GB001',
        'gypsum board 12.5': 'GB002',
        '석고보드9.5': 'GB001',
        '석고보드12.5': 'GB002',
        '석고보드15': 'GB003',
        'stud 75': 'ST002',
        'stud 100': 'ST003',
        '스터드75': 'ST002',
        '스터드100': 'ST003',
        'glasswool 50': 'IN001',
        'glasswool 75': 'IN002',
        '글라스울50': 'IN001',
        '글라스울75': 'IN002'
    },

    // 표준 자재 ID 조회
    getStandardMaterialId(componentName) {
        if (!componentName) return null;
        
        const cleanName = componentName.trim();
        
        // 1. 직접 매핑 확인
        if (this.COMPONENT_TO_MATERIAL_MAPPING[cleanName]) {
            return this.COMPONENT_TO_MATERIAL_MAPPING[cleanName];
        }
        
        // 2. 별칭 매핑 확인
        const lowerName = cleanName.toLowerCase();
        if (this.ALIAS_MAPPING[lowerName]) {
            return this.ALIAS_MAPPING[lowerName];
        }
        
        // 3. 부분 일치 검색
        for (const [key, value] of Object.entries(this.COMPONENT_TO_MATERIAL_MAPPING)) {
            if (cleanName.includes(key) || key.includes(cleanName)) {
                return value;
            }
        }
        
        return null;
    },

    // 매핑 통계
    getMappingStatistics() {
        return {
            standardMaterials: Kiyeno.StandardMaterials.MATERIALS.length,
            componentMappings: Object.keys(this.COMPONENT_TO_MATERIAL_MAPPING).length,
            aliasMappings: Object.keys(this.ALIAS_MAPPING).length,
            totalMappings: Object.keys(this.COMPONENT_TO_MATERIAL_MAPPING).length + Object.keys(this.ALIAS_MAPPING).length
        };
    }
};

// =============================================================================
// 벽체 계산기
// =============================================================================

Kiyeno.Calculator = {
    // 메인 계산 함수 - 벽체 상세내역 계산
    async calculateWallBreakdown(wall) {
        try {
            console.log('🧮 벽체 상세내역 계산 시작:', wall.wallType);

            if (!wall || !wall.wallType) {
                throw new Error('벽체 정보가 유효하지 않습니다.');
            }

            const area = parseFloat(wall.area) || 0;
            if (area <= 0) {
                throw new Error('면적이 유효하지 않습니다.');
            }

            // 사용자 정의 레이어 정보에서 구성요소 추출
            const components = this.extractUserComponents(wall);
            
            if (!components || Object.keys(components).length === 0) {
                throw new Error('구성요소 정보를 찾을 수 없습니다.');
            }

            console.log('📋 사용자 정의 레이어 정보 사용');

            // 각 구성요소별 상세내역 계산
            const breakdown = [];
            let totalMaterialCost = 0;
            let totalLaborCost = 0;
            let totalExpenseCost = 0;

            for (const [componentType, componentName] of Object.entries(components)) {
                if (!componentName || componentName.trim() === '') continue;

                console.log(`🔍 구성요소 계산: ${componentType} = ${componentName}`);

                const componentBreakdown = await this.calculateComponentBreakdown(
                    componentType, 
                    componentName, 
                    wall
                );

                if (componentBreakdown) {
                    breakdown.push(componentBreakdown);
                    totalMaterialCost += componentBreakdown.totalMaterialCost || 0;
                    totalLaborCost += componentBreakdown.totalLaborCost || 0;
                    totalExpenseCost += componentBreakdown.totalExpenseCost || 0;
                }
            }

            const result = {
                wallId: wall.id,
                wallType: wall.wallType,
                area: area,
                breakdown: breakdown,
                components: breakdown,  // UI 호환성을 위해 추가
                totals: {
                    materialCost: Math.round(totalMaterialCost),
                    laborCost: Math.round(totalLaborCost),
                    expenseCost: Math.round(totalExpenseCost),
                    totalCost: Math.round(totalMaterialCost + totalLaborCost + totalExpenseCost)
                },
                summary: {
                    totalMaterialCost: Math.round(totalMaterialCost),
                    totalLaborCost: Math.round(totalLaborCost),
                    totalExpenseCost: Math.round(totalExpenseCost),
                    grandTotal: Math.round(totalMaterialCost + totalLaborCost + totalExpenseCost)
                },
                calculatedAt: new Date().toISOString()
            };

            console.log(`✅ 계산 완료. 총 비용: ${result.summary.grandTotal.toLocaleString()}원`);
            return result;

        } catch (error) {
            console.error('❌ 벽체 상세내역 계산 실패:', error);
            throw error;
        }
    },

    // 사용자 정의 구성요소 추출
    extractUserComponents(wall) {
        const components = {};
        
        // 레이어 필드들 매핑
        const layerFields = [
            'layer1_1', 'layer2_1', 'layer3_1',
            'column1', 'infill', 
            'layer1_2', 'layer2_2', 'layer3_2',
            'column2', 'channel', 'runner', 'steelPlate'
        ];
        
        layerFields.forEach(field => {
            if (wall[field] && wall[field].trim() !== '') {
                components[field] = wall[field].trim();
            }
        });
        
        return components;
    },

    // 구성요소별 상세내역 계산
    async calculateComponentBreakdown(componentType, componentName, wall) {
        try {
            const area = parseFloat(wall.area) || 0;
            
            // 자재 정보 조회
            const materialData = await this.getMaterialData(componentName);
            
            if (!materialData) {
                console.warn(`⚠️ 자재 정보를 찾을 수 없음: ${componentName}`);
                return this.getDefaultComponentBreakdown(componentType, componentName, area);
            }

            // 수량 계산 (기본적으로 면적 기준)
            const quantity = this.calculateQuantity(componentType, area);
            
            // 비용 계산
            const materialCost = (materialData.materialPrice || 0) * quantity;
            const laborCost = (materialData.laborPrice || 0) * quantity;
            const expenseCost = (materialData.expensePrice || 0) * quantity;

            return {
                componentType: componentType,
                componentName: componentName,
                materialData: materialData,
                quantity: quantity,
                unit: materialData.unit || 'EA',
                unitMaterialPrice: materialData.materialPrice || 0,
                unitLaborPrice: materialData.laborPrice || 0,
                unitExpensePrice: materialData.expensePrice || 0,
                totalMaterialCost: Math.round(materialCost),
                totalLaborCost: Math.round(laborCost),
                totalExpenseCost: Math.round(expenseCost),
                totalCost: Math.round(materialCost + laborCost + expenseCost)
            };

        } catch (error) {
            console.error(`❌ 구성요소 계산 실패 (${componentType}: ${componentName}):`, error);
            return this.getDefaultComponentBreakdown(componentType, componentName, wall.area);
        }
    },

    // 자재 정보 조회
    async getMaterialData(componentName) {
        try {
            // 1단계: ID 기반 직접 조회
            const materialId = Kiyeno.IdMappingSystem.getStandardMaterialId(componentName);
            if (materialId) {
                const materialData = Kiyeno.StandardMaterials.getMaterialById(materialId);
                if (materialData) {
                    console.log(`🎯 ID 기반 조회 성공: ${componentName} → ${materialId}`);
                    return materialData;
                }
            }

            // 2단계: 표준 자재에서 이름 검색
            const standardMaterials = Kiyeno.StandardMaterials.searchMaterialsByName(componentName);
            if (standardMaterials.length > 0) {
                console.log(`📚 표준 자재 검색 성공: ${componentName}`);
                return standardMaterials[0];
            }

            // 3단계: 데이터베이스에서 검색
            if (kiyenoDB) {
                const dbMaterials = await kiyenoDB.materials
                    .where('name')
                    .startsWithIgnoreCase(componentName)
                    .toArray();
                
                if (dbMaterials.length > 0) {
                    console.log(`💾 DB 검색 성공: ${componentName}`);
                    return dbMaterials[0];
                }
            }

            return null;
        } catch (error) {
            console.error(`❌ 자재 정보 조회 실패: ${componentName}`, error);
            return null;
        }
    },

    // 수량 계산
    calculateQuantity(componentType, area) {
        const baseQuantity = area || 1;

        switch (componentType) {
            case 'layer1_1':
            case 'layer2_1':
            case 'layer3_1':
            case 'layer1_2':
            case 'layer2_2':
            case 'layer3_2':
                // 석고보드류: 면적당 1EA
                return Math.ceil(baseQuantity);

            case 'column1':
            case 'column2':
                // 스터드류: 면적에 따른 개수 (평방미터당 약 3개)
                return Math.ceil(baseQuantity * 3);

            case 'infill':
                // 단열재: 면적당 1EA
                return Math.ceil(baseQuantity);

            case 'channel':
            case 'runner':
                // 채널/러너: 둘레 계산 (가정: 정사각형 기준)
                const perimeter = Math.sqrt(baseQuantity) * 4;
                return Math.ceil(perimeter / 3); // 3미터당 1개

            case 'steelPlate':
                // 철판: 면적당 1EA
                return Math.ceil(baseQuantity);

            default:
                return Math.ceil(baseQuantity);
        }
    },

    // 기본 구성요소 내역 생성 (자재 정보가 없을 때)
    getDefaultComponentBreakdown(componentType, componentName, area) {
        const quantity = this.calculateQuantity(componentType, area);
        
        return {
            componentType: componentType,
            componentName: componentName,
            materialData: null,
            quantity: quantity,
            unit: 'EA',
            unitMaterialPrice: 2000,
            unitLaborPrice: 1000,
            unitExpensePrice: 200,
            totalMaterialCost: Math.round(2000 * quantity),
            totalLaborCost: Math.round(1000 * quantity),
            totalExpenseCost: Math.round(200 * quantity),
            totalCost: Math.round(3200 * quantity),
            isDefault: true
        };
    }
};

// =============================================================================
// 자동 마이그레이션 시스템
// =============================================================================

Kiyeno.MigrationHelper = {
    // 전체 마이그레이션 수행
    async performFullMigration() {
        try {
            console.log('🔄 ID 기반 시스템 마이그레이션 시작...');

            // 1단계: 표준 자재 삽입
            const standardMaterialsInserted = await Kiyeno.StandardMaterials.insertStandardMaterials();
            if (!standardMaterialsInserted) {
                console.warn('⚠️ 표준 자재 삽입 실패 또는 건너뜀');
            }

            // 2단계: 매핑 시스템 테스트
            const mappingStats = Kiyeno.IdMappingSystem.getMappingStatistics();
            console.log('📊 매핑 시스템 통계:', mappingStats);

            console.log('✅ ID 기반 시스템 마이그레이션 완료');
            return true;

        } catch (error) {
            console.error('❌ ID 기반 시스템 마이그레이션 실패:', error);
            return false;
        }
    },

    // 마이그레이션 상태 확인
    async checkMigrationStatus() {
        const status = {
            databaseReady: typeof kiyenoDB !== 'undefined',
            standardMaterialsReady: false,
            mappingSystemReady: true,
            calculatorReady: false
        };

        try {
            if (kiyenoDB) {
                const materialCount = await kiyenoDB.materials.count();
                status.standardMaterialsReady = materialCount > 0;
            }

            status.calculatorReady = typeof Kiyeno.Calculator.calculateWallBreakdown === 'function';

        } catch (error) {
            console.error('마이그레이션 상태 확인 실패:', error);
        }

        return status;
    }
};

// =============================================================================
// 전역 함수 별칭 (하위 호환성)
// =============================================================================

// 네임스페이스 별칭 설정
Kiyeno.IdBasedCalculator = Kiyeno.Calculator;

// 전역 참조 설정
window.KiyenoIdBasedCalculator = Kiyeno.Calculator;
window.KiyenoStandardMaterials = Kiyeno.StandardMaterials;
window.calculateWallBreakdown = function(wall) {
    return Kiyeno.Calculator.calculateWallBreakdown(wall);
};

// =============================================================================
// 초기화
// =============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🧮 계산기 모듈 초기화 시작...');
    
    // 자동 마이그레이션 실행 (1초 후)
    setTimeout(async () => {
        try {
            await Kiyeno.MigrationHelper.performFullMigration();
            
            const status = await Kiyeno.MigrationHelper.checkMigrationStatus();
            console.log('📊 마이그레이션 상태:', status);
            
        } catch (error) {
            console.error('❌ 자동 마이그레이션 실패:', error);
        }
    }, 1000);
});

console.log('🚀 계산기 모듈 로드 완료');