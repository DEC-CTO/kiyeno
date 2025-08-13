/**
 * 벽체 서비스 - 벽체 데이터 관리
 */

const DataService = require('./dataService');

class WallService extends DataService {
    constructor() {
        super();
        this.filename = 'walls.json';
        this.schema = {
            required: ['name', 'type'],
            optional: ['thickness', 'materials', 'calculations', 'metadata']
        };
    }

    /**
     * 벽체 데이터 구조 처리
     */
    async getWallsArray() {
        const wallsData = await this.loadData(this.filename);
        return wallsData.defaultWalls || wallsData;
    }

    /**
     * 벽체 데이터 저장
     */
    async saveWallsArray(walls) {
        const wallsData = await this.loadData(this.filename);
        if (wallsData.defaultWalls) {
            wallsData.defaultWalls = walls;
            await this.saveData(this.filename, wallsData);
        } else {
            await this.saveData(this.filename, walls);
        }
    }

    /**
     * 모든 벽체 데이터 조회
     */
    async getAllWalls() {
        try {
            const walls = await this.getWallsArray();
            return {
                success: true,
                data: walls,
                message: '벽체 데이터 조회 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '벽체 데이터 조회 실패'
            };
        }
    }

    /**
     * 특정 벽체 조회
     */
    async getWallById(id) {
        try {
            const walls = await this.getWallsArray();
            const wall = walls.find(w => w.id === id);
            
            if (!wall) {
                return {
                    success: false,
                    error: 'Wall not found',
                    message: '벽체를 찾을 수 없습니다'
                };
            }

            return {
                success: true,
                data: wall,
                message: '벽체 조회 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '벽체 조회 실패'
            };
        }
    }

    /**
     * 새 벽체 생성
     */
    async createWall(wallData) {
        try {
            // 데이터 검증
            this.validateData(wallData, this.schema);

            const walls = await this.getWallsArray();
            
            // 새 벽체 객체 생성
            const newWall = {
                id: this.generateId(),
                name: wallData.name,
                type: wallData.type,
                thickness: wallData.thickness || 0,
                materials: wallData.materials || {},
                calculations: wallData.calculations || {},
                metadata: {
                    created: new Date().toISOString(),
                    updated: new Date().toISOString(),
                    version: 1
                }
            };

            walls.push(newWall);
            await this.saveWallsArray(walls);

            return {
                success: true,
                data: newWall,
                message: '벽체 생성 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '벽체 생성 실패'
            };
        }
    }

    /**
     * 벽체 수정
     */
    async updateWall(id, wallData) {
        try {
            const walls = await this.loadData(this.filename);
            const wallIndex = walls.findIndex(w => w.id === id);
            
            if (wallIndex === -1) {
                return {
                    success: false,
                    error: 'Wall not found',
                    message: '벽체를 찾을 수 없습니다'
                };
            }

            // 기존 데이터 업데이트
            const existingWall = walls[wallIndex];
            const updatedWall = {
                ...existingWall,
                ...wallData,
                id: existingWall.id, // ID는 변경되지 않음
                metadata: {
                    ...existingWall.metadata,
                    updated: new Date().toISOString(),
                    version: (existingWall.metadata.version || 1) + 1
                }
            };

            walls[wallIndex] = updatedWall;
            await this.saveData(this.filename, walls);

            return {
                success: true,
                data: updatedWall,
                message: '벽체 수정 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '벽체 수정 실패'
            };
        }
    }

    /**
     * 벽체 삭제
     */
    async deleteWall(id) {
        try {
            const walls = await this.loadData(this.filename);
            const wallIndex = walls.findIndex(w => w.id === id);
            
            if (wallIndex === -1) {
                return {
                    success: false,
                    error: 'Wall not found',
                    message: '벽체를 찾을 수 없습니다'
                };
            }

            const deletedWall = walls.splice(wallIndex, 1)[0];
            await this.saveData(this.filename, walls);

            return {
                success: true,
                data: deletedWall,
                message: '벽체 삭제 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '벽체 삭제 실패'
            };
        }
    }

    /**
     * 벽체 순서 변경
     */
    async reorderWalls(orderData) {
        try {
            const walls = await this.loadData(this.filename);
            const reorderedWalls = [];

            // 새로운 순서로 벽체 배열 재구성
            for (const id of orderData.order) {
                const wall = walls.find(w => w.id === id);
                if (wall) {
                    reorderedWalls.push(wall);
                }
            }

            await this.saveData(this.filename, reorderedWalls);

            return {
                success: true,
                data: reorderedWalls,
                message: '벽체 순서 변경 성공'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '벽체 순서 변경 실패'
            };
        }
    }

    /**
     * 벽체 검색
     */
    async searchWalls(query) {
        try {
            const walls = await this.loadData(this.filename);
            const searchTerm = query.toLowerCase();
            
            const filteredWalls = walls.filter(wall => 
                wall.name.toLowerCase().includes(searchTerm) ||
                wall.type.toLowerCase().includes(searchTerm)
            );

            return {
                success: true,
                data: filteredWalls,
                message: `벽체 검색 완료: ${filteredWalls.length}개 발견`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '벽체 검색 실패'
            };
        }
    }
}

module.exports = WallService;