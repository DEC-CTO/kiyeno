/**
 * API 라우트 통합 관리
 */
const express = require('express');
const router = express.Router();

// 개별 API 라우트 import
const wallsRouter = require('./walls');
const materialsRouter = require('./materials');
const revitRouter = require('./revit');

// API 라우트 연결
router.use('/walls', wallsRouter);
router.use('/materials', materialsRouter);
router.use('/revit', revitRouter);

// API 루트 정보
router.get('/', (req, res) => {
  res.json({
    message: 'Kiyeno 벽체 관리 시스템 API',
    version: '1.0.0',
    endpoints: {
      walls: '/api/walls',
      materials: '/api/materials',
      revit: '/api/revit',
    },
    documentation: {
      walls: {
        'GET /api/walls': '모든 벽체 조회',
        'GET /api/walls/:id': '특정 벽체 조회',
        'POST /api/walls': '새 벽체 생성',
        'PUT /api/walls/:id': '벽체 수정',
        'DELETE /api/walls/:id': '벽체 삭제',
        'POST /api/walls/reorder': '벽체 순서 변경',
        'GET /api/walls/search/:query': '벽체 검색',
      },
      materials: {
        'GET /api/materials': '모든 자재 조회',
        'GET /api/materials/:id': '특정 자재 조회',
        'GET /api/materials/category/:category': '카테고리별 자재 조회',
        'GET /api/materials/categories/list': '모든 카테고리 조회',
        'POST /api/materials': '새 자재 생성',
        'PUT /api/materials/:id': '자재 수정',
        'DELETE /api/materials/:id': '자재 삭제',
        'GET /api/materials/search/:query': '자재 검색',
        'POST /api/materials/prices/update': '가격 업데이트',
      },
      revit: {
        'POST /api/revit/sync': 'Revit 데이터 동기화',
        'GET /api/revit/types': 'Revit 타입 매핑 조회',
        'POST /api/revit/types': 'Revit 타입 매핑 저장',
        'POST /api/revit/export': 'Revit 데이터 내보내기',
        'POST /api/revit/import': 'Revit 데이터 가져오기',
        'GET /api/revit/status': 'Revit 연결 상태 확인',
      },
    },
  });
});

module.exports = router;
