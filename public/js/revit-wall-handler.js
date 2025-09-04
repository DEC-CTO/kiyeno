/**
 * Revit 벽체 데이터 처리 및 실명 입력 모달 관리
 * 수정된 WallInfo 구조에 맞게 업데이트됨
 */

// Revit 벽체 데이터 저장소
let revitWallData = [];
let filteredRevitWallData = []; // 필터링된 데이터
let pendingWallData = null; // 실명 입력 대기 중인 벽체 데이터

// 전역 변수로 노출 (다른 모듈에서 접근 가능)
window.filteredRevitWallData = filteredRevitWallData;
console.log('🚀 revit-wall-handler.js 로드됨. 초기 filteredRevitWallData:', filteredRevitWallData.length);

/**
 * filteredRevitWallData 업데이트 및 전역 변수 동기화 헬퍼 함수
 */
function updateFilteredData(newData) {
    filteredRevitWallData = newData;
    window.filteredRevitWallData = filteredRevitWallData;
    console.log('📊 filteredRevitWallData 업데이트됨:', filteredRevitWallData.length, '개');
}

/**
 * Revit에서 전송된 벽체 데이터 처리
 * CS에서 전송되는 새로운 WallInfo 구조에 맞게 수정됨
 */
window.addWallsFromRevit = function(wallDataArray) {
    try {
        console.log('🏗️ Revit 벽체 데이터 수신:', wallDataArray);
        
        if (!Array.isArray(wallDataArray) || wallDataArray.length === 0) {
            console.warn('유효하지 않은 벽체 데이터');
            return;
        }

        // 실명이 없는 벽체가 있는지 확인
        const wallsWithoutRoomName = wallDataArray.filter(wall => !wall.RoomName || wall.RoomName.trim() === '');
        
        if (wallsWithoutRoomName.length > 0) {
            // 실명 입력 모달 표시
            showRoomNameInputModal(wallsWithoutRoomName, wallDataArray);
        } else {
            // 모든 벽체에 실명이 있으면 바로 추가
            addWallsToRevitTable(wallDataArray);
        }
        
    } catch (error) {
        console.error('❌ Revit 벽체 데이터 처리 실패:', error);
        showToast('Revit 벽체 데이터 처리 중 오류가 발생했습니다.', 'error');
    }
};

/**
 * 실명 입력 모달 표시
 */
function showRoomNameInputModal(wallsWithoutRoomName, allWallData) {
    const modal = document.getElementById('roomNameModal');
    const wallInfoDiv = document.getElementById('modalWallInfo');
    const roomNameInput = document.getElementById('roomNameInput');
    
    if (!modal || !wallInfoDiv || !roomNameInput) {
        console.error('실명 입력 모달 요소를 찾을 수 없습니다.');
        return;
    }

    // 전역 변수에 저장
    pendingWallData = allWallData;
    
    // 벽체 정보 표시
    wallInfoDiv.innerHTML = generateWallInfoHTML(wallsWithoutRoomName);
    
    // 입력 필드 초기화
    roomNameInput.value = '';
    
    // 모달 표시 및 배경 스크롤 방지
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // 포커스를 약간 지연시켜 모달 애니메이션과 충돌 방지
    setTimeout(() => {
        roomNameInput.focus();
    }, 100);
    
    // Enter 키 이벤트 추가
    roomNameInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
            saveRoomName();
        }
    };
    
    console.log('📋 실명 입력 모달 표시됨:', wallsWithoutRoomName.length, '개 벽체');
}

/**
 * 벽체 정보 HTML 생성
 */
function generateWallInfoHTML(walls) {
    let html = `<h4>실명이 필요한 벽체 (${walls.length}개):</h4>`;
    
    walls.forEach((wall, index) => {
        html += `
            <p><strong>벽체 ${index + 1}:</strong></p>
            <p>• ID: <span class="highlight">${wall.Id}</span></p>
            <p>• Name: <span class="highlight">${wall.Name}</span></p>
            <p>• Level: <span class="highlight">${wall.Level}</span></p>
            <p>• Category: <span class="highlight">${wall.Category}</span></p>
            <p>• 면적: <span class="highlight">${wall.Area ? wall.Area.toFixed(2) : '0.00'} m²</span></p>
            ${index < walls.length - 1 ? '<hr style="margin: 10px 0; border: 1px solid #e9ecef;">' : ''}
        `;
    });
    
    return html;
}

/**
 * 실명 저장
 */
