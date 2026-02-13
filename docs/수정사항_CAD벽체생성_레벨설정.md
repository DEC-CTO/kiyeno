# CAD 벽체 생성 및 레벨 설정 수정사항

**작성일**: 2026-02-13
**대상 프로젝트**: Kiyeno (AutoCAD 애드인), QTO (Revit 애드인)
**수정 파일 수**: 3개 (총 18건 수정)

---

## 1. 벽체 중심선 기준 생성 파라미터 추가

**파일**: `QTO/QTO/CADLineWallData.cs`
**위치**: `Create_Wall_basic()` 함수 내 벽체 파라미터 설정 영역 (165~167행)

### 수정 전

벽체 생성 시 `WALL_KEY_REF_PARAM` (위치선) 파라미터를 설정하지 않아 Revit 기본값으로 생성되었음. 이로 인해 CAD 라인 위치와 Revit 벽체 위치가 일치하지 않는 문제 발생.

### 수정 후

```csharp
// 벽체 중심선 기준으로 생성 (Wall Centerline = 0)
Parameter param5 = wall1.get_Parameter(BuiltInParameter.WALL_KEY_REF_PARAM);
if (param5 != null && !param5.IsReadOnly) param5.Set(0);
```

CAD 라인을 벽체 중심선(Wall Centerline)으로 사용하여 벽체를 생성하도록 파라미터를 명시적으로 설정.

### WALL_KEY_REF_PARAM 값 참고

| 값 | 위치선 |
|----|--------|
| 0 | Wall Centerline (벽 중심선) |
| 1 | Core Centerline (코어 중심선) |
| 2 | Finish Face: Exterior (마감면 외부) |
| 3 | Finish Face: Interior (마감면 내부) |
| 4 | Core Face: Exterior (코어면 외부) |
| 5 | Core Face: Interior (코어면 내부) |

---

## 2. Ceiling 레벨 모드 검증 로직 오류 수정

**파일**: `Kiyeno/Kiyeno/KiyenoMain.cs`
**위치**: `button2_Click()` 함수 내 레벨 검증 영역 (265~271행)

### 수정 전

```csharp
if (L_botLevel == "" || L_topLevel == "")
{
    MessageBox.Show("레벨을 선택하고 실행하세요");
    return;
}
```

체크박스 미체크 상태(Ceiling 레벨 모드)에서 `L_CeilingLevel`에 값을 할당하지만, 검증은 `L_topLevel`을 확인하여 다음과 같은 문제 발생:
- Ceiling 레벨을 정상 선택했음에도 `L_topLevel`이 빈 값이라 경고 메시지 발생
- 또는 이전 세션에서 Top_Level을 선택한 적이 있으면 static 변수에 값이 남아 있어 잘못된 레벨로 벽체가 생성됨

### 수정 후

```csharp
// 실제 사용되는 TopLevel 검증
string actualTopLevel = m_IsCeilingLevel ? L_topLevel : L_CeilingLevel;
if (L_botLevel == "" || actualTopLevel == "")
{
    MessageBox.Show("레벨을 선택하고 실행하세요");
    return;
}
```

현재 모드에 따라 실제 사용되는 레벨 변수를 검증하도록 수정.

---

## 3. 폼 재오픈 시 static 변수 초기화 추가

**파일**: `Kiyeno/Kiyeno/KiyenoMain.cs`
**위치**: `KiyenoMain_Load()` 함수 (45~51행)

### 수정 전

레벨 선택 값(`L_botLevel`, `L_topLevel`, `L_CeilingLevel`)과 오프셋 값(`m_BottomOffset`, `m_TopOffset`)이 `static` 변수로 선언되어 있어, 폼을 닫았다가 다시 열어도 이전 선택 값이 그대로 남아있었음. UI의 콤보박스는 초기화되지만 내부 변수값은 유지되어 불일치 발생.

### 수정 후

```csharp
// static 변수 초기화 (폼 재오픈 시 이전 값 잔존 방지)
L_botLevel = "";
L_topLevel = "";
L_CeilingLevel = "";
m_BottomOffset = "0";
m_TopOffset = "0";
```

폼 로드 시 모든 static 변수를 초기 상태로 리셋하여 UI 표시값과 내부 변수값의 일관성을 보장.

