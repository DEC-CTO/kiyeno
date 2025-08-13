/**
 * 벽체 관리 API 서비스
 * 벽체 데이터 관련 API 통신을 담당
 */

import ApiService from './apiService.js';

class WallService extends ApiService {
    constructor() {
        super();
        this.endpoint = '/walls';
    }

    /**
     * 모든 벽체 데이터 조회
     */
    async getAllWalls() {
        return await this.get(this.endpoint);
    }

    /**
     * 특정 벽체 조회
     */
    async getWallById(id) {
        return await this.get(`${this.endpoint}/${id}`);
    }

    /**
     * 새 벽체 생성
     */
    async createWall(wallData) {
        return await this.post(this.endpoint, wallData);
    }

    /**
     * 벽체 수정
     */
    async updateWall(id, wallData) {
        return await this.put(`${this.endpoint}/${id}`, wallData);
    }

    /**
     * 벽체 삭제
     */
    async deleteWall(id) {
        return await this.delete(`${this.endpoint}/${id}`);
    }

    /**
     * 벽체 순서 변경
     */
    async reorderWalls(orderData) {
        return await this.post(`${this.endpoint}/reorder`, orderData);
    }

    /**
     * 벽체 검색
     */
    async searchWalls(query) {
        return await this.get(`${this.endpoint}/search/${encodeURIComponent(query)}`);
    }

    /**
     * 벽체 데이터 일괄 업데이트
     */
    async batchUpdateWalls(updates) {
        const requests = updates.map(update => ({
            endpoint: `${this.endpoint}/${update.id}`,
            options: {
                method: 'PUT',
                body: JSON.stringify(update.data)
            }
        }));

        return await this.batch(requests);
    }

    /**
     * 벽체 복제
     */
    async duplicateWall(id) {
        try {
            const result = await this.getWallById(id);
            if (result.success) {
                const wallData = { ...result.data };
                delete wallData.id;
                delete wallData.metadata;
                wallData.name = `${wallData.name} (복사본)`;
                
                return await this.createWall(wallData);
            }
            return result;
        } catch (error) {
            console.error('벽체 복제 실패:', error);
            throw error;
        }
    }

    /**
     * 벽체 유형별 조회
     */
    async getWallsByType(type) {
        const result = await this.getAllWalls();
        if (result.success) {
            const filteredWalls = result.data.filter(wall => wall.type === type);
            return {
                ...result,
                data: filteredWalls
            };
        }
        return result;
    }

    /**
     * 벽체 통계 조회
     */
    async getWallStats() {
        try {
            const result = await this.getAllWalls();
            if (result.success) {
                const walls = result.data;
                const stats = {
                    total: walls.length,
                    byType: {},
                    averageThickness: 0,
                    totalArea: 0
                };

                walls.forEach(wall => {
                    // 유형별 통계
                    stats.byType[wall.type] = (stats.byType[wall.type] || 0) + 1;
                    
                    // 평균 두께 계산
                    stats.averageThickness += wall.thickness || 0;
                    
                    // 총 면적 계산 (calculations.area가 있는 경우)
                    if (wall.calculations && wall.calculations.area) {
                        stats.totalArea += wall.calculations.area;
                    }
                });

                stats.averageThickness = stats.total > 0 ? stats.averageThickness / stats.total : 0;

                return {
                    success: true,
                    data: stats,
                    message: '벽체 통계 조회 성공'
                };
            }
            return result;
        } catch (error) {
            console.error('벽체 통계 조회 실패:', error);
            throw error;
        }
    }
}

export default WallService;