window.saveRoomName = function() {
    const roomNameInput = document.getElementById('roomNameInput');
    const roomName = roomNameInput.value.trim();
    
    if (!roomName) {
        showToast('실명을 입력해주세요.', 'warning');
        roomNameInput.focus();
        return;
    }
    
    if (!pendingWallData || !Array.isArray(pendingWallData) || pendingWallData.length === 0) {
        console.error('❌ 저장할 벽체 데이터가 없습니다. pendingWallData:', pendingWallData);
        showToast('저장할 벽체 데이터가 없습니다.', 'error');
        closeRoomNameModal();
        return;
    }
    
    try {
        // 실명이 없는 벽체들에 입력된 실명 설정
        pendingWallData.forEach(wall => {
            if (!wall.RoomName || wall.RoomName.trim() === '') {
                wall.RoomName = roomName;
            }
        });
        
        // 벽체 데이터 추가
        addWallsToRevitTable(pendingWallData);
        
        // 모달 닫기
        closeRoomNameModal();
        
        showToast(`${pendingWallData.length}개의 벽체에 실명 "${roomName}"이 설정되었습니다.`, 'success');
        
    } catch (error) {
        console.error('❌ 실명 저장 실패:', error);
        showToast('실명 저장 중 오류가 발생했습니다.', 'error');
        closeRoomNameModal();
    }
};

/**
 * 실명 입력 모달 닫기
 */
