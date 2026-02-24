; ============================================================
; Kiyeno 통합 인스톨러
; Inno Setup 6.x Script
; ============================================================
;
; 빌드 전 준비사항:
; 1. QTO 프로젝트를 Debug 구성으로 빌드 (QTO\QTO\bin\Debug\)
; 2. Kiyeno 프로젝트를 Debug 구성으로 빌드 (Kiyeno\Kiyeno\bin\Debug\)
; 3. npm install 실행하여 node_modules 설치
; 4. Node.js LTS MSI를 다운로드하여 prerequisites\ 폴더에 배치
;    https://nodejs.org/ → node-v*.msi
; 5. Inno Setup 6.x로 이 스크립트를 컴파일
;
; ============================================================

#define MyAppName "Kiyeno"
#define MyAppVersion "1.6"
#define MyAppPublisher "FlorBIM"

[Setup]
AppId={{A1F2E3D4-5B6C-7D8E-9F0A-1B2C3D4E5F6A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={commonpf}\Kiyeno
DisableDirPage=yes
DefaultGroupName={#MyAppName}
OutputDir=out
OutputBaseFilename=Kiyeno_Setup_{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=admin
UsedUserAreasWarning=no
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
WizardStyle=modern
UninstallDisplayName={#MyAppName} {#MyAppVersion}

[Types]
Name: "full"; Description: "전체 설치"
Name: "custom"; Description: "사용자 지정"; Flags: iscustom

[Components]
Name: "revit"; Description: "Revit 2026 (QTO 벽체 관리 + 웹 서버)"; Types: full custom
Name: "autocad"; Description: "AutoCAD 2019~2026 (Kiyeno 플러그인)"; Types: full custom
Name: "nodejs"; Description: "Node.js Runtime (웹 서버 실행용)"; Types: full custom

; ============================================================
; [Files] - 파일 복사
; ============================================================

[Files]
; --- QTO DLL + 설정 (bin\Debug\ → {app}\) ---
Source: "QTO\QTO\bin\Debug\QTO.dll"; DestDir: "{app}"; \
  Components: revit; Flags: ignoreversion
Source: "QTO\QTO\bin\Debug\QTO.dll.config"; DestDir: "{app}"; \
  Components: revit; Flags: ignoreversion
Source: "QTO\QTO\bin\Debug\DataHub.dll"; DestDir: "{app}"; \
  Components: revit; Flags: ignoreversion
Source: "QTO\QTO\bin\Debug\Newtonsoft.Json.dll"; DestDir: "{app}"; \
  Components: revit; Flags: ignoreversion
Source: "QTO\QTO\bin\Debug\runtimes\*"; DestDir: "{app}\runtimes"; \
  Components: revit; Flags: ignoreversion recursesubdirs createallsubdirs

; --- 웹 서버 (프로젝트 루트 → {app}\ 동일 폴더) ---
Source: "server.js"; DestDir: "{app}"; \
  Components: revit; Flags: ignoreversion
Source: "package.json"; DestDir: "{app}"; \
  Components: revit; Flags: ignoreversion
Source: "api\*"; DestDir: "{app}\api"; \
  Components: revit; Flags: ignoreversion
Source: "services\*"; DestDir: "{app}\services"; \
  Components: revit; Flags: ignoreversion
Source: "public\*"; DestDir: "{app}\public"; \
  Components: revit; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "node_modules\*"; DestDir: "{app}\node_modules"; \
  Components: revit; Flags: ignoreversion recursesubdirs createallsubdirs

; --- Kiyeno AutoCAD Plugin (.bundle/Contents/ 안에 배치) ---
Source: "Kiyeno\Kiyeno\bin\Debug\Kiyeno.dll"; \
  DestDir: "{userappdata}\Autodesk\ApplicationPlugins\Kiyeno.bundle\Contents"; \
  Components: autocad; Flags: ignoreversion
Source: "Kiyeno\Kiyeno\bin\Debug\DataHub.dll"; \
  DestDir: "{userappdata}\Autodesk\ApplicationPlugins\Kiyeno.bundle\Contents"; \
  Components: autocad; Flags: ignoreversion
Source: "Kiyeno\Kiyeno\bin\Debug\Newtonsoft.Json.dll"; \
  DestDir: "{userappdata}\Autodesk\ApplicationPlugins\Kiyeno.bundle\Contents"; \
  Components: autocad; Flags: ignoreversion

; --- Node.js MSI (임시 폴더에 복사 후 실행) ---
Source: "prerequisites\node-v25.6.1-x64.msi"; DestDir: "{tmp}"; \
  Components: nodejs; Flags: ignoreversion deleteafterinstall

; ============================================================
; [Dirs] - 쓰기 권한이 필요한 디렉토리
; ============================================================

[Dirs]
Name: "{app}\data"; Permissions: users-modify
Name: "{app}\logs"; Permissions: users-modify

; ============================================================
; [Run] - 설치 후 실행
; ============================================================

[Run]
; Node.js 설치 (조용히)
Filename: "msiexec.exe"; \
  Parameters: "/i ""{tmp}\node-v25.6.1-x64.msi"" /qn"; \
  StatusMsg: "Node.js Runtime 설치 중..."; \
  Components: nodejs; Flags: waituntilterminated

; ============================================================
; [UninstallDelete] - 언인스톨 시 정리
; ============================================================

[UninstallDelete]
; 동적 생성된 파일들
Type: files; Name: "{commonappdata}\Autodesk\Revit\Addins\2026\QTO.addin"
Type: filesandordirs; Name: "{userappdata}\Autodesk\ApplicationPlugins\Kiyeno.bundle"
; 런타임 생성 데이터
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\logs"
; 잔여 폴더 정리
Type: dirifempty; Name: "{app}\api"
Type: dirifempty; Name: "{app}\services"
Type: dirifempty; Name: "{app}\public"
Type: dirifempty; Name: "{app}\node_modules"
Type: dirifempty; Name: "{app}\runtimes"
Type: dirifempty; Name: "{app}"

; ============================================================
; [Code] - Pascal Script
; ============================================================

[Code]

var
  ComponentsInitialized: Boolean;

// ===== 앱 감지 함수 =====

function IsRevit2026Installed: Boolean;
begin
  Result := RegKeyExists(HKLM, 'SOFTWARE\Autodesk\Revit\Autodesk Revit 2026');
end;

function IsAutoCADInstalled: Boolean;
var
  Keys: TArrayOfString;
  I: Integer;
begin
  Result := False;
  if RegGetSubkeyNames(HKLM, 'SOFTWARE\Autodesk\AutoCAD', Keys) then
  begin
    for I := 0 to GetArrayLength(Keys) - 1 do
    begin
      // R23=2019, R24=2021, R25=2024, R26=2026
      if (Pos('R23', Keys[I]) > 0) or (Pos('R24', Keys[I]) > 0) or
         (Pos('R25', Keys[I]) > 0) or (Pos('R26', Keys[I]) > 0) then
      begin
        Result := True;
        Break;
      end;
    end;
  end;
end;

function IsNodeJSInstalled: Boolean;
begin
  Result := RegKeyExists(HKLM, 'SOFTWARE\Node.js');
end;

// ===== 컴포넌트 자동 선택/해제 =====

procedure CurPageChanged(CurPageID: Integer);
begin
  if (CurPageID = wpSelectComponents) and (not ComponentsInitialized) then
  begin
    ComponentsInitialized := True;
    // 인덱스: 0=revit, 1=autocad, 2=nodejs
    if not IsRevit2026Installed then
      WizardForm.ComponentsList.Checked[0] := False;
    if not IsAutoCADInstalled then
      WizardForm.ComponentsList.Checked[1] := False;
    if IsNodeJSInstalled then
      WizardForm.ComponentsList.Checked[2] := False;
  end;
end;

// ===== Revit QTO.addin 생성 =====

procedure GenerateQTOAddin;
var
  Content, DllPath, AddinDir: String;
begin
  DllPath := ExpandConstant('{app}') + '\QTO.dll';
  AddinDir := ExpandConstant('{commonappdata}') + '\Autodesk\Revit\Addins\2026';

  ForceDirectories(AddinDir);

  Content := '<?xml version="1.0" encoding="utf-8"?>' + #13#10;
  Content := Content + '<RevitAddIns>' + #13#10;
  Content := Content + '  <AddIn Type="Command">' + #13#10;
  Content := Content + '    <Text>Command QTO</Text>' + #13#10;
  Content := Content + '    <Assembly>' + DllPath + '</Assembly>' + #13#10;
  Content := Content + '    <FullClassName>QTO.Command</FullClassName>' + #13#10;
  Content := Content + '    <ClientId>c350a19a-90de-4fe0-9a32-850fc681ee33</ClientId>' + #13#10;
  Content := Content + '    <VendorId>com.typepad.thebuildingcoder</VendorId>' + #13#10;
  Content := Content + '    <VendorDescription>FlorBIM</VendorDescription>' + #13#10;
  Content := Content + '  </AddIn>' + #13#10;
  Content := Content + '  <AddIn Type="Application">' + #13#10;
  Content := Content + '    <Name>Application QTO</Name>' + #13#10;
  Content := Content + '    <Assembly>' + DllPath + '</Assembly>' + #13#10;
  Content := Content + '    <FullClassName>QTO.App</FullClassName>' + #13#10;
  Content := Content + '    <ClientId>76d15071-e1a9-45a2-9595-ca9098b760a1</ClientId>' + #13#10;
  Content := Content + '    <VendorId>com.typepad.thebuildingcoder</VendorId>' + #13#10;
  Content := Content + '    <VendorDescription>FlorBIM</VendorDescription>' + #13#10;
  Content := Content + '  </AddIn>' + #13#10;
  Content := Content + '</RevitAddIns>' + #13#10;

  SaveStringToFile(AddinDir + '\QTO.addin', Content, False);
end;

// ===== AutoCAD PackageContents.xml 생성 =====

procedure GenerateKiyenoBundle;
var
  Content, BundlePath: String;
begin
  BundlePath := ExpandConstant('{userappdata}') + '\Autodesk\ApplicationPlugins\Kiyeno.bundle';

  ForceDirectories(BundlePath);

  Content := '<?xml version="1.0" encoding="utf-8"?>' + #13#10;
  Content := Content + '<ApplicationPackage SchemaVersion="1.0"' + #13#10;
  Content := Content + '  Name="Kiyeno Wall Manager"' + #13#10;
  Content := Content + '  Description="Kiyeno Wall Manager"' + #13#10;
  Content := Content + '  AppVersion="1.6"' + #13#10;
  Content := Content + '  ProductCode="{F7A8B9C0-1D2E-3F4A-5B6C-7D8E9F0A1B2C}">' + #13#10;
  Content := Content + '  <CompanyDetails Name="FlorBIM" />' + #13#10;
  Content := Content + '  <Components Description="Main Module">' + #13#10;
  Content := Content + '    <RuntimeRequirements OS="Win64" Platform="AutoCAD*" SeriesMin="R23.0" SeriesMax="R26.0" />' + #13#10;
  Content := Content + '    <ComponentEntry AppName="Kiyeno Wall Manager"' + #13#10;
  Content := Content + '      ModuleName="./Contents/Kiyeno.dll"' + #13#10;
  Content := Content + '      AppType=".Net"' + #13#10;
  Content := Content + '      LoadOnAutoCADStartup="True" />' + #13#10;
  Content := Content + '  </Components>' + #13#10;
  Content := Content + '</ApplicationPackage>' + #13#10;

  SaveStringToFile(BundlePath + '\PackageContents.xml', Content, False);
end;

// ===== 설치 단계별 실행 =====

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Revit QTO.addin 생성
    if WizardIsComponentSelected('revit') then
      GenerateQTOAddin;

    // AutoCAD Kiyeno.bundle 생성
    if WizardIsComponentSelected('autocad') then
      GenerateKiyenoBundle;
  end;
end;

// ===== 초기화 =====

function InitializeSetup: Boolean;
begin
  ComponentsInitialized := False;
  Result := True;
end;
