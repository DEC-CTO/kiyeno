/**
 * 데이터 서비스 - 파일 기반 데이터 관리
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DataService {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.backupDir = path.join(this.dataDir, 'backups');
        this.cache = new Map();
        this.lastModified = new Map();
    }

    /**
     * 파일에서 데이터 로드
     */
    async loadData(filename) {
        try {
            const filePath = path.join(this.dataDir, filename);
            
            // 파일이 존재하지 않으면 빈 배열 반환
            if (!await fs.pathExists(filePath)) {
                console.log(`파일 없음: ${filename}, 빈 배열 반환`);
                return [];
            }

            const data = await fs.readJson(filePath);
            
            // 캐시 업데이트
            this.cache.set(filename, data);
            this.lastModified.set(filename, new Date());
            
            console.log(`데이터 로드 성공: ${filename}`);
            return data;
        } catch (error) {
            console.error(`데이터 로드 실패: ${filename}`, error);
            throw new Error(`데이터 로드 실패: ${filename}`);
        }
    }

    /**
     * 파일에 데이터 저장
     */
    async saveData(filename, data) {
        try {
            const filePath = path.join(this.dataDir, filename);
            
            // 백업 생성
            await this.createBackup(filename);
            
            // 데이터 저장
            await fs.writeJson(filePath, data, { spaces: 2 });
            
            // 캐시 업데이트
            this.cache.set(filename, data);
            this.lastModified.set(filename, new Date());
            
            console.log(`데이터 저장 성공: ${filename}`);
            return true;
        } catch (error) {
            console.error(`데이터 저장 실패: ${filename}`, error);
            throw new Error(`데이터 저장 실패: ${filename}`);
        }
    }

    /**
     * 백업 생성
     */
    async createBackup(filename) {
        try {
            const filePath = path.join(this.dataDir, filename);
            
            if (!await fs.pathExists(filePath)) {
                return false;
            }

            await fs.ensureDir(this.backupDir);
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFilename = `${path.parse(filename).name}_${timestamp}.json`;
            const backupPath = path.join(this.backupDir, backupFilename);
            
            await fs.copy(filePath, backupPath);
            
            console.log(`백업 생성: ${backupFilename}`);
            return true;
        } catch (error) {
            console.error(`백업 생성 실패: ${filename}`, error);
            return false;
        }
    }

    /**
     * 캐시에서 데이터 가져오기
     */
    getCachedData(filename) {
        return this.cache.get(filename);
    }

    /**
     * 캐시 무효화
     */
    clearCache(filename) {
        if (filename) {
            this.cache.delete(filename);
            this.lastModified.delete(filename);
        } else {
            this.cache.clear();
            this.lastModified.clear();
        }
    }

    /**
     * 고유 ID 생성
     */
    generateId() {
        return uuidv4();
    }

    /**
     * 데이터 검증
     */
    validateData(data, schema) {
        // 기본 검증 로직
        if (!data || typeof data !== 'object') {
            throw new Error('유효하지 않은 데이터 형식');
        }

        // 스키마 기반 검증 (필요시 확장)
        if (schema && schema.required) {
            for (const field of schema.required) {
                if (!data[field]) {
                    throw new Error(`필수 필드 누락: ${field}`);
                }
            }
        }

        return true;
    }
}

module.exports = DataService;