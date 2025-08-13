/**
 * Kiyeno 벽체 관리 시스템 - Express.js 서버
 *
 * 기능:
 * - 정적 파일 서비스 (HTML, CSS, JS)
 * - REST API 엔드포인트
 * - Revit 연동 처리
 * - 데이터 관리
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const { Server } = require('socket.io');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// =============================================================================
// 미들웨어 설정
// =============================================================================

// CORS 설정 (WebSocket 통신을 위해)
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://localhost:3000'],
    credentials: true,
  })
);

// 요청 파싱
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 서비스
app.use(express.static(path.join(__dirname, 'public')));

// 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// 기본 라우트
// =============================================================================

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Kiyeno Wall Management System',
  });
});

// =============================================================================
// API 라우트
// =============================================================================

// API 라우트 연결
const apiRoutes = require('./api');
app.use('/api', apiRoutes);

// =============================================================================
// 오류 처리
// =============================================================================

// 404 처리
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `경로를 찾을 수 없습니다: ${req.path}`,
  });
});

// 전역 오류 처리
app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: '서버 내부 오류가 발생했습니다.',
  });
});

// =============================================================================
// 서버 시작
// =============================================================================

// 서버 시작 전 초기화
async function initializeServer() {
  try {
    // 필요한 디렉토리 생성
    await fs.ensureDir(path.join(__dirname, 'public'));
    await fs.ensureDir(path.join(__dirname, 'data'));
    await fs.ensureDir(path.join(__dirname, 'logs'));

    console.log('✅ 서버 초기화 완료');
  } catch (error) {
    console.error('❌ 서버 초기화 실패:', error);
    process.exit(1);
  }
}

// 서버 시작
async function startServer() {
  await initializeServer();

  // Socket.IO 서버 설정
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io/',
  });

  // Revit 연동용 네임스페이스
  const revitNamespace = io.of('/revit');
  let revitClient = null; // Revit 애드인 클라이언트
  let webClients = new Set(); // 웹 클라이언트들

  // Revit 애드인 연결 처리
  revitNamespace.on('connection', (socket) => {
    console.log(`🔗 Revit 클라이언트 연결: ${socket.id}`);
    revitClient = socket;

    socket.on('revit:status', (data) => {
      console.log('📊 Revit 상태 업데이트:', data);
      // 모든 웹 클라이언트에게 상태 전송
      webClients.forEach((client) => {
        client.emit('revit:status', data);
      });
    });

    socket.on('revit:wallData', (data) => {
      console.log('🏗️ Revit 벽체 데이터 수신:', data);
      // 웹 클라이언트에게 벽체 데이터 전송
      webClients.forEach((client) => {
        client.emit('revit:wallData', data);
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Revit 클라이언트 연결 해제');
      revitClient = null;
      // 웹 클라이언트들에게 연결 해제 알림
      webClients.forEach((client) => {
        client.emit('revit:disconnected');
      });
    });
  });

  // =============================================================================
  // 순수 WebSocket 서버 설정 (C# 애드인용) - 별도 포트 3001
  // =============================================================================

  const webSocketServer = http.createServer();
  const wss = new WebSocket.Server({
    server: webSocketServer,
    path: '/websocket',
  });

  let revitWebSocketClient = null; // C# Revit 애드인 클라이언트

  wss.on('connection', (ws) => {
    console.log('🔗 순수 WebSocket 클라이언트 연결됨');
    revitWebSocketClient = ws;

    // 메시지 수신 처리
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Revit WebSocket 메시지 수신:', message);

        // 메시지 타입에 따른 처리
        switch (message.type) {
          case 'revit:status':
            // Revit 상태를 웹 클라이언트들에게 전달
            webClients.forEach((client) => {
              client.emit('revit:status', message.data);
            });
            break;

          case 'revit:wallData':
            // 벽체 데이터를 웹 클라이언트들에게 전달
            webClients.forEach((client) => {
              client.emit('revit:wallData', message.data);
            });
            break;

          case 'revit:wallTypeResult':
            // WallType 생성 결과를 웹 클라이언트들에게 전달
            webClients.forEach((client) => {
              client.emit('revit:wallTypeResult', message.data);
            });
            break;

          case 'revit:info':
            // Revit 정보를 웹 클라이언트들에게 전달
            webClients.forEach((client) => {
              client.emit('revit:info', message.data);
            });
            break;
        }
      } catch (error) {
        console.error('❌ WebSocket 메시지 처리 오류:', error);
      }
    });

    // 연결 해제
    ws.on('close', () => {
      console.log('❌ Revit WebSocket 클라이언트 연결 해제');
      revitWebSocketClient = null;

      // 웹 클라이언트들에게 Revit 연결 해제 알림
      webClients.forEach((client) => {
        client.emit('revit:disconnected');
      });
    });

    // 오류 처리
    ws.on('error', (error) => {
      console.error('❌ WebSocket 오류:', error);
    });
  });

  // 웹 클라이언트에서 Revit 명령을 WebSocket으로 전달하는 함수 수정
  const originalRevitCommandHandler = function (data) {
    console.log('📤 Revit 명령 전송:', data);
    if (
      revitWebSocketClient &&
      revitWebSocketClient.readyState === WebSocket.OPEN
    ) {
      // 순수 WebSocket으로 명령 전송
      const message = {
        type: 'revit:command',
        data: data,
      };
      revitWebSocketClient.send(JSON.stringify(message));
    } else {
      this.emit('error', { message: 'Revit이 연결되지 않았습니다.' });
    }
  };

  // 기존 Socket.IO 이벤트 핸들러에서 WebSocket 클라이언트로 명령 전송하도록 수정
  io.on('connection', (socket) => {
    console.log(`🌐 웹 클라이언트 연결: ${socket.id}`);
    webClients.add(socket);

    // Revit 명령 전송 (수정됨)
    socket.on('revit:command', originalRevitCommandHandler.bind(socket));

    // Revit 연결 상태 확인 (수정됨)
    socket.on('revit:checkConnection', () => {
      socket.emit('revit:connectionStatus', {
        connected: !!(
          revitWebSocketClient &&
          revitWebSocketClient.readyState === WebSocket.OPEN
        ),
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ 웹 클라이언트 연결 해제');
      webClients.delete(socket);
    });
  });

  server.listen(PORT, () => {
    console.log('🚀 Kiyeno 벽체 관리 시스템 서버 시작');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO: ws://localhost:${PORT}/socket.io/`);
    console.log(`🏗️ Revit 네임스페이스: ws://localhost:${PORT}/revit`);
    console.log(`🕐 시작 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log('📝 로그 레벨: INFO');
    console.log('==================================================');
  });

  // WebSocket 서버를 별도 포트 3001에서 시작
  const WEBSOCKET_PORT = 3001;
  webSocketServer.listen(WEBSOCKET_PORT, () => {
    console.log(
      `⚡ 순수 WebSocket (C# 애드인): ws://localhost:${WEBSOCKET_PORT}/websocket`
    );
    console.log('==================================================');
  });

  // 우아한 종료 처리
  process.on('SIGTERM', () => {
    console.log('🛑 서버 종료 신호 수신');
    server.close(() => {
      webSocketServer.close(() => {
        console.log('✅ 서버가 안전하게 종료되었습니다.');
        process.exit(0);
      });
    });
  });

  process.on('SIGINT', () => {
    console.log('🛑 서버 종료 신호 수신 (Ctrl+C)');
    server.close(() => {
      webSocketServer.close(() => {
        console.log('✅ 서버가 안전하게 종료되었습니다.');
        process.exit(0);
      });
    });
  });
}

// 서버 시작
startServer().catch((error) => {
  console.error('서버 시작 실패:', error);
  process.exit(1);
});

module.exports = app;