---

---

## 4. FindWindow 창 제목 불일치 수정

**파일**: `Kiyeno/Kiyeno/KiyenoMain.cs`
**위치**: `sendmessagetorevit()` (124행), `sendmessagetorevit_datahub()` (162행)

### 수정 전

```csharp
// sendmessagetorevit() 내
IntPtr hwnd = FindWindow(null, "kiyeno System");    // 공백 없음

// sendmessagetorevit_datahub() 내
IntPtr hwnd = FindWindow(null, "kiyeno System ");   // 뒤에 공백 포함
```

두 함수가 서로 다른 창 제목으로 검색하여, 벽 생성 명령이 Revit에 전달되지 않는 경우 발생.

### 수정 후

두 함수 모두 `"kiyeno System "` (공백 포함, Revit 폼 제목과 일치)으로 통일.

---

## 5. FindWindow 반환값 검증 추가

**파일**: `Kiyeno/Kiyeno/KiyenoMain.cs`
**위치**: `sendmessagetorevit()`, `sendmessagetorevit_datahub()` 양쪽

### 수정 전

`FindWindow()` 반환값을 검증하지 않고 바로 `SendMessage()` 호출. 창을 찾지 못하면 `IntPtr.Zero`로 메시지 전송 → 실패하지만 사용자에게 알림 없음.

### 수정 후

```csharp
IntPtr hwnd = FindWindow(null, "kiyeno System ");
if (hwnd == IntPtr.Zero)
{
    MessageBox.Show("Revit의 kiyeno System 창을 찾을 수 없습니다.");
    return;
}
```

---

## 6. Revit 프로세스 확인 로직 수정

**파일**: `Kiyeno/Kiyeno/KiyenoMain.cs`
**위치**: `sendmessagetorevit()`, `sendmessagetorevit_datahub()` 양쪽

### 수정 전

```csharp
foreach (Process proc in process)
{
    if (proc.ProcessName.Equals("Revit"))
    {
        isExecuting = true;
        break;
    }
    else
        isExecuting = false;  // 매 루프마다 덮어씌움
}
```

`else isExecuting = false`가 매 반복마다 실행되어, 프로세스 목록 순서에 따라 Revit을 찾아도 이후 루프에서 false로 덮어씌워질 위험.

### 수정 후

```csharp
isExecuting = false;  // 루프 전 초기화
foreach (Process proc in process)
{
    if (proc.ProcessName.Equals("Revit"))
    {
        isExecuting = true;
        break;
    }
}
```

---

## 7. 레벨 검증 순서 수정

**파일**: `Kiyeno/Kiyeno/KiyenoMain.cs`
**위치**: `button2_Click()` 함수

### 수정 전

레벨값을 `cd.m_TopLevel`에 먼저 할당한 후 검증을 수행. 반복문 내에서 검증 실패 시 이전에 추가된 잘못된 데이터가 리스트에 잔존.

### 수정 후

```csharp
// 레벨 검증 (할당 전에 수행)
string actualTopLevel = m_IsCeilingLevel ? L_topLevel : L_CeilingLevel;
if (L_botLevel == "" || actualTopLevel == "")
{
    MessageBox.Show("레벨을 선택하고 실행하세요");
    return;
}

cd.m_BottomLevel = L_botLevel;
cd.m_TopLevel = actualTopLevel;
```

검증을 할당 전으로 이동하고, `if/else if` 분기를 `actualTopLevel` 변수로 단순화.

---

## 8. 인코딩 UTF-8 통일

**파일**: `Kiyeno/Kiyeno/KiyenoMain.cs`
**위치**: `WndProc()`, `sendmessagetorevit()`, `sendmessagetorevit_datahub()` 내 인코딩 처리

### 수정 전

```csharp
byte[] buff = System.Text.Encoding.Default.GetBytes(str);
```

`Encoding.Default`는 OS 로케일에 의존. JSON에 한글 레벨명이 포함될 경우 인코딩 불일치로 Revit 측 역직렬화 실패 가능.

### 수정 후

```csharp
byte[] buff = System.Text.Encoding.UTF8.GetBytes(str);
```

모든 WM_COPYDATA 통신을 UTF-8로 통일하여 한글 데이터 안정성 확보.

---

## 9. CADLineWallData 생성자 보호 추가

