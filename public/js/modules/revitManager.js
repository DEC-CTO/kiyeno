// =============================================================================
// Kiyeno 벽체 관리 시스템 - Revit 연동 모듈
// Revit 벽체 데이터 가져오기, 처리, 동기화 전담 모듈
// =============================================================================

// 네임스페이스 방어적 초기화
window.Kiyeno = window.Kiyeno || {};

// Revit 연동 서비스
Kiyeno.RevitService = {
    // Revit 데이터 저장소
    revitWallData: [],
    selectedRevitIds: new Set(),
    
    // Revit에서 단일 벽체 선택
    selectSingleWallFromRevit() {
        try {
            // WebSocket을 통한 Revit 통신
            if (window.socketService && window.socketService.isConnected()) {
                window.socketService.sendRevitCommand('selectWall');
            } else {
                // 일반 브라우저 환경 - 테스트 데이터
                console.log('일반 브라우저에서 실행 중 - 테스트 데이터 사용');
                this.simulateRevitWallSelection();
            }
        } catch (error) {
            console.error('Revit 단일 벽체 선택 실패:', error);
            showToast('Revit 연동 중 오류가 발생했습니다.', 'error');
        }
    },
    
    // Revit에서 다중 벽체 선택
    selectMultipleWallsFromRevit() {
        try {
            // WebSocket을 통한 Revit 통신
            if (window.socketService && window.socketService.isConnected()) {
                window.socketService.sendRevitCommand('selectMultipleWalls');
            } else {
                console.log('일반 브라우저에서 실행 중 - 테스트 데이터 사용');
                this.simulateRevitWallSelection(true);
            }
        } catch (error) {
            console.error('Revit 다중 벽체 선택 실패:', error);
            showToast('Revit 연동 중 오류가 발생했습니다.', 'error');
        }
    },
    
    // 테스트용 Revit 데이터 시뮬레이션
    simulateRevitWallSelection(multiple = false) {
        const testWalls = [
            {
                elementId: 'test_001',
                name: '테스트 벽체 1',
                wallType: 'A1b',
                area: 25.5,
                height: 3.0,
                length: 8.5,
                thickness: 100,
                level: '1F',
                material: '콘크리트'
            }
        ];
        
        if (multiple) {
            testWalls.push({
                elementId: 'test_002',
                name: '테스트 벽체 2',
                wallType: 'B1b',
                area: 18.2,
                height: 3.0,
                length: 6.1,
                thickness: 150,
                level: '1F',
                material: '블록'
            });
        }
        
        this.handleRevitWallData(testWalls);
    },
    
    // Revit에서 받은 벽체 데이터 처리
    handleRevitWallData(wallsData) {
        try {
            this.revitWallData = wallsData;
            this.selectedRevitIds.clear();
            
            console.log('Revit 벽체 데이터 수신:', wallsData);
            
            // Revit 데이터 섹션 표시
            this.renderRevitDataSection();
            
            showToast(`${wallsData.length}개 벽체 데이터를 Revit에서 가져왔습니다.`, 'success');
        } catch (error) {
            console.error('Revit 데이터 처리 실패:', error);
            showToast('Revit 데이터 처리 중 오류가 발생했습니다.', 'error');
        }
    },
    
    // Revit 데이터 섹션 렌더링
    renderRevitDataSection() {
        const container = document.getElementById('revitDataContainer');
        if (!container) {
            console.warn('Revit 데이터 컨테이너를 찾을 수 없습니다.');
            return;
        }
        
        if (this.revitWallData.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">Revit에서 벽체를 선택해주세요.</p>';
            return;
        }
        
        const tableRows = this.revitWallData.map(wall => `
            <tr>
                <td>
                    <input type="checkbox" 
                           value="${wall.elementId}" 
                           onchange="toggleRevitSelection('${wall.elementId}')" />
                </td>
                <td>${wall.name || wall.elementId}</td>
                <td>${wall.wallType || '-'}</td>
                <td>${wall.area || 0}</td>
                <td>${wall.height || 0}</td>
                <td>${wall.thickness || 0}</td>
                <td>${wall.level || '-'}</td>
                <td>${wall.material || '-'}</td>
            </tr>
        `).join('');
        
        container.innerHTML = `
            <div style="margin-bottom: 16px;">
                <h4>📋 Revit 벽체 데이터</h4>
                <div style="margin: 8px 0;">
                    <button onclick="toggleAllRevitSelection()" class="btn btn-secondary">전체 선택/해제</button>
                    <button onclick="addSelectedRevitWalls()" class="btn btn-primary">선택된 벽체 추가</button>
                    <button onclick="clearRevitData()" class="btn btn-secondary">데이터 지우기</button>
                </div>
            </div>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">선택</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">이름</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">타입</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">면적(m²)</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">높이(m)</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">두께(mm)</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">레벨</th>
                            <th style="padding: 8px; border: 1px solid #e5e7eb;">재료</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    // Revit 선택 토글
    toggleRevitSelection(elementId) {
        if (this.selectedRevitIds.has(elementId)) {
            this.selectedRevitIds.delete(elementId);
        } else {
            this.selectedRevitIds.add(elementId);
        }
    },
    
    // Revit 전체 선택 토글
    toggleAllRevitSelection() {
        if (this.selectedRevitIds.size === this.revitWallData.length) {
            this.selectedRevitIds.clear();
        } else {
            this.selectedRevitIds.clear();
            this.revitWallData.forEach(wall => {
                this.selectedRevitIds.add(wall.elementId);
            });
        }
        
        // 체크박스 상태 업데이트
        const checkboxes = document.querySelectorAll('#revitDataContainer input[type="checkbox"]');
        const isAllSelected = this.selectedRevitIds.size === this.revitWallData.length;
        checkboxes.forEach(checkbox => {
            checkbox.checked = isAllSelected;
        });
    },
    
    // 선택된 Revit 벽체를 메인 테이블에 추가
    addSelectedRevitWalls() {
        if (this.selectedRevitIds.size === 0) {
            showToast('추가할 벽체를 선택해주세요.', 'warning');
            return;
        }
        
        const selectedWalls = this.revitWallData.filter(wall => 
            this.selectedRevitIds.has(wall.elementId)
        );
        
        let addedCount = 0;
        
        selectedWalls.forEach(revitWall => {
            const wallData = {
                wallType: revitWall.wallType || '새 벽체 타입',
                area: revitWall.area || '',
                thickness: revitWall.thickness || '',
                fire: '',
                sound: '',
                thermal: '',
                structure: '',
                waterproof: '',
                finish: '',
                source: 'revit',
                revitId: revitWall.elementId
            };
            
            try {
                // 메인 wallData 배열에 추가
                wallData.forEach(wd => {
                    const newId = Date.now() + Math.random();
                    window.wallData.push({
                        id: newId,
                        ...wallData
                    });
                });
                
                addedCount++;
            } catch (error) {
                console.error('벽체 추가 실패:', error);
            }
        });
        
        if (addedCount > 0) {
            showToast(`${addedCount}개 벽체가 추가되었습니다.`, 'success');
            
            // 메인 테이블 새로고침
            if (typeof renderWallTable === 'function') {
                renderWallTable();
            }
            
            // 선택 해제
            this.selectedRevitIds.clear();
            const checkboxes = document.querySelectorAll('#revitDataContainer input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    },
    
    // Revit 데이터 지우기
    clearRevitData() {
        this.revitWallData = [];
        this.selectedRevitIds.clear();
        this.renderRevitDataSection();
        showToast('Revit 데이터가 지워졌습니다.', 'info');
    }
};

// =============================================================================
// Revit 연동 전역 함수들 (HTML에서 호출)
// =============================================================================

// Revit 단일 벽체 선택
window.selectSingleWallFromRevit = function() {
    Kiyeno.RevitService.selectSingleWallFromRevit();
};

// Revit 다중 벽체 선택  
window.selectMultipleWallsFromRevit = function() {
    Kiyeno.RevitService.selectMultipleWallsFromRevit();
};

// Revit에서 받은 벽체 데이터 처리
window.addWallsFromRevit = function(wallInfos) {
    if (wallInfos && Array.isArray(wallInfos)) {
        Kiyeno.RevitService.handleRevitWallData(wallInfos);
    }
};

// Revit 선택 토글
window.toggleRevitSelection = function(elementId) {
    Kiyeno.RevitService.toggleRevitSelection(elementId);
};

// Revit 전체 선택 토글
window.toggleAllRevitSelection = function() {
    Kiyeno.RevitService.toggleAllRevitSelection();
};

// 선택된 Revit 벽체 추가
window.addSelectedRevitWalls = function() {
    Kiyeno.RevitService.addSelectedRevitWalls();
};

// Revit 데이터 지우기
window.clearRevitData = function() {
    Kiyeno.RevitService.clearRevitData();
};

// 룸별 벽체 선택
window.selectWallsByRoomFromRevit = function() {
    try {
        // WebSocket을 통한 Revit 통신
        if (window.socketService && window.socketService.isConnected()) {
            window.socketService.sendRevitCommand('selectWallsByRoom');
        } else {
            console.log('일반 브라우저에서 실행 중 - 룸별 벽체 선택 시뮬레이션');
            Kiyeno.RevitService.simulateRevitWallSelection(true);
        }
    } catch (error) {
        console.error('Revit 룸별 벽체 선택 실패:', error);
        showToast('Revit 연동 중 오류가 발생했습니다.', 'error');
    }
};

// Revit 데이터 섹션 토글
window.toggleRevitDataSection = function() {
    const container = document.getElementById('revitDataContainer');
    const button = document.querySelector('[onclick="toggleRevitDataSection()"]');
    
    if (!container) {
        console.warn('Revit 데이터 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    const isHidden = container.style.display === 'none';
    
    if (isHidden) {
        container.style.display = 'block';
        if (button) {
            button.innerHTML = '<i class="fas fa-table"></i> Revit 데이터 닫기';
        }
        console.log('Revit 데이터 섹션 열림');
    } else {
        container.style.display = 'none';
        if (button) {
            button.innerHTML = '<i class="fas fa-table"></i> Revit 데이터 열기/닫기';
        }
        console.log('Revit 데이터 섹션 닫힘');
    }
};

console.log('✅ revitManager.js 로드 완료 - Revit 연동 함수들 등록됨');