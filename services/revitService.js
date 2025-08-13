/**
 * Revit 서비스 - Revit 연동 및 타입 매핑 관리
 */

const DataService = require('./dataService');
const WallService = require('./wallService');
const MaterialService = require('./materialService');

class RevitService extends DataService {
    constructor() {
        super();
        this.typeMappingFile = 'revit-type-mapping.json';
        this.revitDataFile = 'revit-data.json';
        this.wallService = new WallService();
        this.materialService = new MaterialService();
    }

    /**
     * Revit 데이터 동기화
     */
    async syncRevitData(revitData) {
        try {
            // Revit 데이터 저장
            await this.saveData(this.revitDataFile, {
                data: revitData,
                syncTime: new Date().toISOString()
            });

            // 타입 매핑 정보 로드
            const typeMappings = await this.loadData(this.typeMappingFile);

            // 매핑된 데이터 처리
            const processedData = await this.processRevitData(revitData, typeMappings);

            return {
                success: true,
                data: processedData,
                message: 'Revit 데이터 동기화 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Revit 데이터 동기화 실패'
            };
        }
    }

    /**
     * Revit 타입 매핑 조회
     */
    async getTypeMappings() {
        try {
            const mappings = await this.loadData(this.typeMappingFile);
            return {
                success: true,
                data: mappings,
                message: 'Revit 타입 매핑 조회 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Revit 타입 매핑 조회 실패'
            };
        }
    }

    /**
     * Revit 타입 매핑 저장
     */
    async saveTypeMappings(mappings) {
        try {
            const mappingData = {
                mappings: mappings,
                updated: new Date().toISOString(),
                version: 1
            };

            await this.saveData(this.typeMappingFile, mappingData);

            return {
                success: true,
                data: mappingData,
                message: 'Revit 타입 매핑 저장 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Revit 타입 매핑 저장 실패'
            };
        }
    }

    /**
     * Revit 데이터 내보내기
     */
    async exportToRevit(wallIds) {
        try {
            const exportData = [];

            for (const wallId of wallIds) {
                const wallResult = await this.wallService.getWallById(wallId);
                if (wallResult.success) {
                    const wall = wallResult.data;
                    
                    // Revit 포맷으로 변환
                    const revitWall = {
                        id: wall.id,
                        name: wall.name,
                        type: wall.type,
                        thickness: wall.thickness,
                        materials: await this.convertMaterialsToRevitFormat(wall.materials),
                        properties: this.generateRevitProperties(wall)
                    };

                    exportData.push(revitWall);
                }
            }

            return {
                success: true,
                data: exportData,
                message: `${exportData.length}개 벽체 내보내기 준비 완료`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Revit 데이터 내보내기 실패'
            };
        }
    }

    /**
     * Revit 데이터 가져오기
     */
    async importFromRevit(revitWalls) {
        try {
            const importedWalls = [];

            for (const revitWall of revitWalls) {
                // Kiyeno 포맷으로 변환
                const kiyenoWall = {
                    name: revitWall.name || revitWall.type,
                    type: revitWall.type,
                    thickness: revitWall.thickness || 0,
                    materials: await this.convertMaterialsFromRevitFormat(revitWall.materials),
                    revitId: revitWall.id,
                    revitProperties: revitWall.properties || {}
                };

                // 벽체 생성
                const createResult = await this.wallService.createWall(kiyenoWall);
                if (createResult.success) {
                    importedWalls.push(createResult.data);
                }
            }

            return {
                success: true,
                data: importedWalls,
                message: `${importedWalls.length}개 벽체 가져오기 완료`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Revit 데이터 가져오기 실패'
            };
        }
    }

    /**
     * Revit 데이터 처리
     */
    async processRevitData(revitData, typeMappings) {
        const processedData = {
            walls: [],
            unmappedTypes: [],
            statistics: {
                totalWalls: revitData.length,
                mappedWalls: 0,
                unmappedWalls: 0
            }
        };

        for (const wall of revitData) {
            const mapping = typeMappings.find(m => m.revitType === wall.type);
            
            if (mapping) {
                processedData.walls.push({
                    ...wall,
                    mapping: mapping,
                    kiyenoType: mapping.kiyenoType
                });
                processedData.statistics.mappedWalls++;
            } else {
                processedData.unmappedTypes.push(wall.type);
                processedData.statistics.unmappedWalls++;
            }
        }

        return processedData;
    }

    /**
     * 자재를 Revit 포맷으로 변환
     */
    async convertMaterialsToRevitFormat(materials) {
        const revitMaterials = {};

        for (const [key, materialId] of Object.entries(materials)) {
            if (materialId) {
                const materialResult = await this.materialService.getMaterialById(materialId);
                if (materialResult.success) {
                    const material = materialResult.data;
                    revitMaterials[key] = {
                        id: material.id,
                        name: material.name,
                        category: material.category,
                        specifications: material.specifications
                    };
                }
            }
        }

        return revitMaterials;
    }

    /**
     * 자재를 Revit 포맷에서 변환
     */
    async convertMaterialsFromRevitFormat(revitMaterials) {
        const materials = {};

        for (const [key, material] of Object.entries(revitMaterials || {})) {
            // 자재 이름으로 기존 자재 찾기
            const searchResult = await this.materialService.searchMaterials(material.name);
            
            if (searchResult.success && searchResult.data.length > 0) {
                materials[key] = searchResult.data[0].id;
            } else {
                // 새 자재 생성
                const createResult = await this.materialService.createMaterial({
                    name: material.name,
                    category: material.category || '기타',
                    unit: material.unit || 'EA',
                    price: material.price || 0,
                    specifications: material.specifications || {}
                });
                
                if (createResult.success) {
                    materials[key] = createResult.data.id;
                }
            }
        }

        return materials;
    }

    /**
     * Revit 속성 생성
     */
    generateRevitProperties(wall) {
        return {
            kiyenoId: wall.id,
            exportTime: new Date().toISOString(),
            version: wall.metadata.version || 1,
            calculations: wall.calculations || {}
        };
    }

    /**
     * Revit 연결 상태 확인
     */
    async checkRevitConnection() {
        try {
            // 실제 구현에서는 Revit 애드인과 통신하여 연결 상태 확인
            return {
                success: true,
                data: {
                    connected: true,
                    version: '2024',
                    lastSync: new Date().toISOString()
                },
                message: 'Revit 연결 상태 확인 완료'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Revit 연결 상태 확인 실패'
            };
        }
    }

    /**
     * Revit에서 요소 선택
     */
    async selectElementsInRevit(elementIds) {
        try {
            // 입력 검증
            if (!elementIds || !Array.isArray(elementIds) || elementIds.length === 0) {
                return {
                    success: false,
                    message: '선택할 요소 ID가 없습니다'
                };
            }

            // Revit 애드인으로 전송할 명령 구조
            const revitCommand = {
                Action: 'selectElements',
                ElementIds: elementIds,
                RequestId: Date.now().toString()
            };

            // TODO: 실제 Revit 애드인과의 통신 구현
            // 현재는 명령 구조를 로그로 출력하고 시뮬레이션 응답 반환
            console.log('🎯 Revit 애드인으로 전송할 명령:', JSON.stringify(revitCommand, null, 2));

            const result = {
                success: true,
                data: {
                    selectedCount: elementIds.length,
                    selectedIds: elementIds,
                    command: revitCommand,
                    requestTime: new Date().toISOString()
                },
                message: `${elementIds.length}개의 요소 선택이 Revit으로 전송되었습니다`
            };

            return result;

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Revit 요소 선택 중 오류 발생'
            };
        }
    }
}

module.exports = RevitService;