**파일**: `QTO/QTO/CADLineWallData.cs`
**위치**: 생성자 `CADLineWallData()` (48~57행)

### 수정 전

```csharp
m_BottomLevel = Util.GetLevelByName(doc, LinewallData[0].m_BottomLevel);
m_bottomoffset = Convert.ToDouble(LinewallData[0].m_BottomOffset) / MM2F;
```

빈 리스트 전달 시 `IndexOutOfRangeException`, 숫자가 아닌 오프셋 문자열 시 `FormatException` 발생.

### 수정 후

```csharp
if (LinewallData == null || LinewallData.Count == 0)
{
    MessageBox.Show("벽체 데이터가 없습니다.");
    return;
}
// ...
double.TryParse(LinewallData[0].m_BottomOffset, out double botOffset);
double.TryParse(LinewallData[0].m_TopOffset, out double topOffset);
m_bottomoffset = botOffset / MM2F;
m_Topoffset = topOffset / MM2F;
```

Null/빈 리스트 검증 및 안전한 숫자 파싱으로 변경.

---

## 10. WallType 검색 최적화

**파일**: `QTO/QTO/CADLineWallData.cs`
**위치**: `Create()` 함수 내 WallType 검색

### 수정 전

```csharp
foreach (WallCurveData data in m_Walldata)
{
    // 매 벽마다 FilteredElementCollector로 동일한 WallType 반복 검색
    WallType s = new FilteredElementCollector(m_doc)...
}
```

100개 벽 생성 시 동일한 WallType을 100번 검색하여 불필요한 성능 저하.

### 수정 후

WallType 검색을 루프 밖에서 1회만 수행하도록 이동.

---

## 11. Null 커브 체크 추가

**파일**: `QTO/QTO/CADLineWallData.cs`
**위치**: `Create()` 함수 내 벽 생성 루프

### 수정 전

`Util.ConvertCurve()`가 null을 반환해도 검증 없이 `Create_Wall_basic()`에 전달 → `Wall.Create()` 예외 발생.

### 수정 후

```csharp
Curve c = Util.ConvertCurve(data.m_Rlines, data.m_Rarcs, true, Base_H);
if (c == null)
{
    pf.Increment();
    continue;
}
```

---

## 12. RLine 축 보정 - 각도 기반으로 변경

**파일**: `DataHub/DataHub/DataHubList.cs`
**위치**: `RLine(RXYZ p1, RXYZ p2)` 생성자 (59행~)

### 수정 전

```csharp
m_ep = new RXYZ(
    Math.Abs(p2.m_x - p1.m_x) < 1.0 ? p1.m_x : p2.m_x,
    Math.Abs(p2.m_y - p1.m_y) < 1.0 ? p1.m_y : p2.m_y,
    Math.Abs(p2.m_z - p1.m_z) < 1.0 ? p1.m_z : p2.m_z
);
```

**거리 기반 1mm 고정 임계값** 사용. CAD 라인의 끝점 이격이 1mm 이상이면 보정하지 않아 Revit에서 "벽이 축을 약간 벗어났습니다. 부정확해질 수 있습니다." 경고 발생.

### 문제 원인

Revit의 "slightly off axis" 경고는 **거리가 아닌 각도 기준** (0.2도 이내)으로 판정. 벽 길이에 따라 같은 이격 거리라도 각도가 달라지므로, 고정 거리 임계값으로는 정확한 보정이 불가능.

| 벽 길이 | 0.2° 시 끝점 이격 | 기존 1mm 스냅 |
|---------|-------------------|-------------|
| 1m | ~3.5mm | 1mm 초과 → 미보정 → **경고** |
| 5m | ~17.5mm | 1mm 초과 → 미보정 → **경고** |
| 10m | ~34.9mm | 1mm 초과 → 미보정 → **경고** |

### 수정 후

**각도 기반 보정**으로 변경:
- 8개 축 (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°) 기준
- 축에서 0.2° 이내로 벗어난 경우에만 자동 보정
- 카디널 축 (0°/90°/180°/270°): 직접 좌표 보정 (부동소수점 오차 방지)
- 대각선 축 (45°/135°/225°/315°): 삼각함수로 보정 (벽 길이 유지)
- Z축: 기존 1mm 거리 기반 유지 (표고 방향)

