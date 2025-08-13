/**
 * 자재 서비스 - 자재 데이터 관리
 */

const DataService = require('./dataService');

class MaterialService extends DataService {
    constructor() {
        super();
        this.filename = 'materials.json';
        this.schema = {
            required: ['name', 'category', 'unit', 'price'],
            optional: ['specifications', 'supplier', 'metadata']
        };
    }

    /**
     * 자재 데이터 구조 처리
     */
    async getMaterialsArray() {
        const materialsData = await this.loadData(this.filename);
        return materialsData.materials || materialsData;
    }

    /**
     * 자재 데이터 저장
     */
    async saveMaterialsArray(materials) {
        const materialsData = await this.loadData(this.filename);
        if (materialsData.materials) {
            materialsData.materials = materials;
            await this.saveData(this.filename, materialsData);
        } else {
            await this.saveData(this.filename, materials);
        }
    }

    /**
     * 모든 자재 데이터 조회
     */
    async getAllMaterials() {
        try {
            const materials = await this.getMaterialsArray();
            return {
                success: true,
                data: materials,
                message: '자재 데이터 조회 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '자재 데이터 조회 실패'
            };
        }
    }

    /**
     * 특정 자재 조회
     */
    async getMaterialById(id) {
        try {
            const materials = await this.loadData(this.filename);
            const material = materials.find(m => m.id === id);
            
            if (!material) {
                return {
                    success: false,
                    error: 'Material not found',
                    message: '자재를 찾을 수 없습니다'
                };
            }

            return {
                success: true,
                data: material,
                message: '자재 조회 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '자재 조회 실패'
            };
        }
    }

    /**
     * 카테고리별 자재 조회
     */
    async getMaterialsByCategory(category) {
        try {
            const materials = await this.loadData(this.filename);
            const filteredMaterials = materials.filter(m => m.category === category);

            return {
                success: true,
                data: filteredMaterials,
                message: `${category} 카테고리 자재 조회 성공`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '카테고리별 자재 조회 실패'
            };
        }
    }

    /**
     * 모든 카테고리 목록 조회
     */
    async getCategories() {
        try {
            const materials = await this.loadData(this.filename);
            const categories = [...new Set(materials.map(m => m.category))];

            return {
                success: true,
                data: categories,
                message: '카테고리 목록 조회 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '카테고리 목록 조회 실패'
            };
        }
    }

    /**
     * 새 자재 생성
     */
    async createMaterial(materialData) {
        try {
            // 데이터 검증
            this.validateData(materialData, this.schema);

            const materials = await this.loadData(this.filename);
            
            // 새 자재 객체 생성
            const newMaterial = {
                id: this.generateId(),
                name: materialData.name,
                category: materialData.category,
                unit: materialData.unit,
                price: materialData.price,
                specifications: materialData.specifications || {},
                supplier: materialData.supplier || {},
                metadata: {
                    created: new Date().toISOString(),
                    updated: new Date().toISOString(),
                    version: 1
                }
            };

            materials.push(newMaterial);
            await this.saveData(this.filename, materials);

            return {
                success: true,
                data: newMaterial,
                message: '자재 생성 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '자재 생성 실패'
            };
        }
    }

    /**
     * 자재 수정
     */
    async updateMaterial(id, materialData) {
        try {
            const materials = await this.loadData(this.filename);
            const materialIndex = materials.findIndex(m => m.id === id);
            
            if (materialIndex === -1) {
                return {
                    success: false,
                    error: 'Material not found',
                    message: '자재를 찾을 수 없습니다'
                };
            }

            // 기존 데이터 업데이트
            const existingMaterial = materials[materialIndex];
            const updatedMaterial = {
                ...existingMaterial,
                ...materialData,
                id: existingMaterial.id, // ID는 변경되지 않음
                metadata: {
                    ...existingMaterial.metadata,
                    updated: new Date().toISOString(),
                    version: (existingMaterial.metadata.version || 1) + 1
                }
            };

            materials[materialIndex] = updatedMaterial;
            await this.saveData(this.filename, materials);

            return {
                success: true,
                data: updatedMaterial,
                message: '자재 수정 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '자재 수정 실패'
            };
        }
    }

    /**
     * 자재 삭제
     */
    async deleteMaterial(id) {
        try {
            const materials = await this.loadData(this.filename);
            const materialIndex = materials.findIndex(m => m.id === id);
            
            if (materialIndex === -1) {
                return {
                    success: false,
                    error: 'Material not found',
                    message: '자재를 찾을 수 없습니다'
                };
            }

            const deletedMaterial = materials.splice(materialIndex, 1)[0];
            await this.saveData(this.filename, materials);

            return {
                success: true,
                data: deletedMaterial,
                message: '자재 삭제 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '자재 삭제 실패'
            };
        }
    }

    /**
     * 자재 검색
     */
    async searchMaterials(query) {
        try {
            const materials = await this.loadData(this.filename);
            const searchTerm = query.toLowerCase();
            
            const filteredMaterials = materials.filter(material => 
                material.name.toLowerCase().includes(searchTerm) ||
                material.category.toLowerCase().includes(searchTerm) ||
                (material.supplier.name && material.supplier.name.toLowerCase().includes(searchTerm))
            );

            return {
                success: true,
                data: filteredMaterials,
                message: `자재 검색 완료: ${filteredMaterials.length}개 발견`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '자재 검색 실패'
            };
        }
    }

    /**
     * 가격 업데이트
     */
    async updatePrices(priceUpdates) {
        try {
            const materials = await this.loadData(this.filename);
            let updatedCount = 0;

            for (const update of priceUpdates) {
                const materialIndex = materials.findIndex(m => m.id === update.id);
                if (materialIndex !== -1) {
                    materials[materialIndex].price = update.price;
                    materials[materialIndex].metadata.updated = new Date().toISOString();
                    materials[materialIndex].metadata.version = (materials[materialIndex].metadata.version || 1) + 1;
                    updatedCount++;
                }
            }

            await this.saveData(this.filename, materials);

            return {
                success: true,
                data: { updatedCount },
                message: `${updatedCount}개 자재 가격 업데이트 성공`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '가격 업데이트 실패'
            };
        }
    }
}

module.exports = MaterialService;