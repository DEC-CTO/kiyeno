using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Net;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using Autodesk.Revit.ApplicationServices;
using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using Autodesk.Revit.UI.Selection;
using System.Diagnostics;
using System.IO;
using Newtonsoft.Json;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;
using DataHub;
using static QTO.QTOForm;
using System.Windows.Forms.VisualStyles;
using System.Net.WebSockets;
using System.Threading;
using Autodesk.Revit.DB.Architecture;
using Autodesk.Revit.DB.Structure;
using Newtonsoft.Json.Linq;

namespace QTO
{
    public partial class QTOForm : System.Windows.Forms.Form
    {
        public ExternalEvent m_exEvent;
        public CustomEventHandler m_handler;
        private ToolStripStatusLabel statusLabel;
        public static string m_behavior = "";
        public static string m_RecieveData = "";
        public static bool isExecuting = false;

        //Revit 객체선택데이터
        public static List<string> m_data = new List<string>();

        // 선택된 벽체 정보를 저장할 리스트
        public static List<WallInfo> selectedWalls = new List<WallInfo>();

        // 벽체 타입 생성 데이터
        public static List<WallTypeCreationData> wallTypesToCreate = new List<WallTypeCreationData>();

        // 벽체 색상 매핑 데이터
        public static List<WallColorMapping> wallColorMappings = new List<WallColorMapping>();
        public static List<string> elementsToClearColor = new List<string>();

        // 범례뷰 생성 데이터
        public static List<LegendItem> legendItems = new List<LegendItem>();
        public static string legendViewName = "";

        // 3D 뷰 복제 + 색상 적용 데이터
        public static DuplicateViewData duplicateViewData = null;



        // WebSocket 클라이언트 (순수 WebSocket)
        private ClientWebSocket webSocket;
        private CancellationTokenSource cancellationTokenSource;
        private bool isConnected = false;

        // Node.js 서버 프로세스 관리
        private Process nodeServerProcess;
        private string serverPath;

        public QTOForm()
        {
            InitializeComponent();
            // 서버 경로 설정 (애드인 실행 파일과 같은 디렉토리)
            //string assemblyPath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            //serverPath = Path.GetDirectoryName(assemblyPath);
            serverPath = @"C:\ClaudeProject\ReReKiyeno";
            //WebSocket 클라이언트 초기화
            InitializeWebSocketClient();
        }

        #region WebSocket 연결 관리
        /// <summary>
        /// 순수 WebSocket 클라이언트 초기화
        /// </summary>
        private void InitializeWebSocketClient()
        {
            try
            {
                UpdateStatus("WebSocket 클라이언트 초기화 중...");

                webSocket = new ClientWebSocket();
                cancellationTokenSource = new CancellationTokenSource();

                UpdateStatus("WebSocket 클라이언트 준비 완료");
            }
            catch (Exception ex)
            {
                UpdateStatus($"WebSocket 초기화 실패: {ex.Message}");
            }
        }
        /// <summary>
        /// 순수 WebSocket 연결 시작 (재시도 로직 포함)
        /// </summary>
        private async Task ConnectToWebSocket()
        {
            const int maxRetries = 5;
            const int retryDelayMs = 2000; // 2초 간격

            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    if (webSocket != null && !isConnected)
                    {
                        UpdateStatus($"WebSocket 서버 연결 중... (시도 {attempt}/{maxRetries})");

                        // WebSocket 연결 (Socket.IO 대신 일반 WebSocket 엔드포인트 사용)
                        var uri = new Uri("ws://localhost:3001/websocket");

                        // 연결 시도
                        await webSocket.ConnectAsync(uri, cancellationTokenSource.Token);

                        if (webSocket.State == WebSocketState.Open)
                        {
                            isConnected = true;
                            UpdateStatus("✅ WebSocket 연결 완료!");

                            // 메시지 수신 시작
                            _ = Task.Run(StartListening);

                            // Revit 상태 전송
                            await SendRevitStatus();
                            return; // 연결 성공 시 함수 종료
                        }
                    }
                }
                catch (Exception ex)
                {
                    UpdateStatus($"WebSocket 연결 실패 (시도 {attempt}/{maxRetries}): {ex.Message}");

                    // 마지막 시도가 아니면 재시도를 위해 WebSocket 재초기화
                    if (attempt < maxRetries)
                    {
                        try
                        {
                            webSocket?.Dispose();
                            webSocket = new ClientWebSocket();
                            UpdateStatus($"다음 연결 시도까지 {retryDelayMs / 1000}초 대기 중...");
                            await Task.Delay(retryDelayMs);
                        }
                        catch (Exception reinitEx)
                        {
                            UpdateStatus($"WebSocket 재초기화 실패: {reinitEx.Message}");
                        }
                    }
                }
            }