window.closeRoomNameModal = function() {
    const modal = document.getElementById('roomNameModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // 배경 스크롤 복원
    document.body.style.overflow = '';
    
    // 전역 변수 초기화
    pendingWallData = null;
    
    // 입력 필드 초기화
    const roomNameInput = document.getElementById('roomNameInput');
    if (roomNameInput) {
        roomNameInput.value = '';
        roomNameInput.onkeypress = null;
    }
    
    console.log('❌ 실명 입력 모달 닫힘');
};

/**
 * Revit 테이블에 벽체 데이터 추가 (중복 ID 관리 포함)
 * 새로운 WallInfo 구조에 맞게 수정됨
 */
function addWallsToRevitTable(wallDataArray) {
    try {
        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const duplicateWalls = [];
        
        wallDataArray.forEach(newWall => {
            const existingIndex = revitWallData.findIndex(existing => existing.Id === newWall.Id);
            
            if (existingIndex !== -1) {
                // 중복 ID 발견
                duplicateWalls.push({
                    newWall: newWall,
                    existingWall: revitWallData[existingIndex],
                    index: existingIndex
                });
            } else {
                // 새로운 벽체 추가
                revitWallData.push(newWall);
                addedCount++;
            }
        });
        
        // 중복 벽체가 있는 경우 처리
        if (duplicateWalls.length > 0) {
            showToast(`⚠️ ${duplicateWalls.length}개의 중복 벽체를 발견했습니다. 처리 방법을 선택해주세요.`, 'warning', 5000);
            handleDuplicateWalls(duplicateWalls, (processedDuplicates) => {
                updatedCount = processedDuplicates.updated;
                skippedCount = processedDuplicates.skipped;
                
                // 결과 메시지 표시
                showProcessingResult(addedCount, updatedCount, skippedCount);
                
                // 필터링된 데이터 리셋
                updateFilteredData([...revitWallData]);
                
                // 테이블 업데이트
                updateRevitDataTable();
                
                // Revit 데이터 섹션 자동 열기
                openRevitDataSection();
            });
        } else {
            // 중복이 없는 경우 바로 완료
            showProcessingResult(addedCount, 0, 0);
            
            // 필터링된 데이터 리셋
            updateFilteredData([...revitWallData]);
            
            updateRevitDataTable();
            openRevitDataSection();
        }
        
    } catch (error) {
        console.error('❌ Revit 테이블 업데이트 실패:', error);
        showToast('Revit 테이블 업데이트 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 중복 벽체 처리
 */
function handleDuplicateWalls(duplicateWalls, callback) {
    if (duplicateWalls.length === 1) {
        // 단일 중복 - 개별 처리
        handleSingleDuplicate(duplicateWalls[0], callback);
    } else {
        // 다중 중복 - 일괄 처리 옵션 제공
        handleMultipleDuplicates(duplicateWalls, callback);
    }
}

/**
 * 단일 중복 벽체 처리
 */
function handleSingleDuplicate(duplicate, callback) {
    const { newWall, existingWall } = duplicate;
    
    const message = `
        <div class="duplicate-wall-info">
            <h4>중복된 벽체가 발견되었습니다</h4>
            <div class="wall-comparison">
                <div class="existing-wall">
                    <h5>기존 데이터:</h5>
                    <p><strong>ID:</strong> ${existingWall.Id}</p>
                    <p><strong>Name:</strong> ${existingWall.Name}</p>
                    <p><strong>실명:</strong> ${existingWall.RoomName || '미지정'}</p>
                    <p><strong>면적:</strong> ${existingWall.Area ? existingWall.Area.toFixed(2) : '0.00'} m²</p>
                </div>
                <div class="new-wall">
                    <h5>새로운 데이터:</h5>
                    <p><strong>ID:</strong> ${newWall.Id}</p>
                    <p><strong>Name:</strong> ${newWall.Name}</p>
                    <p><strong>실명:</strong> ${newWall.RoomName || '미지정'}</p>
                    <p><strong>면적:</strong> ${newWall.Area ? newWall.Area.toFixed(2) : '0.00'} m²</p>
                </div>
            </div>
        </div>
    `;
    
    showDuplicateModal(message, [
        {
            text: '덮어쓰기',
            className: 'btn-warning',
            action: () => {
                revitWallData[duplicate.index] = newWall;
                callback({ updated: 1, skipped: 0 });
            }
        },
        {
            text: '무시',
            className: 'btn-secondary',
            action: () => {
                callback({ updated: 0, skipped: 1 });
            }
        }
    ]);
}

/**
 * 다중 중복 벽체 처리
 */
function handleMultipleDuplicates(duplicateWalls, callback) {
    const message = `
        <div class="duplicate-walls-info">
            <h4>${duplicateWalls.length}개의 중복된 벽체가 발견되었습니다</h4>
            <div class="duplicate-list">
                ${duplicateWalls.map(dup => `
                    <div class="duplicate-item">
                        <strong>ID:</strong> ${dup.newWall.Id} - 
                        <strong>Name:</strong> ${dup.newWall.Name}
                    </div>
                `).join('')}
            </div>
            <p>모든 중복 벽체를 어떻게 처리하시겠습니까?</p>
        </div>
    `;
    
    showDuplicateModal(message, [
        {
            text: '모두 덮어쓰기',
            className: 'btn-warning',
            action: () => {
                duplicateWalls.forEach(dup => {
                    revitWallData[dup.index] = dup.newWall;
                });
                callback({ updated: duplicateWalls.length, skipped: 0 });
            }
        },
        {
            text: '모두 무시',
            className: 'btn-secondary',
            action: () => {
                callback({ updated: 0, skipped: duplicateWalls.length });
            }
        },
        {
            text: '개별 선택',
            className: 'btn-info',
            action: () => {
                handleDuplicatesIndividually(duplicateWalls, callback);
            }
        }
    ]);
}

/**
 * 중복 벽체 개별 처리
 */
function handleDuplicatesIndividually(duplicateWalls, callback) {
    let processedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    function processNext() {
        if (processedCount >= duplicateWalls.length) {
            callback({ updated: updatedCount, skipped: skippedCount });
            return;
        }
        
        const current = duplicateWalls[processedCount];
        processedCount++;
        
        handleSingleDuplicate(current, (result) => {
            updatedCount += result.updated;
            skippedCount += result.skipped;
            processNext();
        });
    }
    
    processNext();
}

/**
 * 중복 처리 모달 표시
 */
function showDuplicateModal(content, buttons) {
    // 기존 모달이 있다면 제거
    const existingModal = document.getElementById('duplicateModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 새 모달 생성
    const modal = document.createElement('div');
    modal.id = 'duplicateModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    // 배경 스크롤 방지 및 우선순위 처리 표시
    document.body.style.overflow = 'hidden';
    console.log('⚠️ 중복 벽체 처리 모달 표시됨 - 사용자 확인 필요');
    
    const buttonsHtml = buttons.map(btn => 
        `<button class="btn ${btn.className}" onclick="handleDuplicateAction('${btn.text}')">${btn.text}</button>`
    ).join('');
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> 중복 벽체 처리</h3>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                ${buttonsHtml}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 버튼 액션 저장
    modal._buttonActions = {};
    buttons.forEach(btn => {
        modal._buttonActions[btn.text] = btn.action;
    });
}

/**
 * 중복 처리 액션 핸들러
 */
window.handleDuplicateAction = function(actionText) {
    const modal = document.getElementById('duplicateModal');
    if (modal && modal._buttonActions[actionText]) {
        console.log(`✅ 중복 처리 선택: ${actionText}`);
        modal._buttonActions[actionText]();
        
        // 배경 스크롤 복원
        document.body.style.overflow = '';
        
        modal.remove();
    }
};

/**
 * 처리 결과 메시지 표시
 */
function showProcessingResult(added, updated, skipped) {
    const total = added + updated + skipped;
    let message = `벽체 처리 완료: `;
    
    const parts = [];
    if (added > 0) parts.push(`${added}개 추가`);
    if (updated > 0) parts.push(`${updated}개 업데이트`);
    if (skipped > 0) parts.push(`${skipped}개 무시`);
    
    message += parts.join(', ');
    
    const type = skipped > 0 ? 'warning' : 'success';
    showToast(message, type);
    
    console.log(`✅ 벽체 처리 결과 - 추가: ${added}, 업데이트: ${updated}, 무시: ${skipped}`);
}

/**
 * Revit 데이터 섹션 열기
 */
function openRevitDataSection() {
    const revitSection = document.getElementById('revitDataSection');
    if (revitSection && revitSection.style.display === 'none') {
        toggleRevitDataSection();
    }
}

/**
 * Revit 데이터 테이블 업데이트
 * 새로운 컬럼 구조에 맞게 수정됨
 */
function updateRevitDataTable() {
    const tableBody = document.getElementById('revitTableBody');
    const selectionText = document.getElementById('revitSelectionText');
    
    if (!tableBody) {
        console.error('Revit 테이블 body를 찾을 수 없습니다.');
        return;
    }
    
    // 테이블 초기화
    tableBody.innerHTML = '';
    
    if (!revitWallData || revitWallData.length === 0) {
        selectionText.textContent = 'Revit 데이터가 없습니다.';
        updateFilterOptions(); // 필터 옵션도 초기화
        return;
    }
    
    // 필터링된 데이터가 초기화되지 않았다면 전체 데이터로 설정
    if (filteredRevitWallData.length === 0 && revitWallData.length > 0) {
        updateFilteredData([...revitWallData]);
    }
    
    // 선택 정보 업데이트
    const totalCount = revitWallData.length;
    const filteredCount = filteredRevitWallData.length;
    
    if (filteredCount === totalCount) {
        selectionText.textContent = `총 ${totalCount}개의 벽체 데이터`;
    } else {
        selectionText.textContent = `총 ${totalCount}개 중 ${filteredCount}개 표시됨 (필터 적용)`;
    }
    
    // 필터 옵션 업데이트
    updateFilterOptions();
    
    // 테이블 행 생성 (필터링된 데이터 사용)
    filteredRevitWallData.forEach((wall, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-wall-index', index);
        
        // 새로운 WallInfo 구조에 맞게 컬럼 구성
        row.innerHTML = `
            <td class="col-select">
                <input type="checkbox" class="revit-row-checkbox" onchange="updateRevitSelection()">
            </td>
            <td class="col-revit-id">${wall.Id || ''}</td>
            <td class="col-revit-name">${wall.Name || ''}</td>
            <td class="col-revit-length">${wall.Length ? wall.Length.toFixed(3) : '0.000'}</td>
            <td class="col-revit-area">${wall.Area ? wall.Area.toFixed(2) : '0.00'}</td>
            <td class="col-revit-height">${wall.Height ? wall.Height.toFixed(3) : '0.000'}</td>
            <td class="col-revit-thickness">${wall.Thickness ? wall.Thickness.toFixed(3) : '0.000'}</td>
            <td class="col-revit-level">${wall.Level || ''}</td>
            <td class="col-revit-category">${wall.Category || ''}</td>
            <td class="col-revit-roomname">
                <span class="room-name ${!wall.RoomName ? 'empty' : ''}" 
                      onclick="editRoomName(${index})" 
                      title="클릭하여 수정">
                    ${wall.RoomName || '미지정'}
                </span>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // 스크롤 정보 디버깅 (개발용)
    const container = document.querySelector('.revit-table-container');
    if (container) {
        console.log(`📏 스크롤 정보 - 컨테이너 높이: ${container.clientHeight}px, 콘텐츠 높이: ${container.scrollHeight}px, 스크롤 가능: ${container.scrollHeight > container.clientHeight}`);
    }
}

/**
 * 실명 직접 편집
 */
window.editRoomName = function(index) {
    if (index < 0 || index >= filteredRevitWallData.length) return;
    
    const wall = filteredRevitWallData[index];
    const newRoomName = prompt('실명을 입력하세요:', wall.RoomName || '');
    
    if (newRoomName !== null) {
        wall.RoomName = newRoomName.trim();
        updateRevitDataTable();
        showToast('실명이 수정되었습니다.', 'info');
    }
};

/**
 * Revit 선택 상태 업데이트
 */
window.updateRevitSelection = function() {
    const checkboxes = document.querySelectorAll('.revit-row-checkbox');
    const selectAllCheckbox = document.getElementById('revitSelectAll');
    const selectionText = document.getElementById('revitSelectionText');
    
    let selectedCount = 0;
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) selectedCount++;
    });
    
    // 전체 선택 체크박스 상태 업데이트
    if (selectAllCheckbox) {
        if (selectedCount === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (selectedCount === checkboxes.length) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.indeterminate = true;
            selectAllCheckbox.checked = false;
        }
    }
    
    // 선택 정보 텍스트 업데이트
    if (selectionText) {
        const totalCount = revitWallData.length;
        const filteredCount = filteredRevitWallData.length;
        
        if (selectedCount > 0) {
            if (filteredCount === totalCount) {
                selectionText.textContent = `총 ${totalCount}개 중 ${selectedCount}개 선택됨`;
            } else {
                selectionText.textContent = `총 ${totalCount}개 중 ${filteredCount}개 표시됨 (${selectedCount}개 선택)`;
            }
        } else {
            if (filteredCount === totalCount) {
                selectionText.textContent = `총 ${totalCount}개의 벽체 데이터`;
            } else {
                selectionText.textContent = `총 ${totalCount}개 중 ${filteredCount}개 표시됨 (필터 적용)`;
            }
        }
    }
};

/**
 * 전체 선택/해제
 */
window.toggleAllRevitSelection = function() {
    const selectAllCheckbox = document.getElementById('revitSelectAll');
    const checkboxes = document.querySelectorAll('.revit-row-checkbox');
    
    if (selectAllCheckbox && checkboxes.length > 0) {
        const shouldSelect = selectAllCheckbox.checked;
        checkboxes.forEach(checkbox => {
            checkbox.checked = shouldSelect;
        });
        updateRevitSelection();
    }
};

/**
 * Revit 데이터 지우기
 */
window.clearRevitData = function() {
    if (revitWallData.length === 0) {
        showToast('삭제할 Revit 데이터가 없습니다.', 'info');
        return;
    }
    
    if (confirm(`정말로 ${revitWallData.length}개의 Revit 벽체 데이터를 모두 삭제하시겠습니까?`)) {
        revitWallData = [];
        updateFilteredData([]);
        updateRevitDataTable();
        showToast('Revit 데이터가 모두 삭제되었습니다.', 'success');
    }
};

/**
 * Excel(.xlsx) 파일로 내보내기
 */
window.exportToExcel = function() {
    if (!revitWallData || revitWallData.length === 0) {
        showToast('내보낼 Revit 데이터가 없습니다.', 'warning');
        return;
    }
    
    try {
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        
        // 데이터 준비 (헤더 + 데이터)
        const worksheetData = [
            // 헤더 행
            ['Revit ID', 'Name', 'Length (m)', 'Area (m²)', 'Height (m)', 'Thickness (m)', 'Level', 'Category', '실명(Room)']
        ];
        
        // 데이터 행들 추가
        revitWallData.forEach(wall => {
            worksheetData.push([
                wall.ID || '',
                wall.Name || '',
                wall.Length || 0,
                wall.Area || 0,
                wall.Height || 0,
                wall.Thickness || 0,
                wall.Level || '',
                wall.Category || '',
                wall.RoomName || ''
            ]);
        });
        
        // 워크시트 생성
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // 컬럼 너비 설정
        ws['!cols'] = [
            { wch: 12 }, // Revit ID
            { wch: 20 }, // Name
            { wch: 12 }, // Length
            { wch: 12 }, // Area
            { wch: 12 }, // Height
            { wch: 12 }, // Thickness
            { wch: 15 }, // Level
            { wch: 15 }, // Category
            { wch: 15 }  // Room Name
        ];
        
        // 헤더 스타일 설정
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!ws[cellAddress]) continue;
            
            ws[cellAddress].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { bgColor: { indexed: 64 }, fgColor: { rgb: "4472C4" } },
                alignment: { horizontal: "center" }
            };
        }
        
        // 워크시트를 워크북에 추가
        XLSX.utils.book_append_sheet(wb, ws, "Revit 벽체 데이터");
        
        // 파일명 생성 (날짜 포함)
        const today = new Date();
        const dateStr = today.getFullYear() + 
                       String(today.getMonth() + 1).padStart(2, '0') + 
                       String(today.getDate()).padStart(2, '0');
        const filename = `revit-wall-data_${dateStr}.xlsx`;
        
        // Excel 파일 다운로드
        XLSX.writeFile(wb, filename);
        
        showToast(`${revitWallData.length}개의 벽체 데이터를 Excel 파일로 내보냈습니다.`, 'success');
        
    } catch (error) {
        console.error('Excel 내보내기 오류:', error);
        showToast('Excel 파일 생성 중 오류가 발생했습니다.', 'error');
    }
};

/**
 * JSON으로 내보내기
 */
window.exportToJSON = function() {
    if (!revitWallData || revitWallData.length === 0) {
        showToast('내보낼 Revit 데이터가 없습니다.', 'warning');
        return;
    }
    
    const exportData = {
        exportDate: new Date().toISOString(),
        totalCount: revitWallData.length,
        data: revitWallData
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, 'revit-wall-data.json', 'application/json');
    showToast(`${revitWallData.length}개의 벽체 데이터를 JSON 파일로 내보냈습니다.`, 'success');
};

/**
 * 파일에서 불러오기
 */
window.importFromFile = function() {
    const fileInput = document.getElementById('fileImportInput');
    if (fileInput) {
        fileInput.click();
    }
};

/**
 * 파일 불러오기 처리 (Excel, JSON 지원)
 */
window.handleFileImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        let importedData = [];
        
        if (file.name.endsWith('.json')) {
            // JSON 파일 처리
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    importedData = jsonData.data || jsonData;
                    processImportedData(importedData);
                } catch (error) {
                    console.error('JSON 파일 읽기 오류:', error);
                    showToast('JSON 파일을 읽는 중 오류가 발생했습니다.', 'error');
                }
            };
            reader.readAsText(file);
            
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            // Excel 파일 처리
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // 첫 번째 시트 읽기
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // 시트를 JSON으로 변환
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (jsonData.length > 1) {
                        // 헤더 제외하고 데이터만 처리
                        const headers = jsonData[0];
                        const dataRows = jsonData.slice(1);
                        
                        importedData = dataRows.map(row => ({
                            ID: row[0] || '',
                            Name: row[1] || '',
                            Length: parseFloat(row[2]) || 0,
                            Area: parseFloat(row[3]) || 0,
                            Height: parseFloat(row[4]) || 0,
                            Thickness: parseFloat(row[5]) || 0,
                            Level: row[6] || '',
                            Category: row[7] || '',
                            RoomName: row[8] || ''
                        })).filter(wall => wall.ID); // ID가 있는 것만 필터링
                        
                        processImportedData(importedData);
                    } else {
                        showToast('Excel 파일에 유효한 데이터가 없습니다.', 'error');
                    }
                    
                } catch (error) {
                    console.error('Excel 파일 읽기 오류:', error);
                    showToast('Excel 파일을 읽는 중 오류가 발생했습니다.', 'error');
                }
            };
            reader.readAsArrayBuffer(file);
            
        } else {
            showToast('지원하지 않는 파일 형식입니다. JSON 또는 Excel 파일을 선택해주세요.', 'warning');
        }
        
    } catch (error) {
        console.error('파일 처리 오류:', error);
        showToast('파일을 처리하는 중 오류가 발생했습니다.', 'error');
    }
    
    // 파일 입력 초기화
    event.target.value = '';
};

/**
 * 불러온 데이터 처리
 */
function processImportedData(importedData) {
    if (importedData.length > 0) {
        // 기존 데이터와 병합 여부 확인
        if (revitWallData.length > 0) {
            if (confirm(`기존 ${revitWallData.length}개의 데이터가 있습니다. 새 데이터를 추가하시겠습니까? (취소하면 기존 데이터를 대체합니다)`)) {
                revitWallData = [...revitWallData, ...importedData];
            } else {
                revitWallData = importedData;
            }
        } else {
            revitWallData = importedData;
        }
        
        // 필터링된 데이터 리셋
        updateFilteredData([...revitWallData]);
        
        // 테이블 업데이트
        updateRevitDataTable();
        openRevitDataSection();
        
        showToast(`${importedData.length}개의 벽체 데이터를 불러왔습니다.`, 'success');
    } else {
        showToast('유효한 데이터를 찾을 수 없습니다.', 'error');
    }
}

// CSV 관련 함수들은 더 이상 사용하지 않음 (Excel 파일 직접 처리)

/**
 * 파일 다운로드
 */
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // 링크를 문서에 추가하고 클릭한 후 제거
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // URL 객체 해제
    window.URL.revokeObjectURL(url);
}

/**
 * 드롭다운 기능 초기화
 */
function initializeDropdown() {
    document.addEventListener('click', function(e) {
        // 드롭다운 토글
        if (e.target.matches('.dropdown-toggle') || e.target.closest('.dropdown-toggle')) {
            e.preventDefault();
            const dropdown = e.target.closest('.dropdown');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            // 다른 열린 드롭다운 닫기
            document.querySelectorAll('.dropdown-menu.show').forEach(otherMenu => {
                if (otherMenu !== menu) {
                    otherMenu.classList.remove('show');
                }
            });
            
            // 현재 드롭다운 토글
            menu.classList.toggle('show');
        }
        // 드롭다운 외부 클릭시 닫기
        else if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
}

// CSS 스타일 추가
const style = document.createElement('style');
style.textContent = `
    .room-name {
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        transition: background-color 0.2s;
    }
    
    .room-name:hover {
        background-color: #e9ecef;
    }
    
    .room-name.empty {
        color: #6c757d;
        font-style: italic;
    }
    
    .col-revit-roomname {
        min-width: 100px;
    }
`;
document.head.appendChild(style);

/**
 * Revit 데이터 필터링 함수들
 */

/**
 * 필터 옵션 업데이트
 */
function updateFilterOptions() {
    const nameFilter = document.getElementById('nameFilter');
    const levelFilter = document.getElementById('levelFilter');
    
    if (!nameFilter || !levelFilter) return;
    
    // 기존 옵션 제거 (첫 번째 "전체" 옵션 제외)
    nameFilter.innerHTML = '<option value="">전체</option>';
    levelFilter.innerHTML = '<option value="">전체</option>';
    
    if (revitWallData.length === 0) return;
    
    // 고유한 Name 값들 수집
    const uniqueNames = [...new Set(revitWallData.map(wall => wall.Name).filter(name => name))];
    uniqueNames.sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        nameFilter.appendChild(option);
    });
    
    // 고유한 Level 값들 수집
    const uniqueLevels = [...new Set(revitWallData.map(wall => wall.Level).filter(level => level))];
    uniqueLevels.sort().forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = level;
        levelFilter.appendChild(option);
    });
}

/**
 * 필터 적용
 */
window.applyRevitFilters = function() {
    const nameFilter = document.getElementById('nameFilter');
    const levelFilter = document.getElementById('levelFilter');
    
    if (!nameFilter || !levelFilter) return;
    
    const selectedName = nameFilter.value;
    const selectedLevel = levelFilter.value;
    
    // 필터링 적용
    const filteredData = revitWallData.filter(wall => {
        const nameMatch = !selectedName || wall.Name === selectedName;
        const levelMatch = !selectedLevel || wall.Level === selectedLevel;
        return nameMatch && levelMatch;
    });
    updateFilteredData(filteredData);
    
    // 테이블 업데이트
    updateRevitDataTable();
    
    console.log(`🔍 필터 적용됨: Name="${selectedName}", Level="${selectedLevel}", 결과: ${filteredRevitWallData.length}개`);
};

/**
 * 필터 초기화
 */
window.clearRevitFilters = function() {
    const nameFilter = document.getElementById('nameFilter');
    const levelFilter = document.getElementById('levelFilter');
    
    if (nameFilter) nameFilter.value = '';
    if (levelFilter) levelFilter.value = '';
    
    // 필터링된 데이터를 전체 데이터로 리셋
    updateFilteredData([...revitWallData]);
    
    // 테이블 업데이트
    updateRevitDataTable();
    
    console.log('🔄 필터가 초기화되었습니다.');
};

/**
 * 선택된 벽체를 Revit에서 선택
 */
window.selectInRevit = function() {
    console.log('🚀 selectInRevit 함수 호출됨');
    const checkedBoxes = document.querySelectorAll('.revit-row-checkbox:checked');
    console.log('✅ 체크된 박스 개수:', checkedBoxes.length);
    
    // 선택된 항목이 없는 경우
    if (checkedBoxes.length === 0) {
        showToast('선택된 벽체가 없습니다.', 'warning');
        return;
    }
    
    // 체크된 행에서 ElementID 수집
    const elementIds = [];
    console.log('📊 ElementID 수집 시작');
    checkedBoxes.forEach((checkbox, i) => {
        const row = checkbox.closest('tr');
        const index = parseInt(row.getAttribute('data-wall-index'));
        const wall = filteredRevitWallData[index];
        console.log(`🔍 체크박스 ${i}: index=${index}, wall=`, wall);
        
        if (wall && wall.Id) {  // 대문자 ID → 소문자 Id로 변경
            elementIds.push(wall.Id);
            console.log(`➕ ElementID 추가: ${wall.Id}`);
        }
    });
    console.log('📋 수집된 ElementIds:', elementIds);
    
    // 유효한 ElementID가 없는 경우
    if (elementIds.length === 0) {
        showToast('선택된 벽체에 유효한 ID가 없습니다.', 'error');
        return;
    }
    
    // Revit으로 ElementID 배열 전송
    console.log('🚀 sendElementIdsToRevit 호출 준비, ElementIds:', elementIds);
    sendElementIdsToRevit(elementIds);
    
    // 사용자에게 피드백
    showToast(`${elementIds.length}개 객체를 Revit에서 선택 요청했습니다.`, 'info');
    
    console.log('🎯 Revit 객체 선택 요청:', elementIds);
};

/**
 * ElementID 배열을 Revit으로 전송 (HTTP API 방식)
 */
async function sendElementIdsToRevit(elementIds) {
    if (!elementIds || elementIds.length === 0) {
        console.error('전송할 ElementID가 없습니다.');
        showToast('선택된 객체가 없습니다.', 'warning');
        return;
    }
    
    try {
        console.log('🎯 Revit으로 ElementID 전송:', elementIds);
        
        // 디버깅: 사용 가능한 서비스들 확인
        console.log('🔍 디버깅 정보:');
        console.log('- window.revitService:', !!window.revitService);
        console.log('- window.socketService:', !!window.socketService);
        console.log('- socketService.isConnected:', window.socketService?.isConnected);
        
        // RevitService를 통한 객체 선택 요청 (다른 선택 기능과 동일한 패턴)
        if (window.revitService) {
            console.log('📡 RevitService를 통한 Revit 객체 선택 요청');
            console.log('📋 전송할 ElementIds:', elementIds);
            
            const result = await window.revitService.selectElements(elementIds);
            console.log('📥 RevitService 응답:', result);
            
            if (result !== false) {
                showToast(`${elementIds.length}개의 객체 선택 요청이 Revit으로 전송되었습니다.`, 'success');
            } else {
                showToast('Revit 연결을 확인해주세요.', 'error');
            }
        } else {
            // WebSocket이 연결되지 않은 경우 기존 HTTP API 방식 사용
            console.warn('⚠️ WebSocket 연결 없음, HTTP API 사용');
            
            const requestData = {
                Action: 'selectElements',
                ElementIds: elementIds
            };
            
            const response = await fetch('/api/revit/selectElements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('📤 Revit으로 ElementID 전송 성공:', result);
                showToast(`${elementIds.length}개의 객체가 Revit에서 선택되었습니다.`, 'success');
            } else {
                console.error('Revit API 응답 오류:', response.status, response.statusText);
                showToast('Revit 서버 응답 오류가 발생했습니다.', 'error');
            }
        }
        
    } catch (error) {
        console.error('Revit 통신 오류:', error);
        showToast('Revit과 통신할 수 없습니다. 서버 연결을 확인해주세요.', 'error');
    }
}

/**
 * RevitID로 테이블 행 하이라이트
 */
window.highlightRevitRow = function(revitId) {
    console.log('🎯 RevitID로 행 하이라이트 요청:', revitId);
    
    if (!revitId) {
        console.warn('RevitID가 제공되지 않았습니다.');
        return false;
    }
    
    // 기존 하이라이트 제거
    clearRevitHighlights();
    
    // 테이블에서 해당 RevitID를 가진 행 찾기
    const tableRows = document.querySelectorAll('#revitTableBody tr');
    let highlightedCount = 0;
    
    tableRows.forEach((row, index) => {
        const revitIdCell = row.querySelector('.col-revit-id');
        if (revitIdCell && revitIdCell.textContent.trim() === revitId.toString()) {
            // 하이라이트 적용
            row.classList.add('revit-row-highlight');
            highlightedCount++;
            
            // 스크롤하여 행이 보이도록 이동
            setTimeout(() => {
                row.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center'
                });
            }, 100);
            
            // 10초 후 하이라이트 자동 제거
            setTimeout(() => {
                row.classList.remove('revit-row-highlight');
            }, 10000);
            
            console.log(`✅ RevitID ${revitId} 행이 하이라이트되었습니다 (인덱스: ${index})`);
        }
    });
    
    if (highlightedCount === 0) {
        console.warn(`⚠️ RevitID ${revitId}에 해당하는 행을 찾을 수 없습니다.`);
        showToast(`RevitID ${revitId}에 해당하는 데이터를 찾을 수 없습니다.`, 'warning');
        return false;
    } else {
        showToast(`RevitID ${revitId} 행이 하이라이트되었습니다.`, 'success');
        return true;
    }
};

/**
 * 여러 RevitID 동시 하이라이트
 */
window.highlightMultipleRevitRows = function(revitIds) {
    console.log('🎯 다중 RevitID 하이라이트 요청:', revitIds);
    
    if (!Array.isArray(revitIds) || revitIds.length === 0) {
        console.warn('유효한 RevitID 배열이 제공되지 않았습니다.');
        return false;
    }
    
    // 기존 하이라이트 제거
    clearRevitHighlights();
    
    let highlightedCount = 0;
    const tableRows = document.querySelectorAll('#revitTableBody tr');
    
    revitIds.forEach(revitId => {
        tableRows.forEach((row, index) => {
            const revitIdCell = row.querySelector('.col-revit-id');
            if (revitIdCell && revitIdCell.textContent.trim() === revitId.toString()) {
                row.classList.add('revit-row-highlight');
                highlightedCount++;
                console.log(`✅ RevitID ${revitId} 행 하이라이트 적용 (인덱스: ${index})`);
            }
        });
    });
    
    if (highlightedCount > 0) {
        // 첫 번째 하이라이트된 행으로 스크롤
        const firstHighlighted = document.querySelector('.revit-row-highlight');
        if (firstHighlighted) {
            setTimeout(() => {
                firstHighlighted.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center'
                });
            }, 100);
        }
        
        // 10초 후 모든 하이라이트 제거
        setTimeout(() => {
            clearRevitHighlights();
        }, 10000);
        
        showToast(`${highlightedCount}개 행이 하이라이트되었습니다.`, 'success');
        return true;
    } else {
        console.warn('⚠️ 일치하는 RevitID를 찾을 수 없습니다.');
        showToast('일치하는 데이터를 찾을 수 없습니다.', 'warning');
        return false;
    }
};

/**
 * 모든 하이라이트 제거
 */
window.clearRevitHighlights = function() {
    const highlightedRows = document.querySelectorAll('.revit-row-highlight');
    highlightedRows.forEach(row => {
        row.classList.remove('revit-row-highlight');
    });
    console.log(`🔄 ${highlightedRows.length}개 행의 하이라이트가 제거되었습니다.`);
};


// 페이지 로드 시 드롭다운 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeDropdown();
});

console.log('✅ Revit 벽체 처리 핸들러 로드 완료 (하이라이트 기능 포함)');