### 보정 대상

Revit이 경고를 발생시키는 8개 축 근처의 미세 편차만 보정. 33°, 60° 등 비표준 각도 벽은 의도적 대각선으로 판단하여 보정하지 않음.

---

## 13. 벽체 생성 순서 - 짧은 벽부터 생성

**파일**: `QTO/QTO/CADLineWallData.cs`
**위치**: `Create()` 함수 내 벽체 생성 루프 직전 (97행~)

### 수정 전

CAD에서 전송된 순서대로 벽체를 생성. 긴 벽이 먼저 생성되면 근접 위치의 벽과 자동 결합(Wall Join)되어, 이후 생성되는 짧은 벽이 긴 벽에 포함/흡수되면서 경고 발생.

### 수정 후

```csharp
// 길이가 짧은 순서로 정렬하여 생성
var sortedWallData = m_Walldata.OrderBy(data =>
{
    if (data.m_Rlines != null)
    {
        double dx = data.m_Rlines.m_ep.m_x - data.m_Rlines.m_sp.m_x;
        double dy = data.m_Rlines.m_ep.m_y - data.m_Rlines.m_sp.m_y;
        return Math.Sqrt(dx * dx + dy * dy);
    }
    else if (data.m_Rarcs != null)
    {
        double dx = data.m_Rarcs.m_ep.m_x - data.m_Rarcs.m_sp.m_x;
        double dy = data.m_Rarcs.m_ep.m_y - data.m_Rarcs.m_sp.m_y;
        return Math.Sqrt(dx * dx + dy * dy);
    }
    return 0.0;
}).ToList();
```

짧은 벽을 먼저 생성하여 긴 벽의 자동 결합에 의한 흡수를 방지. 짧은 벽이 이미 존재하면 이후 긴 벽 생성 시 독립적으로 결합됨.

---

## 14. 벽 파라미터 설정 시 Null 체크 추가

**파일**: `QTO/QTO/CADLineWallData.cs`
**위치**: `Create_Wall_basic()` 함수 내 두 번째 트랜잭션 (178행~)

### 수정 전

```csharp
trans.Start("Create2");
Wall wall1 = m_doc.GetElement(elemId) as Wall;
Parameter param2 = wall1.get_Parameter(...);  // wall1이 null이면 예외 발생
```

첫 번째 트랜잭션 커밋 시 Revit의 자동결합(Wall Join)이 벽을 다른 벽에 흡수/병합할 수 있음. 이 경우 `GetElement()`이 null을 반환하여 "Object reference not set to an instance of an object." NullReferenceException 발생.

### 수정 후

```csharp
trans.Start("Create2");
Wall wall1 = m_doc.GetElement(elemId) as Wall;

if (wall1 == null)
{
    // 자동결합으로 벽이 흡수된 경우
    trans.RollBack();
    return ElementId.InvalidElementId;
}

Parameter param2 = wall1.get_Parameter(...);
```

벽이 자동결합으로 흡수된 경우 트랜잭션을 롤백하고 안전하게 반환.

---

## 15. MyFailureHandler 확장 - 벽 결합 오류 및 겹침 경고 자동 처리

**파일**: `QTO/QTO/CADLineWallData.cs`
**위치**: `MyFailureHandler` 클래스 (223행~)

### 수정 전

```csharp
// InaccurateBeamOrBrace 경고만 처리
if (failId == BuiltInFailures.InaccurateFailures.InaccurateBeamOrBrace)
{
    failureAccessor.DeleteWarning(failure);
}
return FailureProcessingResult.Continue;
```

벽 생성 시 발생하는 다른 경고/오류를 처리하지 않아 Revit 대화상자가 표시됨:
- **"요소를 결합된 상태로 유지할 수 없습니다"** (오류): 인접 벽과 자동결합(Wall Join) 시 유효하지 않은 형상이 생성될 때 발생. 파라미터 변경(레벨, 오프셋 등) 시 기존 결합이 무효화되면서 트리거됨.
- **"하이라이트된 벽이 겹칩니다"** (경고): 동일/유사 위치에 벽이 중복 생성될 때 Revit이 룸 경계 계산 시 하나를 무시할 수 있음을 경고.
- **"벽을 만들 수 없습니다"** (오류): 커브 길이가 Revit 최소값 미만이거나, 기존 벽과 완전히 겹치는 경우 벽 생성 자체가 실패.