            // 모든 재시도 실패
            UpdateStatus("❌ WebSocket 연결 실패: 모든 재시도가 실패했습니다. 서버가 시작되었는지 확인하세요.");
        }

        /// <summary>
        /// WebSocket 메시지 수신 시작
        /// </summary>
        private async Task StartListening()
        {
            try
            {
                var buffer = new byte[4096];
                var messageBuilder = new StringBuilder();

                while (webSocket.State == WebSocketState.Open && !cancellationTokenSource.Token.IsCancellationRequested)
                {
                    var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationTokenSource.Token);

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        // 메시지 조각 누적
                        messageBuilder.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));

                        // 메시지가 완전히 수신되었을 때만 처리
                        if (result.EndOfMessage)
                        {
                            var completeMessage = messageBuilder.ToString();
                            messageBuilder.Clear();
                            ProcessWebSocketMessage(completeMessage);
                        }
                    }
                    else if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", cancellationTokenSource.Token);
                        isConnected = false;
                    }
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"메시지 수신 오류: {ex.Message}");
                isConnected = false;
            }
        }

        /// <summary>
        /// WebSocket 메시지 처리
        /// </summary>
        private void ProcessWebSocketMessage(string message)
        {
            try
            {
                UpdateStatus($"메시지 수신: {message}");

                // JSON 메시지 파싱
                var messageWrapper = JsonConvert.DeserializeObject<WebSocketMessage>(message);
                if (messageWrapper != null && messageWrapper.type == "revit:command")
                {
                    var commandData = JsonConvert.DeserializeObject<RevitCommand>(messageWrapper.data.ToString());
                    if (commandData != null)
                    {
                        ProcessRevitCommand(commandData);
                    }
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"메시지 처리 오류: {ex.Message}");
            }
        }

        /// <summary>
        /// WebSocket 메시지 전송
        /// </summary>
        private async Task SendWebSocketMessage(object data)
        {
            try
            {
                if (webSocket?.State == WebSocketState.Open)
                {
                    var json = JsonConvert.SerializeObject(data);
                    var buffer = Encoding.UTF8.GetBytes(json);
                    await webSocket.SendAsync(new ArraySegment<byte>(buffer), WebSocketMessageType.Text, true, cancellationTokenSource.Token);
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"메시지 전송 오류: {ex.Message}");
            }
        }

        /// <summary>
        /// Revit 상태 전송
        /// </summary>
        private async Task SendRevitStatus()
        {
            var status = new
            {
                type = "revit:status",
                data = new
                {
                    connected = true,
                    version = "2021",
                    addinVersion = "1.0.0",
                    timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                }
            };

            await SendWebSocketMessage(status);
        }

        /// <summary>
        /// Revit 명령 처리
        /// </summary>
        private void ProcessRevitCommand(RevitCommand command)
        {
            try
            {
                UpdateStatus($"Revit 명령 수신: {command.Action}");
                string nn = command.Action.ToUpper();

                switch (command.Action.ToUpper())
                {
                    case "SELECTWALL":
                        DozeOff();
                        m_behavior = "SELECT_WALL";
                        m_exEvent.Raise();
                        break;
                    case "SELECTMULTIPLEWALLS":
                        DozeOff();
                        m_behavior = "SELECT_MULTIPLE_WALLS";
                        m_exEvent.Raise();
                        break;
                    case "SELECTWALLSBYROOM":
                        DozeOff();
                        m_behavior = "SELECT_WALLROOM";
                        m_exEvent.Raise();
                        break;

                    case "SELECTELEMENTS":
                        m_data.Clear();
                        DozeOff();
                        m_behavior = "SELECT_ELEMENT";
                        m_exEvent.Raise();
                        if (command.Data != null)
                        {
                            var data = command.Data as JObject;
                            if (data?["ElementIds"] != null)
                            {
                                var elementIds = data["ElementIds"].ToObject<List<string>>();
                                m_data.AddRange(elementIds);
                            }
                        }
                        //m_data.AddRange(command.Data.ElementIds);
                        break;

                    case "CREATE_WALL_TYPES":
                        if (command.Data != null)
                        {
                            // 웹에서 받은 벽체 타입 데이터 파싱
                            var wallTypesData = JsonConvert.DeserializeObject<List<WallTypeCreationData>>(command.Data.ToString());
                            wallTypesToCreate = wallTypesData;

                            UpdateStatus($"벽체 타입 생성 요청 받음: {wallTypesData.Count}개");

                            DozeOff();
                            m_behavior = "CREATE_WALL_TYPES";
                            m_exEvent.Raise();
                        }
                        break;

                    case "APPLY_WALL_COLORS":
                        if (command.Data != null)
                        {
                            var data = command.Data as JObject;
                            if (data?["ColorMappings"] != null)
                            {
                                wallColorMappings = data["ColorMappings"].ToObject<List<WallColorMapping>>();
                                UpdateStatus($"벽체 색상 적용 요청 받음: {wallColorMappings.Count}개 타입");
                                DozeOff();
                                m_behavior = "APPLY_WALL_COLORS";
                                m_exEvent.Raise();
                            }
                        }
                        break;

                    case "CLEAR_WALL_COLORS":
                        if (command.Data != null)
                        {
                            var data = command.Data as JObject;
                            if (data?["ElementIds"] != null)
                            {
                                elementsToClearColor = data["ElementIds"].ToObject<List<string>>();
                                UpdateStatus($"벽체 색상 초기화 요청 받음: {elementsToClearColor.Count}개 객체");
                                DozeOff();
                                m_behavior = "CLEAR_WALL_COLORS";
                                m_exEvent.Raise();
                            }
                        }
                        break;

                    case "CREATE_LEGEND_VIEW":
                        if (command.Data != null)
                        {
                            var data = command.Data as JObject;
                            if (data?["LegendItems"] != null)
                            {
                                legendItems = data["LegendItems"].ToObject<List<LegendItem>>();
                                legendViewName = data["ViewName"]?.ToString() ?? "QTO 벽체 범례";
                                UpdateStatus($"범례뷰 생성 요청 받음: {legendItems.Count}개 타입");
                                DozeOff();
                                m_behavior = "CREATE_LEGEND_VIEW";
                                m_exEvent.Raise();
                            }
                        }
                        break;

                    case "DUPLICATE_3D_VIEW_WITH_COLOR":
                        if (command.Data != null)
                        {
                            var data = command.Data as JObject;
                            duplicateViewData = new DuplicateViewData
                            {
                                ViewName = data?["viewName"]?.ToString() ?? "자재 3D 뷰",
                                ElementIds = data?["elementIds"]?.ToObject<List<string>>() ?? new List<string>(),
                                Color = data?["color"]?.ToObject<ColorRGB>() ?? new ColorRGB { R = 255, G = 100, B = 100 }
                            };
                            UpdateStatus($"3D 뷰 복제 요청 받음: {duplicateViewData.ViewName} ({duplicateViewData.ElementIds.Count}개 객체)");
                            DozeOff();
                            m_behavior = "DUPLICATE_3D_VIEW_WITH_COLOR";
                            m_exEvent.Raise();
                        }
                        break;

                    case "GET_REVIT_INFO":
                        SendRevitInfo();
                        break;
                    default:
                        UpdateStatus($"알 수 없는 명령: {command.Action}");
                        break;
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"명령 처리 오류: {ex.Message}");
            }
        }

        /// <summary>
        /// Revit 정보 전송
        /// </summary>
        private async void SendRevitInfo()
        {
            try
            {
                var revitInfo = new
                {
                    type = "revit:info",
                    data = new
                    {
                        connected = true,
                        version = "2021",
                        addinVersion = "1.0.0",
                        documentName = "Unknown", // 실제 문서명으로 교체 필요
                        timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    }
                };

                if (webSocket?.State == WebSocketState.Open)
                {
                    await SendWebSocketMessage(revitInfo);
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"Revit 정보 전송 실패: {ex.Message}");
            }
        }

        /// <summary>
        /// 벽체 데이터를 WebSocket으로 전송
        /// </summary>
        public async void SendWallDataToWeb(List<WallInfo> wallInfos)
        {
            try
            {
                if (webSocket?.State == WebSocketState.Open)
                {
                    var message = new
                    {
                        type = "revit:wallData",
                        data = wallInfos
                    };

                    await SendWebSocketMessage(message);
                    UpdateStatus($"{wallInfos.Count}개 벽체 정보를 웹으로 전송했습니다.");
                }
                else
                {
                    UpdateStatus("WebSocket 연결이 없어 데이터 전송 실패");
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"벽체 데이터 전송 실패: {ex.Message}");
            }
        }

        /// <summary>
        /// WallType 생성 결과를 WebSocket으로 전송
        /// </summary>
        public async void SendWallTypeCreationResult(List<WallTypeCreationResult> results)
        {
            try
            {
                if (webSocket?.State == WebSocketState.Open)
                {
                    // 성공/실패 목록 분리
                    var createdTypes = results.Where(r => r.Success).Select(r => r.WallTypeName).ToList();
                    var failedTypes = results.Where(r => !r.Success)
                        .Select(r => new
                        {
                            WallTypeName = r.WallTypeName,
                            ErrorMessage = r.Message
                        })
                        .ToList();

                    int successCount = createdTypes.Count;
                    int failCount = failedTypes.Count;

                    // 전체 성공 여부 판단
                    bool overallSuccess = failCount == 0;

                    // 메시지 생성
                    string message = overallSuccess
                        ? $"{successCount}개의 벽체 타입이 성공적으로 생성되었습니다."
                        : $"{successCount}개 생성 성공, {failCount}개 생성 실패";

                    var resultData = new
                    {
                        type = "revit:wallTypeResult",
                        data = new
                        {
                            Success = overallSuccess,
                            Message = message,
                            CreatedTypes = createdTypes,
                            FailedTypes = failedTypes,
                            ErrorMessage = failCount > 0 ? string.Join("\n", failedTypes.Select(f => $"- {f.WallTypeName}: {f.ErrorMessage}")) : null
                        }
                    };

                    await SendWebSocketMessage(resultData);
                    UpdateStatus($"{results.Count}개 WallType 생성 결과를 웹으로 전송했습니다.");
                }
                else
                {
                    UpdateStatus("WebSocket 연결이 없어 결과 전송 실패");
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"WallType 결과 전송 실패: {ex.Message}");
            }
        }

        #endregion

        #region Revit To CAD 관련내용들
        public const int WM_COPYDATA = 0x4A;
        [DllImport("User32.dll")]
        public static extern IntPtr FindWindow(String lpClassName, String lpWindowName);

        [DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, ref COPYDATASTRUCT lParam);

        public struct COPYDATASTRUCT
        {
            public IntPtr dwData;
            public int cbData;
            [MarshalAs(UnmanagedType.LPStr)]
            public string lpData;
        }
        protected override void WndProc(ref Message m)
        {
            try
            {
                switch (m.Msg)
                {
                    case WM_COPYDATA:
                        COPYDATASTRUCT cds = (COPYDATASTRUCT)m.GetLParam(typeof(COPYDATASTRUCT));
                        byte[] buff = System.Text.Encoding.Default.GetBytes(cds.lpData);

                        COPYDATASTRUCT cs = new COPYDATASTRUCT();
                        cs.dwData = new IntPtr(0);
                        cs.cbData = buff.Length;
                        cs.lpData = cds.lpData;

                        m_RecieveData = cs.lpData;
                        CreateModelFromDatahub();
                        break;

                    default:
                        base.WndProc(ref m);
                        break;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }

        public static void sendmessagetoCAD(string str)
        {
            try
            {
                Process[] process = Process.GetProcesses();
                foreach (Process proc in process)
                {

                    if (proc.ProcessName.Equals("acad"))
                    {
                        isExecuting = true;
                        break;
                    }

                    else
                        isExecuting = false;
                }

                if (isExecuting)
                {
                    IntPtr hwnd = FindWindow(null, "KiyenoMain");

                    if (hwnd != IntPtr.Zero)
                    {
                        byte[] buff = System.Text.Encoding.Default.GetBytes(str);
                        COPYDATASTRUCT cds = new COPYDATASTRUCT();
                        cds.dwData = new IntPtr(1001);
                        cds.cbData = buff.Length + 1;
                        cds.lpData = str;
                        SendMessage(hwnd, WM_COPYDATA, IntPtr.Zero, ref cds);
                    }
                }
            }

            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }

        #endregion

        private void CreateModelFromDatahub()
        {
            m_behavior = "None";
            m_exEvent.Raise();
        }

        // ExternalEvent와 Handler를 나중에 설정하는 메서드 추가
        public void SetExternalEvent(ExternalEvent exEvent, CustomEventHandler handler)
        {
            m_exEvent = exEvent;
            m_handler = handler;
        }

        public void DozeOff()
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action(() => DozeOff()));
            }
            EnableCommands(false);
        }

        public void WakeUp()
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action(() => WakeUp()));
            }
            EnableCommands(true);
        }

        private void EnableCommands(bool status)
        {
            foreach (System.Windows.Forms.Control ctrl in this.Controls)
            {
                ctrl.Enabled = status;
            }
        }

        #region 메모리정리

        private void QTOForm_FormClosed(object sender, FormClosedEventArgs e)
        {
            try
            {
                // Node.js 서버 프로세스 종료
                StopNodeServer();

                // WebSocket 연결 해제
                if (webSocket != null)
                {
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            cancellationTokenSource?.Cancel();
                            if (webSocket.State == WebSocketState.Open)
                            {
                                await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "애드인 종료", CancellationToken.None);
                            }
                            webSocket?.Dispose();
                            cancellationTokenSource?.Dispose();
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine($"WebSocket 해제 중 오류: {ex.Message}");
                        }
                    });
                }

                // ExternalEvent 해제
                if (m_exEvent != null)
                {
                    m_exEvent.Dispose();
                    m_exEvent = null;
                    m_handler = null;
                }
            }
            catch (Exception ex)
            {
                // 정리 중 발생하는 예외는 무시
                System.Diagnostics.Debug.WriteLine($"폼 정리 중 예외: {ex.Message}");
            }
        }
        private void QTOForm_Load(object sender, EventArgs e)
        {
            try
            {
                UpdateStatus("Kiyeno Revit 애드인 준비 완료");
                UpdateServerStatus("⚪ 서버 대기 중");

                // 초기화만 수행, 서버/웹 자동 시작 제거
                UpdateStatus("✅ 애드인 초기화 완료 - 버튼을 클릭하여 서버를 시작하세요");
            }
            catch (Exception ex)
            {
                UpdateStatus($"애드인 초기화 실패: {ex.Message}");
                UpdateServerStatus("❌ 초기화 실패");
                MessageBox.Show($"애드인 로드 중 오류 발생: {ex.Message}", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        /// <summary>
        /// 웹 서버 실행 확인 및 시작
        /// </summary>
        private async Task EnsureWebServerRunning()
        {
            string webServerUrl = "http://localhost:3000";

            // HTTP 서버와 WebSocket 서버 모두 확인
            bool httpServerReady = await CheckWebServerConnection(webServerUrl);
            bool webSocketServerReady = await CheckWebSocketServerConnection();

            if (!httpServerReady || !webSocketServerReady)
            {
                UpdateStatus("웹 서버를 시작하는 중...");
                bool serverStarted = await StartNodeServer();

                if (!serverStarted)
                {
                    string errorMessage = $"웹 서버를 시작할 수 없습니다.\n\n" +
                                         $"확인사항:\n" +
                                         $"1. Node.js가 설치되어 있는지 확인\n" +
                                         $"2. server.js 파일이 존재하는지 확인\n" +
                                         $"3. 포트 3000, 3001이 사용 가능한지 확인\n\n" +
                                         $"서버 경로: {serverPath}";

                    throw new Exception(errorMessage);
                }

                // 서버 시작 후 연결 재시도
                UpdateStatus("서버 시작 완료, HTTP 서버 확인 중...");
                await Task.Delay(3000); // HTTP 서버 초기화 대기

                if (!await CheckWebServerConnection(webServerUrl))
                {
                    throw new Exception("HTTP 서버가 시작되었지만 연결할 수 없습니다.");
                }

                UpdateStatus("HTTP 서버 확인 완료, WebSocket 서버 확인 중...");
                await Task.Delay(2000); // WebSocket 서버 추가 대기

                if (!await CheckWebSocketServerConnection())
                {
                    throw new Exception("WebSocket 서버가 시작되었지만 연결할 수 없습니다.");
                }
            }

            UpdateStatus("✅ HTTP 서버와 WebSocket 서버 모두 준비 완료");
        }

        private async Task<bool> CheckWebSocketServerConnection()
        {
            try
            {
                using (var testSocket = new ClientWebSocket())
                {
                    var uri = new Uri("ws://localhost:3001/websocket");
                    var cancellationToken = new CancellationTokenSource(TimeSpan.FromSeconds(5)).Token;

                    await testSocket.ConnectAsync(uri, cancellationToken);

                    if (testSocket.State == WebSocketState.Open)
                    {
                        await testSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "연결 테스트 완료", cancellationToken);
                        return true;
                    }

                    return false;
                }
            }
            catch
            {
                return false;
            }
        }

        private async Task<bool> CheckWebServerConnection(string url)
        {
            try
            {
                using (var client = new System.Net.Http.HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(5);
                    var response = await client.GetAsync(url);
                    return response.IsSuccessStatusCode;
                }
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Node.js 서버 시작
        /// </summary>
        private async Task<bool> StartNodeServer()
        {
            try
            {
                // 이미 실행 중인 서버가 있는지 확인
                if (nodeServerProcess != null && !nodeServerProcess.HasExited)
                {
                    return true;
                }

                // server.js 파일 존재 확인
                string serverJsPath = Path.Combine(serverPath, "server.js");
                if (!File.Exists(serverJsPath))
                {
                    UpdateStatus($"server.js 파일을 찾을 수 없습니다: {serverJsPath}");
                    return false;
                }

                // package.json 파일 존재 확인
                string packageJsonPath = Path.Combine(serverPath, "package.json");
                if (!File.Exists(packageJsonPath))
                {
                    UpdateStatus($"package.json 파일을 찾을 수 없습니다: {packageJsonPath}");
                    return false;
                }

                // Node.js 설치 확인
                if (!IsNodeJsInstalled())
                {
                    UpdateStatus("Node.js가 설치되지 않았습니다.");
                    return false;
                }

                // npm 패키지 설치 확인
                string nodeModulesPath = Path.Combine(serverPath, "node_modules");
                if (!Directory.Exists(nodeModulesPath))
                {
                    UpdateStatus("npm 패키지를 설치하는 중...");
                    if (!await InstallNpmPackages())
                    {
                        UpdateStatus("npm 패키지 설치 실패");
                        return false;
                    }
                }

                // Node.js 서버 시작
                UpdateStatus("Node.js 서버 시작 중...");

                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = "node",
                    Arguments = "server.js",
                    WorkingDirectory = serverPath,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    RedirectStandardInput = true
                };

                nodeServerProcess = new Process
                {
                    StartInfo = startInfo,
                    EnableRaisingEvents = true
                };

                // 프로세스 종료 이벤트 핸들러
                nodeServerProcess.Exited += (sender, e) =>
                {
                    UpdateStatus("Node.js 서버가 종료되었습니다.");
                };

                // 출력 이벤트 핸들러 (디버깅용)
                nodeServerProcess.OutputDataReceived += (sender, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        System.Diagnostics.Debug.WriteLine($"[Node.js] {e.Data}");
                    }
                };

                nodeServerProcess.ErrorDataReceived += (sender, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        System.Diagnostics.Debug.WriteLine($"[Node.js Error] {e.Data}");
                    }
                };

                if (!nodeServerProcess.Start())
                {
                    UpdateStatus("Node.js 서버 시작 실패");
                    return false;
                }

                // 출력 읽기 시작
                nodeServerProcess.BeginOutputReadLine();
                nodeServerProcess.BeginErrorReadLine();

                UpdateStatus("Node.js 서버 시작됨 (PID: " + nodeServerProcess.Id + ")");
                return true;
            }
            catch (Exception ex)
            {
                UpdateStatus($"서버 시작 중 오류: {ex.Message}");
                return false;
            }
        }
        /// <summary>
        /// Node.js 서버 종료 (개선된 버전)
        /// </summary>
        private void StopNodeServer()
        {
            try
            {
                if (nodeServerProcess != null && !nodeServerProcess.HasExited)
                {
                    UpdateStatus("Node.js 서버 종료 중...");

                    // 1. 먼저 정상적으로 종료 시도
                    try
                    {
                        nodeServerProcess.CloseMainWindow();

                        // 2. 5초 대기 후 강제 종료
                        if (!nodeServerProcess.WaitForExit(5000))
                        {
                            UpdateStatus("서버 정상 종료 실패, 강제 종료 중...");
                            nodeServerProcess.Kill();

                            // 강제 종료 후 1초 대기
                            nodeServerProcess.WaitForExit(1000);
                        }
                    }
                    catch (Exception killEx)
                    {
                        UpdateStatus($"서버 강제 종료 시도: {killEx.Message}");

                        // 3. 최후 수단: Kill with descendants
                        try
                        {
                            KillProcessAndChildren(nodeServerProcess.Id);
                        }
                        catch (Exception finalEx)
                        {
                            System.Diagnostics.Debug.WriteLine($"최종 서버 종료 실패: {finalEx.Message}");
                        }
                    }

                    nodeServerProcess.Dispose();
                    nodeServerProcess = null;

                    UpdateStatus("✅ Node.js 서버가 종료되었습니다.");
                }

                // 4. 포트 사용 확인 및 정리
                CheckAndKillPortProcesses();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"서버 종료 중 오류: {ex.Message}");
                UpdateStatus($"서버 종료 중 오류 발생: {ex.Message}");
            }
        }

        /// <summary>
        /// 프로세스와 자식 프로세스들을 강제 종료
        /// </summary>
        private void KillProcessAndChildren(int pid)
        {
            try
            {
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = "taskkill",
                    Arguments = $"/F /T /PID {pid}",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                using (Process killProcess = Process.Start(startInfo))
                {
                    killProcess.WaitForExit(3000);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"프로세스 강제 종료 실패: {ex.Message}");
            }
        }

        /// <summary>
        /// 포트 3000, 3001을 사용하는 프로세스 확인 및 종료
        /// </summary>
        private void CheckAndKillPortProcesses()
        {
            try
            {
                string[] ports = { "3000", "3001" };

                foreach (string port in ports)
                {
                    ProcessStartInfo startInfo = new ProcessStartInfo
                    {
                        FileName = "netstat",
                        Arguments = "-ano",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true
                    };

                    using (Process netstatProcess = Process.Start(startInfo))
                    {
                        string output = netstatProcess.StandardOutput.ReadToEnd();
                        string[] lines = output.Split('\n');

                        foreach (string line in lines)
                        {
                            if (line.Contains($":{port}") && line.Contains("LISTENING"))
                            {
                                string[] parts = line.Split(new char[0], StringSplitOptions.RemoveEmptyEntries);
                                if (parts.Length > 4 && int.TryParse(parts[4], out int processId))
                                {
                                    try
                                    {
                                        Process processToKill = Process.GetProcessById(processId);
                                        if (processToKill.ProcessName.ToLower().Contains("node"))
                                        {
                                            UpdateStatus($"포트 {port}의 Node.js 프로세스 {processId} 종료 중...");
                                            processToKill.Kill();
                                        }
                                    }
                                    catch (Exception ex)
                                    {
                                        System.Diagnostics.Debug.WriteLine($"포트 {port} 프로세스 종료 실패: {ex.Message}");
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"포트 정리 중 오류: {ex.Message}");
            }
        }
        /// <summary>
        /// Node.js 설치 여부 확인
        /// </summary>
        private bool IsNodeJsInstalled()
        {
            try
            {
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = "node",
                    Arguments = "--version",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true
                };

                using (Process process = Process.Start(startInfo))
                {
                    process.WaitForExit(5000);
                    return process.ExitCode == 0;
                }
            }
            catch
            {
                return false;
            }
        }
        /// <summary>
        /// npm 패키지 설치
        /// </summary>
        private async Task<bool> InstallNpmPackages()
        {
            try
            {
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = "npm",
                    Arguments = "install",
                    WorkingDirectory = serverPath,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                using (Process process = Process.Start(startInfo))
                {
                    await Task.Run(() => process.WaitForExit(60000)); // 60초 타임아웃
                    return process.ExitCode == 0;
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"npm 설치 중 오류: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// 브라우저에서 웹페이지 자동 실행
        /// </summary>
        private async Task OpenWebPageInBrowser()
        {
            try
            {
                string webPageUrl = "http://localhost:3000";
                UpdateStatus("브라우저에서 웹페이지 실행 중...");

                // 기본 브라우저로 웹페이지 열기
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = webPageUrl,
                    UseShellExecute = true // 기본 브라우저 사용
                };

                Process.Start(startInfo);
                UpdateStatus("✅ 웹페이지가 브라우저에서 실행되었습니다.");

                // 브라우저 실행 후 약간의 지연
                await Task.Delay(1000);
            }
            catch (Exception ex)
            {
                UpdateStatus($"브라우저 실행 실패: {ex.Message}");
                // 브라우저 실행 실패는 치명적이지 않으므로 예외를 던지지 않음
            }
        }

        public void UpdateStatus(string message)
        {
            try
            {
                if (this.InvokeRequired)
                {
                    this.Invoke(new Action(() => UpdateStatus(message)));
                    return;
                }

                if (statusLabel != null)
                {
                    statusLabel.Text = message;
                }

                // 디버그 출력도 추가
                System.Diagnostics.Debug.WriteLine($"[QTO Status] {message}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"상태 업데이트 실패: {ex.Message}");
            }
        }

        /// <summary>
        /// 서버 상태 전용 라벨 업데이트
        /// </summary>
        public void UpdateServerStatus(string message)
        {
            try
            {
                if (this.InvokeRequired)
                {
                    this.Invoke(new Action(() => UpdateServerStatus(message)));
                    return;
                }

                // serverstatus 라벨 찾아서 업데이트
                System.Windows.Forms.Control[] controls = this.Controls.Find("serverstatus", true);
                if (controls.Length > 0 && controls[0] is Label serverStatusLabel)
                {
                    serverStatusLabel.Text = message;
                }

                // 디버그 출력
                System.Diagnostics.Debug.WriteLine($"[Server Status] {message}");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"서버 상태 업데이트 실패: {ex.Message}");
            }
        }
        #endregion

        private async void ExToolStripMenuItem_Click(object sender, EventArgs e)
        {
            try
            {
                UpdateServerStatus("🟡 서버 시작 중...");

                // 웹 서버 시작
                await EnsureWebServerRunning();

                UpdateServerStatus("🟢 서버 준비완료 → 웹연결 클릭");
                UpdateStatus("✅ 서버가 성공적으로 시작되었습니다.");
            }
            catch (Exception ex)
            {
                UpdateServerStatus("🔴 서버 시작 실패");
                UpdateStatus($"❌ 서버 시작 실패: {ex.Message}");
                MessageBox.Show($"서버 시작 중 오류가 발생했습니다:\n{ex.Message}", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        private async void ExExToolStripMenuItem_Click(object sender, EventArgs e)
        {
            try
            {
                UpdateServerStatus("🔗 웹 연결 시작 중...");

                // WebSocket 연결
                await ConnectToWebSocket();

                // 브라우저에서 웹페이지 실행
                await OpenWebPageInBrowser();

                UpdateServerStatus("✅ 웹 연결 완료");
                UpdateStatus("✅ 웹페이지가 실행되고 Revit과 연결되었습니다.");
            }
            catch (Exception ex)
            {
                UpdateServerStatus("❌ 웹 연결 실패");
                UpdateStatus($"❌ 웹 연결 실패: {ex.Message}");
                MessageBox.Show($"웹 연결 중 오류가 발생했습니다:\n{ex.Message}", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        /// <summary>
        /// 정보확인 버튼 - Revit에서 선택된 요소의 정보를 웹앱으로 전송
        /// </summary>
        private void button1_Click(object sender, EventArgs e)
        {
            try
            {
                UpdateStatus("Revit 선택 요소 확인 중...");

                // 현재 선택된 요소들을 Revit에서 가져와서 웹으로 전송
                DozeOff();
                m_behavior = "SEND_SELECTION_TO_WEB";
                m_exEvent.Raise();
            }
            catch (Exception ex)
            {
                UpdateStatus($"선택 요소 확인 실패: {ex.Message}");
                MessageBox.Show($"선택 요소 확인 중 오류가 발생했습니다:\n{ex.Message}",
                              "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        /// <summary>
        /// 선택된 요소의 ElementID들을 WebSocket으로 웹앱에 전송
        /// </summary>
        public async void SendSelectedElementsToWeb(List<string> elementIds)
        {
            try
            {
                if (webSocket?.State == WebSocketState.Open && elementIds?.Count > 0)
                {
                    var message = new
                    {
                        type = "revit:elementSelected",
                        data = new
                        {
                            elementIds = elementIds,
                            timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                            action = "elementSelected",
                            count = elementIds.Count
                        }
                    };

                    await SendWebSocketMessage(message);
                    UpdateStatus($"{elementIds.Count}개 선택 요소 정보를 웹으로 전송했습니다.");
                }
                else if (elementIds?.Count == 0)
                {
                    UpdateStatus("선택된 요소가 없습니다.");
                }
                else
                {
                    UpdateStatus("WebSocket 연결이 없어 선택 요소 전송 실패");
                }
            }
            catch (Exception ex)
            {
                UpdateStatus($"선택 요소 전송 실패: {ex.Message}");
            }
        }
    }

    // WebSocket 메시지 클래스들
    public class WebSocketMessage
    {
        public string type { get; set; }
        public object data { get; set; }
    }
    public class RevitCommand
    {
        public string Action { get; set; }
        public object Data { get; set; }
        public bool IsSimpleMode { get; set; }
        public string RequestId { get; set; }
        public string[] ElementIds { get; set; }
    }
    // 벽체 정보 클래스 (간소화된 버전)
    public class WallInfo
    {
        public string Id { get; set; }           // Revit 요소 ID
        public string Name { get; set; }         // 벽체 실명 (Name)
        public double Length { get; set; }       // 길이
        public double Area { get; set; }         // 면적
        public double Height { get; set; }       // 높이
        public double Thickness { get; set; }    // 두께
        public string Level { get; set; }        // 레벨 이름
        public string Category { get; set; }     // 카테고리 이름
        public string RoomName { get; set; }     // 실명 (룸 이름)
    }
    public class LayerData
    {
        public string MaterialName { get; set; }
        public double Thickness { get; set; }
        public int Function { get; set; } // 0: Structure, 1: Substrate, 2: Thermal, 3: Membrane, 4: Finish1, 5: Finish2
        public bool IsVariable { get; set; } = false;
        public string Description { get; set; }
    }
    // 웹페이지 메시지 클래스들
    public class WebMessage
    {
        public string action { get; set; }
    }
    public class WebCreateWallTypesMessage : WebMessage
    {
        public List<WallTypeCreationData> wallTypes { get; set; }
        public bool isSimpleMode { get; set; } = false;
    }
    public class CustomEventHandler : IExternalEventHandler
    {
        private QTOForm form;

        public CustomEventHandler(QTOForm form)
        {
            this.form = form;
        }

        public void Execute(UIApplication app)
        {
            Document m_doc = app.ActiveUIDocument.Document;
            UIDocument m_uidoc = app.ActiveUIDocument;

            try
            {
                if (QTOForm.m_behavior == "SELECT_WALL")
                {
                    SelectSingleWall(m_uidoc, m_doc);
                }
                else if (QTOForm.m_behavior == "SELECT_MULTIPLE_WALLS")
                {
                    SelectMultipleWalls(m_uidoc, m_doc);
                }
                else if (QTOForm.m_behavior == "SELECT_WALLROOM")
                {
                    SelectROOMWalls(m_uidoc, m_doc);
                }
                else if (QTOForm.m_behavior == "SELECT_ELEMENT")
                {
                    SelectWalls(m_uidoc, m_doc);
                }
                else if (QTOForm.m_behavior == "SEND_SELECTION_TO_WEB")
                {
                    SendCurrentSelectionToWeb(m_uidoc, m_doc);
                }

                else if (QTOForm.m_behavior == "CREATE_WALL_TYPES")
                {
                    CreateWallTypesInRevit(m_doc, app);
                }
                else if (QTOForm.m_behavior == "APPLY_WALL_COLORS")
                {
                    ApplyWallColors(m_uidoc, m_doc);
                }
                else if (QTOForm.m_behavior == "CLEAR_WALL_COLORS")
                {
                    ClearWallColors(m_uidoc, m_doc);
                }
                else if (QTOForm.m_behavior == "CREATE_LEGEND_VIEW")
                {
                    CreateLegendView(m_uidoc, m_doc);
                }
                else if (QTOForm.m_behavior == "DUPLICATE_3D_VIEW_WITH_COLOR")
                {
                    DuplicateViewWithColor(m_uidoc, m_doc);
                }

                else if (QTOForm.m_behavior == "None")
                {
                    var data = JsonConvert.DeserializeObject<DataHubList>(QTOForm.m_RecieveData);

                    if (data.Title == "get_level_inforCAD")
                    {
                        List<string> m_LevelListNames = new List<string>();
                        foreach (Level le in Util.GetLevelListByElvation(m_doc))
                        {
                            m_LevelListNames.Add(le.Name);
                        }

                        DataHubList dl = new DataHubList();
                        dl.Title = "LevelNames";
                        dl.m_LevelNameData = m_LevelListNames;

                        string Tojsonstring = JsonConvert.SerializeObject(dl);
                        sendmessagetoCAD(Tojsonstring);
                    }
                    else if (data.Title == "Create Wall CAD")
                    {
                        CADLineWallData cd = new CADLineWallData(data.m_WallCurveData, m_doc, m_uidoc);
                        cd.Create();
                    }
                }
            }
            catch (Exception ex)
            {
                TaskDialog.Show("오류", $"작업 중 오류 발생: {ex.Message}");
            }
            finally
            {
                form?.WakeUp();
            }
        }

        /// <summary>
        /// Revit에서 벽체 타입 생성
        /// </summary>
        private void CreateWallTypesInRevit(Document doc, UIApplication app)
        {
            var results = new List<WallTypeCreationResult>();

            try
            {
                var wallTypesToCreate = QTOForm.wallTypesToCreate;

                if (wallTypesToCreate == null || wallTypesToCreate.Count == 0)
                {
                    TaskDialog.Show("알림", "생성할 벽체 타입 데이터가 없습니다.");
                    return;
                }

                // 각 벽체 타입별 개별 트랜잭션으로 생성
                foreach (var wallData in wallTypesToCreate)
                {
                    using (Transaction trans = new Transaction(doc, $"벽체 타입 생성: {wallData.WallTypeName}"))
                    {
                        try
                        {
                            trans.Start();

                            // WallTypeCreate 클래스를 통해 벽체 타입 생성
                            var creator = new WallTypeCreate(doc);
                            var result = creator.CreateWallType(wallData);

                            results.Add(result);

                            // 성공 시 커밋, 실패 시 롤백
                            if (result.Success)
                            {
                                trans.Commit();
                                form?.UpdateStatus($"✅ {result.WallTypeName} 생성 완료");
                            }
                            else
                            {
                                trans.RollBack();
                                form?.UpdateStatus($"❌ {result.WallTypeName} 생성 실패: {result.Message}");
                            }
                        }
                        catch (Exception ex)
                        {
                            // 트랜잭션이 시작된 상태라면 롤백
                            if (trans.HasStarted())
                                trans.RollBack();

                            // 개별 벽체 타입 생성 실패 시
                            results.Add(new WallTypeCreationResult
                            {
                                WallTypeName = wallData.WallTypeName,
                                Success = false,
                                Message = $"생성 중 오류 발생: {ex.Message}"
                            });

                            form?.UpdateStatus($"❌ {wallData.WallTypeName} 오류: {ex.Message}");
                        }
                    }
                }

                // 결과 요약
                int successCount = results.Count(r => r.Success);
                int failCount = results.Count - successCount;

                var summaryBuilder = new StringBuilder();
                summaryBuilder.AppendLine($"벽체 타입 생성 완료\n");
                summaryBuilder.AppendLine($"성공: {successCount}개");
                summaryBuilder.AppendLine($"실패: {failCount}개");

                // 실패한 벽체 타입 상세 정보
                if (failCount > 0)
                {
                    summaryBuilder.AppendLine("\n[실패 상세]");
                    foreach (var failed in results.Where(r => !r.Success))
                    {
                        summaryBuilder.AppendLine($"• {failed.WallTypeName}: {failed.Message}");
                    }
                }

                TaskDialog.Show("생성 결과", summaryBuilder.ToString());

                // 웹으로 결과 전송
                form?.SendWallTypeCreationResult(results);
            }
            catch (Exception ex)
            {
                TaskDialog.Show("오류", $"벽체 타입 생성 중 오류 발생:\n{ex.Message}");

                // 전체 실패 결과 전송
                if (results.Count == 0)
                {
                    results.Add(new WallTypeCreationResult
                    {
                        WallTypeName = "전체",
                        Success = false,
                        Message = $"전체 생성 실패: {ex.Message}"
                    });
                }

                form?.SendWallTypeCreationResult(results);
            }
        }

        private void SelectSingleWall(UIDocument uidoc, Document doc)
        {
            try
            {
                Selection selection = uidoc.Selection;
                Reference reference = selection.PickObject(ObjectType.Element, new WallSelectionFilter(), "벽체를 선택하세요");

                if (reference != null)
                {
                    Wall wall = doc.GetElement(reference) as Wall;
                    if (wall != null)
                    {
                        var wallInfo = ExtractWallInfo(wall, doc);
                        // 단일 벽체 선택 시 실명은 빈 문자열 (웹에서 입력받을 예정)
                        wallInfo.RoomName = "";

                        QTOForm.selectedWalls.Clear();
                        QTOForm.selectedWalls.Add(wallInfo);

                        // WebSocket으로 데이터 전송
                        form?.SendWallDataToWeb(QTOForm.selectedWalls);
                    }
                }
            }
            catch (Autodesk.Revit.Exceptions.OperationCanceledException)
            {
                // 사용자가 선택 취소
            }
        }

        private void SelectMultipleWalls(UIDocument uidoc, Document doc)
        {
            try
            {
                Selection selection = uidoc.Selection;
                IList<Reference> references = selection.PickObjects(ObjectType.Element, new WallSelectionFilter(), "벽체들을 선택하세요 (완료하려면 Finish 클릭)");

                if (references != null && references.Count > 0)
                {
                    QTOForm.selectedWalls.Clear();

                    foreach (Reference reference in references)
                    {
                        Wall wall = doc.GetElement(reference) as Wall;
                        if (wall != null)
                        {
                            var wallInfo = ExtractWallInfo(wall, doc);
                            // 다중 벽체 선택 시 실명은 빈 문자열 (웹에서 입력받을 예정)
                            wallInfo.RoomName = "";
                            QTOForm.selectedWalls.Add(wallInfo);
                        }
                    }

                    // WebSocket으로 데이터 전송
                    form?.SendWallDataToWeb(QTOForm.selectedWalls);
                }
            }
            catch (Autodesk.Revit.Exceptions.OperationCanceledException)
            {
                // 사용자가 선택 취소
            }
        }

        private void SelectROOMWalls(UIDocument uidoc, Document doc)
        {
            try
            {
                Selection selection = uidoc.Selection;
                // 1. 룸 선택
                Reference roomRef = selection.PickObject(ObjectType.Element, new RoomSelectionFilter(), "룸을 선택하세요");

                if (roomRef != null)
                {
                    Room selectedRoom = doc.GetElement(roomRef) as Room;
                    if (selectedRoom != null)
                    {
                        string roomName = selectedRoom.Name;

                        // 2. 룸 경계의 벽체들 수집
                        var roomWalls = GetWallsFromRoom(selectedRoom, doc);

                        if (roomWalls.Count > 0)
                        {
                            QTOForm.selectedWalls.Clear();

                            // 3. 벽체 데이터 생성 (실명 포함)
                            foreach (Wall wall in roomWalls)
                            {
                                var wallInfo = ExtractWallInfo(wall, doc);
                                wallInfo.RoomName = roomName; // 실명 자동 설정
                                QTOForm.selectedWalls.Add(wallInfo);
                            }

                            // 4. 웹으로 데이터 전송
                            form?.SendWallDataToWeb(QTOForm.selectedWalls);
                            //TaskDialog.Show("완료", $"룸 '{roomName}'에서 {roomWalls.Count}개의 벽체를 선택했습니다.");
                        }
                        else
                        {
                            TaskDialog.Show("알림", "선택된 룸에 연결된 벽체가 없습니다.");
                        }
                    }
                }
            }
            catch (Autodesk.Revit.Exceptions.OperationCanceledException)
            {
                // 사용자가 선택 취소
            }
            catch (Exception ex)
            {
                TaskDialog.Show("오류", $"룸 벽체 선택 중 오류 발생: {ex.Message}");
            }
        }

        private void SelectWalls(UIDocument uidoc, Document doc)
        {
            try
            {
                List<ElementId> idx = new List<ElementId>();
                foreach (string item in m_data)
                {
                    int t = Convert.ToInt32(item);
                    ElementId id = new ElementId(t);
                    if (id != null)
                    {
                        idx.Add(id);
                    }
                }
                if (idx.Count > 0)
                {
                    uidoc.Selection.SetElementIds(idx);
                    uidoc.ShowElements(idx);
                }
            }
            catch (Autodesk.Revit.Exceptions.OperationCanceledException)
            {
                // 사용자가 선택 취소
            }
            catch (Exception ex)
            {
                TaskDialog.Show("오류", $"룸 벽체 선택 중 오류 발생: {ex.Message}");
            }
        }


        private WallInfo ExtractWallInfo(Wall wall, Document doc)
        {
            var wallInfo = new WallInfo
            {
                Id = wall.Id.ToString(),
                Name = wall.Name,
                Level = doc.GetElement(wall.LevelId)?.Name ?? "알 수 없음",
                Category = wall.Category?.Name ?? "벽",
                RoomName = "" // 기본값은 빈 문자열 (웹에서 입력받을 예정)
            };

            // 벽체 기하학적 정보 추출 (필수 데이터만)
            try
            {
                // 높이
                wallInfo.Height = UnitUtils.ConvertFromInternalUnits(
                    wall.get_Parameter(BuiltInParameter.WALL_USER_HEIGHT_PARAM)?.AsDouble() ?? 0,
                    UnitTypeId.Meters);

                // 면적
                wallInfo.Area = UnitUtils.ConvertFromInternalUnits(
                    wall.get_Parameter(BuiltInParameter.HOST_AREA_COMPUTED)?.AsDouble() ?? 0,
                    UnitTypeId.SquareMeters);

                // 길이 계산
                LocationCurve locationCurve = wall.Location as LocationCurve;
                if (locationCurve != null)
                {
                    wallInfo.Length = UnitUtils.ConvertFromInternalUnits(
                        locationCurve.Curve.Length,
                        UnitTypeId.Meters);
                }

                // 두께
                wallInfo.Thickness = UnitUtils.ConvertFromInternalUnits(
                    wall.Width,
                    UnitTypeId.Meters);
            }
            catch (Exception ex)
            {
                // 오류 발생 시 기본값 유지
                System.Diagnostics.Debug.WriteLine($"벽체 정보 추출 중 오류: {ex.Message}");
            }

            return wallInfo;
        }

        /// <summary>
        /// 룸에서 경계 벽체들을 가져오는 메서드
        /// </summary>
        /// <summary>
        /// 현재 Revit에서 선택된 요소들의 ID를 웹앱으로 전송
        /// </summary>
        private void SendCurrentSelectionToWeb(UIDocument uidoc, Document doc)
        {
            try
            {
                // 현재 선택된 요소들 가져오기
                Selection selection = uidoc.Selection;
                ICollection<ElementId> selectedIds = selection.GetElementIds();

                if (selectedIds.Count == 0)
                {
                    TaskDialog.Show("알림", "선택된 요소가 없습니다.\n먼저 Revit에서 요소를 선택한 후 '정보확인' 버튼을 클릭하세요.");
                    return;
                }

                // ElementId를 문자열 리스트로 변환
                List<string> elementIdStrings = new List<string>();
                foreach (ElementId elementId in selectedIds)
                {
                    elementIdStrings.Add(elementId.ToString());
                }

                // 선택된 요소들의 정보 로깅
                System.Diagnostics.Debug.WriteLine($"선택된 요소 개수: {elementIdStrings.Count}");
                foreach (string id in elementIdStrings)
                {
                    System.Diagnostics.Debug.WriteLine($"ElementID: {id}");
                }

                // 웹앱으로 전송
                form?.SendSelectedElementsToWeb(elementIdStrings);

                // 사용자에게 피드백
                //TaskDialog.Show("완료", $"{elementIdStrings.Count}개의 선택된 요소 정보를 웹앱으로 전송했습니다.");
            }
            catch (Exception ex)
            {
                TaskDialog.Show("오류", $"선택 요소 전송 중 오류 발생: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"SendCurrentSelectionToWeb 오류: {ex.Message}");
            }
        }

        /// <summary>
        /// 룸에서 경계 벽체들을 가져오는 메서드
        /// </summary>
        private List<Wall> GetWallsFromRoom(Room room, Document doc)
        {
            var walls = new List<Wall>();

            try
            {
                // 룸의 경계 세그먼트들을 가져옴
                IList<IList<BoundarySegment>> boundarySegments = room.GetBoundarySegments(
                    new SpatialElementBoundaryOptions()
                );

                if (boundarySegments != null)
                {
                    foreach (IList<BoundarySegment> segmentList in boundarySegments)
                    {
                        foreach (BoundarySegment segment in segmentList)
                        {
                            // 경계 요소 가져오기
                            Element boundaryElement = doc.GetElement(segment.ElementId);

                            // 벽체인 경우만 리스트에 추가
                            if (boundaryElement is Wall wall)
                            {
                                // 중복 방지
                                if (!walls.Any(w => w.Id.Value == wall.Id.Value))
                                {
                                    walls.Add(wall);
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"룸 벽체 추출 중 오류: {ex.Message}");
            }

            return walls;
        }

        /// <summary>
        /// 벽체에 색상 적용
        /// </summary>
        private void ApplyWallColors(UIDocument uidoc, Document doc)
        {
            try
            {
                var colorMappings = QTOForm.wallColorMappings;
                if (colorMappings == null || colorMappings.Count == 0)
                {
                    form?.UpdateStatus("적용할 색상 데이터가 없습니다.");
                    return;
                }

                Autodesk.Revit.DB.View activeView = doc.ActiveView;
                int successCount = 0;

                using (Transaction trans = new Transaction(doc, "벽체 색상 적용"))
                {
                    trans.Start();

                    foreach (var mapping in colorMappings)
                    {
                        // Revit Color 생성
                        Autodesk.Revit.DB.Color revitColor = new Autodesk.Revit.DB.Color(
                            (byte)mapping.Color.R,
                            (byte)mapping.Color.G,
                            (byte)mapping.Color.B
                        );

                        // 그래픽 오버라이드 설정
                        OverrideGraphicSettings ogs = new OverrideGraphicSettings();

                        // 1. 표면(Surface) 색상 설정 - 3D 뷰, 입면도 등
                        ogs.SetSurfaceForegroundPatternColor(revitColor);
                        ogs.SetSurfaceBackgroundPatternColor(revitColor);

                        // 2. 절단면(Cut) 색상 설정 - 평면도, 단면도 등
                        ogs.SetCutForegroundPatternColor(revitColor);
                        ogs.SetCutBackgroundPatternColor(revitColor);

                        // 솔리드 패턴 적용
                        FillPatternElement solidPattern = GetSolidFillPattern(doc);
                        if (solidPattern != null)
                        {
                            // 표면 패턴
                            ogs.SetSurfaceForegroundPatternId(solidPattern.Id);
                            ogs.SetSurfaceBackgroundPatternId(solidPattern.Id);

                            // 절단면 패턴
                            ogs.SetCutForegroundPatternId(solidPattern.Id);
                            ogs.SetCutBackgroundPatternId(solidPattern.Id);
                        }

                        // 투명도 설정 (30%)
                        //ogs.SetSurfaceTransparency(30);

                        // 각 ElementId에 오버라이드 적용
                        foreach (string elementIdStr in mapping.ElementIds)
                        {
                            if (int.TryParse(elementIdStr, out int id))
                            {
                                ElementId elemId = new ElementId(id);
                                if (doc.GetElement(elemId) != null)
                                {
                                    activeView.SetElementOverrides(elemId, ogs);
                                    successCount++;
                                }
                            }
                        }
                    }

                    trans.Commit();
                }

                form?.UpdateStatus($"✅ 색상 적용 완료: {successCount}개 객체");
            }
            catch (Exception ex)
            {
                form?.UpdateStatus($"❌ 색상 적용 오류: {ex.Message}");
            }
        }

        /// <summary>
        /// 3D 뷰 복제 후 지정 객체에 색상 오버라이드 적용 (자재별 개별 뷰)
        /// </summary>
        private void DuplicateViewWithColor(UIDocument uidoc, Document doc)
        {
            try
            {
                var viewData = QTOForm.duplicateViewData;
                if (viewData == null)
                {
                    MessageBox.Show("복제할 뷰 데이터가 없습니다.", "오류", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                Autodesk.Revit.DB.View activeView = doc.ActiveView;
                View3D targetView = null;
                int successCount = 0;
                string targetViewName = viewData.ViewName; // 자재명이 곧 뷰 이름 (예: "C-STUD 50형")

                // 1. 동일 이름의 기존 3D 뷰 검색
                targetView = new FilteredElementCollector(doc)
                    .OfClass(typeof(View3D))
                    .Cast<View3D>()
                    .FirstOrDefault(v => v.Name == targetViewName && !v.IsTemplate);

                using (Transaction trans = new Transaction(doc, $"자재 색상 적용: {targetViewName}"))
                {
                    trans.Start();

                    if (targetView == null)
                    {
                        // 기존 뷰 없음 → 새로 복제
                        View3D source3DView = activeView as View3D;
                        if (source3DView == null)
                        {
                            trans.RollBack();
                            MessageBox.Show("현재 활성 뷰가 3D 뷰가 아닙니다.\n3D 뷰를 활성화한 후 다시 시도하세요.", "3D 뷰 필요", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                            return;
                        }

                        ElementId newViewId = source3DView.Duplicate(ViewDuplicateOption.Duplicate);
                        targetView = doc.GetElement(newViewId) as View3D;

                        if (targetView == null)
                        {
                            trans.RollBack();
                            MessageBox.Show("3D 뷰 복제에 실패했습니다.", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                            return;
                        }

                        try { targetView.Name = targetViewName; } catch { }
                    }

                    // 뷰 내 모든 벽체 색상 리셋
                    OverrideGraphicSettings resetOgs = new OverrideGraphicSettings();
                    FilteredElementCollector wallCollector = new FilteredElementCollector(doc, targetView.Id);
                    wallCollector.OfCategory(BuiltInCategory.OST_Walls);
                    foreach (Element wall in wallCollector)
                    {
                        targetView.SetElementOverrides(wall.Id, resetOgs);
                    }

                    // 색상 적용
                    FillPatternElement solidPattern = GetSolidFillPattern(doc);

                    Autodesk.Revit.DB.Color revitColor = new Autodesk.Revit.DB.Color(
                        (byte)viewData.Color.R,
                        (byte)viewData.Color.G,
                        (byte)viewData.Color.B
                    );

                    OverrideGraphicSettings ogs = new OverrideGraphicSettings();
                    ogs.SetSurfaceForegroundPatternColor(revitColor);
                    ogs.SetSurfaceBackgroundPatternColor(revitColor);
                    ogs.SetCutForegroundPatternColor(revitColor);
                    ogs.SetCutBackgroundPatternColor(revitColor);

                    if (solidPattern != null)
                    {
                        ogs.SetSurfaceForegroundPatternId(solidPattern.Id);
                        ogs.SetSurfaceBackgroundPatternId(solidPattern.Id);
                        ogs.SetCutForegroundPatternId(solidPattern.Id);
                        ogs.SetCutBackgroundPatternId(solidPattern.Id);
                    }

                    foreach (string elementIdStr in viewData.ElementIds)
                    {
                        if (int.TryParse(elementIdStr, out int id))
                        {
                            ElementId elemId = new ElementId(id);
                            if (doc.GetElement(elemId) != null)
                            {
                                targetView.SetElementOverrides(elemId, ogs);
                                successCount++;
                            }
                        }
                    }

                    trans.Commit();
                }

                // 뷰 전환
                uidoc.ActiveView = targetView;

                form?.UpdateStatus($"✅ 색상 적용 완료: \"{targetViewName}\" ({successCount}개 객체)");

                // 개별 색상표 생성 (3D 뷰와 동일 이름)
                CreateMaterialColorLegend(uidoc, doc, targetViewName, viewData.Color);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"3D 뷰 색상 적용 오류:\n{ex.Message}", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                form?.UpdateStatus($"❌ 3D 뷰 색상 적용 오류: {ex.Message}");
            }
        }

        /// <summary>
        /// 자재별 개별 색상표 생성 (3D 뷰와 동일한 이름의 제도뷰)
        /// </summary>
        private void CreateMaterialColorLegend(UIDocument uidoc, Document doc, string materialName, ColorRGB color)
        {
            try
            {
                // 기존 동일 이름 제도뷰 삭제
                ViewDrafting existingView = new FilteredElementCollector(doc)
                    .OfClass(typeof(ViewDrafting))
                    .Cast<ViewDrafting>()
                    .FirstOrDefault(v => v.Name == materialName);

                if (existingView != null)
                {
                    using (Transaction deleteTrans = new Transaction(doc, $"기존 색상표 삭제: {materialName}"))
                    {
                        deleteTrans.Start();
                        doc.Delete(existingView.Id);
                        deleteTrans.Commit();
                    }
                }

                using (Transaction trans = new Transaction(doc, $"색상표 생성: {materialName}"))
                {
                    trans.Start();

                    ViewFamilyType draftingViewType = new FilteredElementCollector(doc)
                        .OfClass(typeof(ViewFamilyType))
                        .Cast<ViewFamilyType>()
                        .FirstOrDefault(vft => vft.ViewFamily == ViewFamily.Drafting);

                    if (draftingViewType == null)
                    {
                        trans.RollBack();
                        form?.UpdateStatus("❌ 제도 뷰 타입을 찾을 수 없습니다.");
                        return;
                    }

                    ViewDrafting draftingView = ViewDrafting.Create(doc, draftingViewType.Id);
                    draftingView.Name = materialName;
                    draftingView.Scale = 50;

                    FillPatternElement solidPattern = GetSolidFillPattern(doc);

                    TextNoteType textType = new FilteredElementCollector(doc)
                        .OfClass(typeof(TextNoteType))
                        .Cast<TextNoteType>()
                        .OrderBy(t => t.get_Parameter(BuiltInParameter.TEXT_SIZE)?.AsDouble() ?? 0)
                        .FirstOrDefault();

                    if (textType == null)
                    {
                        trans.RollBack();
                        form?.UpdateStatus("❌ 텍스트 타입을 찾을 수 없습니다.");
                        return;
                    }

                    double boxWidth = 750.0 / 304.8;
                    double boxHeight = 450.0 / 304.8;
                    double textOffset = 150.0 / 304.8;

                    CurveLoop curveLoop = new CurveLoop();
                    XYZ p1 = new XYZ(0, 0, 0);
                    XYZ p2 = new XYZ(boxWidth, 0, 0);
                    XYZ p3 = new XYZ(boxWidth, -boxHeight, 0);
                    XYZ p4 = new XYZ(0, -boxHeight, 0);

                    curveLoop.Append(Line.CreateBound(p1, p2));
                    curveLoop.Append(Line.CreateBound(p2, p3));
                    curveLoop.Append(Line.CreateBound(p3, p4));
                    curveLoop.Append(Line.CreateBound(p4, p1));

                    FilledRegionType filledRegionType = GetOrCreateFilledRegionType(doc, color, solidPattern);
                    if (filledRegionType != null)
                    {
                        FilledRegion.Create(doc, filledRegionType.Id, draftingView.Id, new List<CurveLoop> { curveLoop });
                    }

                    XYZ textPosition = new XYZ(boxWidth + textOffset, -boxHeight / 2, 0);
                    TextNoteOptions textOptions = new TextNoteOptions
                    {
                        TypeId = textType.Id,
                        HorizontalAlignment = HorizontalTextAlignment.Left
                    };
                    TextNote.Create(doc, draftingView.Id, textPosition, materialName, textOptions);

                    trans.Commit();

                    form?.UpdateStatus($"✅ 색상표 생성 완료: \"{materialName}\"");
                }
            }
            catch (Exception ex)
            {
                form?.UpdateStatus($"❌ 색상표 생성 오류: {ex.Message}");
            }
        }

        /// <summary>
        /// 솔리드 채우기 패턴 가져오기
        /// </summary>
        private FillPatternElement GetSolidFillPattern(Document doc)
        {
            FilteredElementCollector collector = new FilteredElementCollector(doc);
            collector.OfClass(typeof(FillPatternElement));

            foreach (FillPatternElement fpe in collector)
            {
                FillPattern fp = fpe.GetFillPattern();
                if (fp != null && fp.IsSolidFill)
                {
                    return fpe;
                }
            }

            return null;
        }

        /// <summary>
        /// 벽체 색상 초기화
        /// </summary>
        private void ClearWallColors(UIDocument uidoc, Document doc)
        {
            try
            {
                var elementIds = QTOForm.elementsToClearColor;
                if (elementIds == null || elementIds.Count == 0)
                {
                    form?.UpdateStatus("초기화할 객체가 없습니다.");
                    return;
                }

                Autodesk.Revit.DB.View activeView = doc.ActiveView;
                int successCount = 0;

                using (Transaction trans = new Transaction(doc, "벽체 색상 초기화"))
                {
                    trans.Start();

                    // 기본 오버라이드 설정 (모든 오버라이드 제거)
                    OverrideGraphicSettings defaultOgs = new OverrideGraphicSettings();

                    foreach (string elementIdStr in elementIds)
                    {
                        if (int.TryParse(elementIdStr, out int id))
                        {
                            ElementId elemId = new ElementId(id);
                            if (doc.GetElement(elemId) != null)
                            {
                                activeView.SetElementOverrides(elemId, defaultOgs);
                                successCount++;
                            }
                        }
                    }

                    trans.Commit();
                }

                // 초기화 후 리스트 클리어
                QTOForm.elementsToClearColor.Clear();

                form?.UpdateStatus($"✅ 색상 초기화 완료: {successCount}개 객체");
            }
            catch (Exception ex)
            {
                form?.UpdateStatus($"❌ 색상 초기화 오류: {ex.Message}");
            }
        }

        /// <summary>
        /// 범례뷰 생성 (Drafting View 사용)
        /// </summary>
        private void CreateLegendView(UIDocument uidoc, Document doc)
        {
            try
            {
                var items = QTOForm.legendItems;
                string viewName = QTOForm.legendViewName;

                if (items == null || items.Count == 0)
                {
                    form?.UpdateStatus("범례 데이터가 없습니다.");
                    TaskDialog.Show("알림", "색상이 반영되지 않았습니다.\n먼저 '벽체 색상 반영'을 실행해주세요.");
                    return;
                }

                // 기존 동일 이름 뷰 확인 (트랜잭션 시작 전)
                ViewDrafting existingView = new FilteredElementCollector(doc)
                    .OfClass(typeof(ViewDrafting))
                    .Cast<ViewDrafting>()
                    .FirstOrDefault(v => v.Name == viewName);

                // 기존 뷰가 있으면 먼저 삭제 (별도 트랜잭션)
                if (existingView != null)
                {
                    try
                    {
                        using (Transaction deleteTrans = new Transaction(doc, "기존 색상표 삭제"))
                        {
                            deleteTrans.Start();

                            // 기존 QTO_Color_* FilledRegionType 삭제
                            var oldColorTypes = new FilteredElementCollector(doc)
                                .OfClass(typeof(FilledRegionType))
                                .Cast<FilledRegionType>()
                                .Where(t => t.Name.StartsWith("QTO_Color_"))
                                .ToList();

                            foreach (var oldType in oldColorTypes)
                            {
                                try { doc.Delete(oldType.Id); } catch { }
                            }

                            // 기존 뷰 삭제
                            doc.Delete(existingView.Id);

                            deleteTrans.Commit();
                            form?.UpdateStatus($"기존 제도뷰 '{viewName}' 삭제 완료");
                        }
                    }
                    catch (Exception deleteEx)
                    {
                        form?.UpdateStatus($"❌ 기존 색상표 삭제 실패: {deleteEx.Message}");
                        TaskDialog.Show("알림", $"기존 색상표 뷰를 삭제할 수 없습니다.\n\n수동으로 '{viewName}' 뷰를 삭제한 후 다시 실행해주세요.");
                        return;
                    }
                }

                using (Transaction trans = new Transaction(doc, "범례뷰 생성"))
                {
                    trans.Start();

                    // 1. Drafting View 타입 찾기
                    ViewFamilyType draftingViewType = new FilteredElementCollector(doc)
                        .OfClass(typeof(ViewFamilyType))
                        .Cast<ViewFamilyType>()
                        .FirstOrDefault(vft => vft.ViewFamily == ViewFamily.Drafting);

                    if (draftingViewType == null)
                    {
                        form?.UpdateStatus("❌ 제도 뷰 타입을 찾을 수 없습니다.");
                        trans.RollBack();
                        return;
                    }

                    // 새 Drafting View 생성
                    ViewDrafting draftingView = ViewDrafting.Create(doc, draftingViewType.Id);
                    draftingView.Name = viewName;

                    // 뷰 스케일을 1:50으로 설정
                    draftingView.Scale = 50;

                    // 2. 솔리드 패턴 가져오기
                    FillPatternElement solidPattern = GetSolidFillPattern(doc);

                    // 3. 텍스트 타입 가져오기 (가장 작은 텍스트 타입 선택)
                    TextNoteType textType = new FilteredElementCollector(doc)
                        .OfClass(typeof(TextNoteType))
                        .Cast<TextNoteType>()
                        .OrderBy(t => t.get_Parameter(BuiltInParameter.TEXT_SIZE)?.AsDouble() ?? 0)
                        .FirstOrDefault();

                    if (textType == null)
                    {
                        form?.UpdateStatus("❌ 텍스트 타입을 찾을 수 없습니다.");
                        trans.RollBack();
                        return;
                    }

                    // 4. 범례 항목 생성 (1:50 스케일 기준)
                    // 1:50 스케일에서 출력 시 보이는 크기를 기준으로 계산
                    // 출력 시 15mm 박스 → 모델에서 15mm × 50 = 750mm
                    double yOffset = 0;
                    double boxWidth = 750.0 / 304.8;   // 750mm → feet (출력 시 15mm)
                    double boxHeight = 450.0 / 304.8;  // 450mm → feet (출력 시 9mm)
                    double spacing = 400.0 / 304.8;    // 400mm → feet (출력 시 8mm)
                    double textOffset = 150.0 / 304.8; // 150mm → feet (출력 시 3mm)

                    foreach (var item in items)
                    {
                        // 색상 사각형 위치
                        XYZ boxOrigin = new XYZ(0, yOffset, 0);

                        // FilledRegion 생성을 위한 CurveLoop
                        CurveLoop curveLoop = new CurveLoop();
                        XYZ p1 = boxOrigin;
                        XYZ p2 = new XYZ(boxOrigin.X + boxWidth, boxOrigin.Y, 0);
                        XYZ p3 = new XYZ(boxOrigin.X + boxWidth, boxOrigin.Y - boxHeight, 0);
                        XYZ p4 = new XYZ(boxOrigin.X, boxOrigin.Y - boxHeight, 0);

                        curveLoop.Append(Line.CreateBound(p1, p2));
                        curveLoop.Append(Line.CreateBound(p2, p3));
                        curveLoop.Append(Line.CreateBound(p3, p4));
                        curveLoop.Append(Line.CreateBound(p4, p1));

                        // FilledRegionType 찾기 또는 생성 (색상 적용)
                        FilledRegionType filledRegionType = GetOrCreateFilledRegionType(doc, item.Color, solidPattern);

                        if (filledRegionType != null)
                        {
                            // FilledRegion 생성
                            FilledRegion region = FilledRegion.Create(
                                doc,
                                filledRegionType.Id,
                                draftingView.Id,
                                new List<CurveLoop> { curveLoop }
                            );
                        }

                        // 텍스트 레이블 (타입명 + 개수)
                        XYZ textPosition = new XYZ(boxWidth + textOffset, yOffset - boxHeight / 2, 0);
                        string labelText = $"{item.TypeName} ({item.Count}개)";

                        TextNoteOptions textOptions = new TextNoteOptions
                        {
                            TypeId = textType.Id,
                            HorizontalAlignment = HorizontalTextAlignment.Left
                        };

                        TextNote.Create(doc, draftingView.Id, textPosition, labelText, textOptions);

                        // 다음 항목 위치
                        yOffset -= (boxHeight + spacing);
                    }

                    trans.Commit();

                    // 제도뷰 활성화
                    uidoc.ActiveView = draftingView;

                    form?.UpdateStatus($"✅ 범례뷰 '{viewName}' 생성 완료 ({items.Count}개 항목)");
                }
            }
            catch (Exception ex)
            {
                form?.UpdateStatus($"❌ 범례뷰 생성 오류: {ex.Message}");
                TaskDialog.Show("오류", $"범례뷰 생성 중 오류 발생:\n{ex.Message}");
            }
        }

        /// <summary>
        /// FilledRegionType 찾기 또는 생성
        /// </summary>
        private FilledRegionType GetOrCreateFilledRegionType(Document doc, ColorRGB color, FillPatternElement solidPattern)
        {
            try
            {
                // 색상값 로그
                form?.UpdateStatus($"색상 생성: R={color.R}, G={color.G}, B={color.B}");

                // 새 타입 이름
                string typeName = $"QTO_Color_{color.R}_{color.G}_{color.B}";

                // 이미 존재하는 타입 확인
                FilledRegionType existingColorType = new FilteredElementCollector(doc)
                    .OfClass(typeof(FilledRegionType))
                    .Cast<FilledRegionType>()
                    .FirstOrDefault(t => t.Name == typeName);

                if (existingColorType != null)
                {
                    // 기존 타입도 색상 업데이트 (색상이 변경되었을 수 있음)
                    Autodesk.Revit.DB.Color updateColor = new Autodesk.Revit.DB.Color(
                        (byte)color.R,
                        (byte)color.G,
                        (byte)color.B
                    );

                    if (solidPattern != null)
                    {
                        existingColorType.ForegroundPatternColor = updateColor;
                        existingColorType.ForegroundPatternId = solidPattern.Id;
                    }

                    return existingColorType;
                }

                // 기존 FilledRegionType 중 하나를 복제 기반으로 사용
                FilledRegionType baseType = new FilteredElementCollector(doc)
                    .OfClass(typeof(FilledRegionType))
                    .Cast<FilledRegionType>()
                    .FirstOrDefault();

                if (baseType == null)
                {
                    form?.UpdateStatus("❌ 기본 FilledRegionType을 찾을 수 없습니다.");
                    return null;
                }

                // 새로 복제
                FilledRegionType newType = baseType.Duplicate(typeName) as FilledRegionType;

                if (newType != null)
                {
                    // Revit Color 생성
                    Autodesk.Revit.DB.Color revitColor = new Autodesk.Revit.DB.Color(
                        (byte)color.R,
                        (byte)color.G,
                        (byte)color.B
                    );

                    // 솔리드 패턴 적용
                    if (solidPattern != null)
                    {
                        // Foreground (전경) 설정 - 메인 색상
                        newType.ForegroundPatternColor = revitColor;
                        newType.ForegroundPatternId = solidPattern.Id;

                        // Background (배경) 설정
                        newType.BackgroundPatternColor = revitColor;
                        newType.BackgroundPatternId = solidPattern.Id;

                        // 투명하지 않게 설정
                        try
                        {
                            newType.IsMasking = true;
                        }
                        catch { }
                    }

                    form?.UpdateStatus($"✅ FilledRegionType '{typeName}' 생성 완료");
                }

                return newType;
            }
            catch (Exception ex)
            {
                form?.UpdateStatus($"FilledRegionType 생성 오류: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"FilledRegionType 생성 오류: {ex.Message}");
                return null;
            }
        }

        public string GetName()
        {
            return "WallSelectionHandler";
        }
    }
    // 벽체만 선택할 수 있도록 하는 필터
    public class WallSelectionFilter : ISelectionFilter
    {
        public bool AllowElement(Element elem)
        {
            return elem is Wall;
        }

        public bool AllowReference(Reference reference, XYZ position)
        {
            return false;
        }
    }

    // 룸만 선택할 수 있도록 하는 필터
    public class RoomSelectionFilter : ISelectionFilter
    {
        public bool AllowElement(Element elem)
        {
            return elem is Room;
        }

        public bool AllowReference(Reference reference, XYZ position)
        {
            return false;
        }
    }

    /// <summary>
    /// 벽체 색상 매핑 데이터 클래스
    /// </summary>
    public class WallColorMapping
    {
        public string Name { get; set; }
        public List<string> ElementIds { get; set; }
        public ColorRGB Color { get; set; }
    }

    /// <summary>
    /// RGB 색상 데이터 클래스
    /// </summary>
    public class ColorRGB
    {
        public int R { get; set; }
        public int G { get; set; }
        public int B { get; set; }
    }

    /// <summary>
    /// 범례 항목 데이터 클래스
    /// </summary>
    public class LegendItem
    {
        public string TypeName { get; set; }
        public ColorRGB Color { get; set; }
        public int Count { get; set; }
    }

    /// <summary>
    /// 3D 뷰 복제 + 색상 적용 데이터 클래스
    /// </summary>
    public class DuplicateViewData
    {
        public string ViewName { get; set; }
        public List<string> ElementIds { get; set; }
        public ColorRGB Color { get; set; }
    }
}