### 수정 후

```csharp
public FailureProcessingResult PreprocessFailures(FailuresAccessor failureAccessor)
{
    bool hasResolvedError = false;

    foreach (FailureMessageAccessor failure in failureAccessor.GetFailureMessages())
    {
        FailureSeverity severity = failure.GetSeverity();

        if (severity == FailureSeverity.Warning)
        {
            // 모든 경고 억제 (축 벗어남, 벽 겹침 등)
            failureAccessor.DeleteWarning(failure);
        }
        else if (severity == FailureSeverity.Error)
        {
            // 오류: 해결 가능하면 자동 해결 (요소 결합 해제, 인스턴스 삭제 등)
            if (failure.HasResolutions())
            {
                failureAccessor.ResolveFailure(failure);
                hasResolvedError = true;
            }
        }
    }

    if (hasResolvedError)
        return FailureProcessingResult.ProceedWithCommit;

    return FailureProcessingResult.Continue;
}
```

- **경고(Warning)**: 모두 자동 삭제 (벽 겹침, 축 벗어남 등)
- **오류(Error)**: Revit이 제안하는 해결책을 자동 적용 (요소 결합 해제, 인스턴스 삭제 등)
- 두 번째 트랜잭션(파라미터 설정)에도 동일한 FailureHandler 적용

---

## 16. 중복 커브 제거 및 최소 길이 필터 추가

**파일**: `QTO/QTO/CADLineWallData.cs`
**위치**: `Create()` 함수 내 정렬 후, 루프 전 / 헬퍼 메서드 4개 추가

### 수정 전

CAD 데이터에 중복 라인이 포함되어 있으면 같은 위치에 벽이 2개 이상 생성되어 "벽이 겹칩니다" 경고 또는 "벽을 만들 수 없습니다" 오류 발생. 또한 극히 짧은 커브(1mm 미만)도 벽 생성을 시도하여 실패.

### 수정 후

```csharp
// 중복 커브 제거 및 최소 길이 필터
var filteredWallData = FilterWallData(sortedWallData);
```

**추가된 헬퍼 메서드**:
- `GetCurveLength()`: 커브 길이 계산 (mm)
- `FilterWallData()`: 최소 길이(1mm) 미달 및 중복 커브 제거
- `IsDuplicateCurve()`: 시작점/끝점 양방향 비교로 중복 판정 (허용 오차 1mm)
- `PointDistance()`: 두 점 사이 거리 계산

**중복 판정 로직**:
- 직선(RLine): `(SP1≈SP2 & EP1≈EP2)` 또는 `(SP1≈EP2 & EP1≈SP2)` - 방향 무관
- 호(RArc): 시작점, 중간점, 끝점 모두 일치

---

## 17. 두 번째 트랜잭션에 FailureHandler 추가

**파일**: `QTO/QTO/CADLineWallData.cs`
**위치**: `Create_Wall_basic()` 함수 내 두 번째 트랜잭션 시작 직후

### 수정 전

```csharp
trans.Start("Create2");
// FailureHandler 없음 → 파라미터 변경 시 발생하는 오류가 Revit 대화상자로 표시
```

첫 번째 트랜잭션(벽 생성)에만 FailureHandler가 적용되어, 두 번째 트랜잭션(파라미터 설정: 레벨, 오프셋, 중심선 등)에서 발생하는 결합 오류가 처리되지 않음.

### 수정 후

```csharp
trans.Start("Create2");

FailureHandlingOptions failOpt2 = trans.GetFailureHandlingOptions();
failOpt2.SetFailuresPreprocessor(new MyFailureHandler());
trans.SetFailureHandlingOptions(failOpt2);
```

두 번째 트랜잭션에도 동일한 MyFailureHandler를 적용하여, 파라미터 변경 시 발생하는 벽 결합 오류도 자동으로 처리.

---

## 18. 벽체 생성 결과 로그 표시

**파일**: `QTO/QTO/CADLineWallData.cs`
**위치**: `Create()` 함수 내 `finally` 블록 (233~241행)

### 수정 전

벽체 생성 완료 후 결과에 대한 피드백 없음. 몇 개가 성공/실패했는지, 필터에 의해 제거되었는지 확인 불가.

### 수정 후

```csharp
finally
{
    if (idx.Count != 0)
    {
        m_uidoc.Selection.SetElementIds(idx);
    }
    ProgressForm.m_abortFlag = false;

    // 결과 로그 표시
    string log = $"벽체 생성 결과\n" +
                 $"──────────────\n" +
                 $"전체 입력: {totalInput}개\n" +
                 $"필터 제거: {filteredOut}개 (중복/최소길이)\n" +
                 $"생성 성공: {successCount}개\n" +
                 $"커브 변환 실패: {failedCurve}개\n" +
                 $"생성 실패: {failedCreate}개";
    MessageBox.Show(log, "Create Wall - 결과");
}
```

**표시 항목**:
- **전체 입력**: CAD에서 전송된 원본 커브 수
- **필터 제거**: 중복 커브 및 최소 길이(1mm) 미달로 제거된 수
- **생성 성공**: Revit에 정상 생성된 벽체 수
- **커브 변환 실패**: `Util.ConvertCurve()`에서 null 반환된 수
- **생성 실패**: 벽 생성 또는 파라미터 설정 실패 (자동결합 흡수 포함)

벽체 생성 완료 후 MessageBox로 결과 요약을 표시하여 누락/실패 여부를 즉시 확인 가능.

---

## 수정 요약

| # | 파일 | 수정 내용 | 분류 |
|---|------|-----------|------|
| 1 | `QTO/QTO/CADLineWallData.cs` | 벽체 위치선을 Wall Centerline으로 설정 | 기능 추가 |
| 2 | `Kiyeno/Kiyeno/KiyenoMain.cs` | Ceiling 레벨 모드 검증 조건 수정 | 버그 수정 |
| 3 | `Kiyeno/Kiyeno/KiyenoMain.cs` | 폼 로드 시 static 변수 초기화 | 버그 수정 |
| 4 | `Kiyeno/Kiyeno/KiyenoMain.cs` | FindWindow 창 제목 불일치 통일 | 버그 수정 |
| 5 | `Kiyeno/Kiyeno/KiyenoMain.cs` | FindWindow 반환값 검증 추가 | 안정성 개선 |
| 6 | `Kiyeno/Kiyeno/KiyenoMain.cs` | Revit 프로세스 확인 로직 수정 | 버그 수정 |
| 7 | `Kiyeno/Kiyeno/KiyenoMain.cs` | 레벨 검증을 할당 전으로 이동 | 버그 수정 |
| 8 | `Kiyeno/Kiyeno/KiyenoMain.cs` | 인코딩 UTF-8 통일 | 안정성 개선 |
| 9 | `QTO/QTO/CADLineWallData.cs` | 생성자 Null/빈 리스트 검증, 안전한 파싱 | 안정성 개선 |
| 10 | `QTO/QTO/CADLineWallData.cs` | WallType 검색 루프 밖으로 이동 | 성능 개선 |
| 11 | `QTO/QTO/CADLineWallData.cs` | Null 커브 건너뛰기 추가 | 안정성 개선 |
| 12 | `DataHub/DataHubList.cs` | RLine 축 보정을 각도 기반(0.2°)으로 변경 | 버그 수정 |
| 13 | `QTO/QTO/CADLineWallData.cs` | 벽체 생성 순서를 짧은 벽부터 (자동결합 흡수 방지) | 기능 개선 |
| 14 | `QTO/QTO/CADLineWallData.cs` | 벽 파라미터 설정 시 Null 체크 (NullReferenceException 방지) | 버그 수정 |
| 15 | `QTO/QTO/CADLineWallData.cs` | MyFailureHandler 확장 (경고 억제 + 오류 자동 해결) | 안정성 개선 |
| 16 | `QTO/QTO/CADLineWallData.cs` | 중복 커브 제거 및 최소 길이 필터 추가 | 안정성 개선 |
| 17 | `QTO/QTO/CADLineWallData.cs` | 두 번째 트랜잭션에 FailureHandler 적용 | 안정성 개선 |
| 18 | `QTO/QTO/CADLineWallData.cs` | 벽체 생성 결과 로그 MessageBox 표시 | 기능 추가 |
