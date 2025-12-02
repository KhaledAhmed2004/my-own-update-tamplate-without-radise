/**
 * Socket.IO Sequence Diagram Generator
 *
 * Mermaid sequence diagrams generate করে Socket.IO events এর জন্য
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

class SequenceGenerator {
  constructor(detailLevel = 'standard') {
    this.detailLevel = detailLevel;
    this.levelConfig = config.detailLevels[detailLevel] || config.detailLevels.standard;
  }

  /**
   * Generate all flow diagrams
   * @returns {Object} Map of flowId -> mermaidCode
   */
  generateAll() {
    const diagrams = {};

    for (const flow of config.flows) {
      const generator = this.getFlowGenerator(flow.id);
      if (generator) {
        diagrams[flow.id] = {
          ...flow,
          mermaid: generator.call(this),
        };
      }
    }

    return diagrams;
  }

  /**
   * Generate specific flow diagram
   * @param {string} flowId - Flow identifier
   * @returns {string} Mermaid diagram code
   */
  generate(flowId) {
    const generator = this.getFlowGenerator(flowId);
    if (!generator) {
      throw new Error(`Unknown flow: ${flowId}`);
    }
    return generator.call(this);
  }

  /**
   * Get generator function for a flow
   * @param {string} flowId - Flow identifier
   * @returns {Function|null} Generator function
   */
  getFlowGenerator(flowId) {
    const generators = {
      connection: this.generateConnectionFlow,
      'send-message': this.generateSendMessageFlow,
      typing: this.generateTypingFlow,
      'delivery-status': this.generateDeliveryStatusFlow,
      'room-management': this.generateRoomManagementFlow,
      presence: this.generatePresenceFlow,
      disconnect: this.generateDisconnectFlow,
      'full-flow': this.generateFullFlow,
    };
    return generators[flowId] || null;
  }

  // ==========================================
  // Flow Generators
  // ==========================================

  /**
   * Connection & Authentication Flow
   */
  generateConnectionFlow() {
    return `sequenceDiagram
    autonumber
    participant C as 📱 Client
    participant S as 🔌 Socket.IO
    participant A as 🔐 JWT Auth
    participant P as 👤 Presence

    Note over C,P: 🔗 Connection & Authentication Flow

    C->>S: connect({auth: {token: JWT}})

    Note over S: Extract token from handshake
    S->>S: token = socket.handshake.auth.token

    alt Token Missing
        S-->>C: ❌ disconnect(true)
        Note right of C: Connection rejected
    else Token Present
        S->>A: jwtHelper.verifyToken(token)

        alt Token Invalid
            A-->>S: ❌ JWT Error
            S-->>C: ❌ disconnect(true)
        else Token Valid
            A-->>S: ✅ payload {id: userId}

            Note over S,P: Initialize user session
            S->>P: setOnline(userId)
            S->>P: incrConnCount(userId)
            S->>P: updateLastActive(userId)

            S->>S: socket.join('user::' + userId)

            Note right of C: ✅ Connection established
            S-->>C: Connected to user room
        end
    end
`;
  }

  /**
   * Send Message Flow
   */
  generateSendMessageFlow() {
    return `sequenceDiagram
    autonumber
    participant C as 📱 Client
    participant API as 🌐 REST API
    participant Svc as ⚙️ MessageService
    participant DB as 🗄️ MongoDB
    participant S as 🔌 Socket.IO
    participant R as 📢 Chat Room
    participant P as 👤 Presence
    participant N as 🔔 Notification

    Note over C,N: 💬 Send Message Flow

    C->>API: POST /api/v1/message
    Note right of C: {chatId, text, attachments?}

    API->>Svc: sendMessageToDB(payload)

    Svc->>DB: Chat.exists({_id: chatId, participants: userId})

    alt Not Participant
        DB-->>Svc: false
        Svc-->>API: ❌ Unauthorized
        API-->>C: 403 Forbidden
    else Is Participant
        DB-->>Svc: true

        Svc->>DB: Message.create({chatId, sender, text, ...})
        DB-->>Svc: message saved

        Note over Svc,S: Real-time broadcast
        Svc->>S: global.io
        S->>R: io.to('chat::' + chatId).emit('MESSAGE_SENT')
        R-->>R: All room members receive message

        Note over Svc,P: Update unread counts
        loop For each receiver (not sender)
            Svc->>P: incrementUnreadCount(chatId, receiverId, 1)

            Svc->>P: isOnline(receiverId)?
            alt Offline
                Svc->>N: sendNotification({title, text, receiver})
            end
        end

        Svc-->>API: message response
        API-->>C: 201 Created {message}
    end
`;
  }

  /**
   * Typing Indicators Flow
   */
  generateTypingFlow() {
    return `sequenceDiagram
    autonumber
    participant A as 📱 Client A
    participant S as 🔌 Socket.IO
    participant DB as 🗄️ MongoDB
    participant T as ⏱️ Throttle (5s)
    participant R as 📢 Chat Room
    participant B as 👥 Other Clients

    Note over A,B: ⌨️ Typing Indicator Flow

    rect rgb(240, 248, 255)
        Note over A,B: TYPING_START Event
        A->>S: emit('TYPING_START', {chatId})

        S->>DB: Chat.exists({_id: chatId, participants: userId})

        alt Not Participant
            DB-->>S: false
            Note right of S: Event ignored (no error sent)
        else Is Participant
            DB-->>S: true

            S->>T: Check throttle key: 'typing:chatId:userId'

            alt Already Throttled (within 5s)
                T-->>S: ❌ Key exists
                Note right of S: Skip broadcast (throttled)
            else Not Throttled
                T-->>S: ✅ Key not found
                S->>T: Set key (TTL: 5 seconds)

                S->>R: io.to('chat::' + chatId).emit('TYPING_START')
                R-->>B: on('TYPING_START', {userId, chatId})
                Note right of B: 💭 Shows "User is typing..."
            end
        end
    end

    rect rgb(255, 248, 240)
        Note over A,B: TYPING_STOP Event
        A->>S: emit('TYPING_STOP', {chatId})

        S->>DB: Chat.exists({_id: chatId, participants: userId})

        alt Is Participant
            DB-->>S: true
            S->>T: Delete throttle key

            S->>R: io.to('chat::' + chatId).emit('TYPING_STOP')
            R-->>B: on('TYPING_STOP', {userId, chatId})
            Note right of B: Typing indicator hidden
        end
    end
`;
  }

  /**
   * Delivery/Read Status Flow
   */
  generateDeliveryStatusFlow() {
    return `sequenceDiagram
    autonumber
    participant Sender as 📱 Sender
    participant S as 🔌 Socket.IO
    participant DB as 🗄️ MongoDB
    participant R as 📢 Chat Room
    participant Receiver as 📱 Receiver

    Note over Sender,Receiver: ✅ Message Delivery & Read Status Flow

    rect rgb(240, 255, 240)
        Note over Sender,Receiver: Phase 1: Message Sent
        Note right of Sender: Message sent ✓ (single tick)
    end

    rect rgb(240, 248, 255)
        Note over Sender,Receiver: Phase 2: Delivery Acknowledgement

        Receiver->>S: emit('DELIVERED_ACK', {messageId})

        S->>DB: Message.findById(messageId)

        alt Message Not Found
            DB-->>S: null
            S-->>Receiver: emit('ACK_ERROR', {message: 'Message not found'})
        else Message Found
            DB-->>S: message {chatId, ...}

            S->>DB: Chat.exists({_id: chatId, participants: userId})

            alt Not Participant
                DB-->>S: false
                S-->>Receiver: emit('ACK_ERROR', {message: 'Not a participant'})
            else Is Participant
                DB-->>S: true

                S->>DB: Message.findByIdAndUpdate(messageId, {$addToSet: {deliveredTo: userId}})
                DB-->>S: updated message

                S->>R: io.to('chat::' + chatId).emit('MESSAGE_DELIVERED')
                R-->>Sender: on('MESSAGE_DELIVERED', {messageId, userId})
                Note right of Sender: ✓✓ (double tick grey)
            end
        end
    end

    rect rgb(255, 248, 240)
        Note over Sender,Receiver: Phase 3: Read Acknowledgement

        Receiver->>S: emit('READ_ACK', {messageId})

        S->>DB: Message.findById(messageId)
        DB-->>S: message {chatId, ...}

        S->>DB: Chat.exists({_id: chatId, participants: userId})

        alt Is Participant
            DB-->>S: true

            S->>DB: Message.findByIdAndUpdate(messageId, {$addToSet: {readBy: userId}})
            DB-->>S: updated message

            S->>R: io.to('chat::' + chatId).emit('MESSAGE_READ')
            R-->>Sender: on('MESSAGE_READ', {messageId, userId})
            Note right of Sender: ✓✓ (double tick blue)
        end
    end
`;
  }

  /**
   * Room Management Flow
   */
  generateRoomManagementFlow() {
    return `sequenceDiagram
    autonumber
    participant C as 📱 Client
    participant S as 🔌 Socket.IO
    participant DB as 🗄️ MongoDB
    participant P as 👤 Presence
    participant R as 📢 Chat Room

    Note over C,R: 🚪 Room Management Flow

    rect rgb(240, 255, 240)
        Note over C,R: JOIN_CHAT Event

        C->>S: emit('JOIN_CHAT', {chatId})

        S->>DB: Chat.exists({_id: chatId, participants: userId})

        alt Not Participant
            DB-->>S: false
            S-->>C: emit('ACK_ERROR', {message: 'Not a participant', chatId})
        else Is Participant
            DB-->>S: true

            Note over S: Join socket room
            S->>S: socket.join('chat::' + chatId)

            S->>P: addUserRoom(userId, chatId)
            S->>P: getLastActive(userId)
            P-->>S: lastActive timestamp

            Note over S,R: Broadcast user online
            S->>R: io.to('chat::' + chatId).emit('USER_ONLINE')
            R-->>R: {userId, chatId, lastActive}

            Note over S,DB: Auto-mark undelivered as delivered
            S->>DB: Message.find({chatId, deliveredTo: {$nin: [userId]}})
            DB-->>S: undelivered messages[]

            loop For each undelivered message
                S->>DB: Message.updateMany({$addToSet: {deliveredTo: userId}})
                S->>R: emit('MESSAGE_DELIVERED', {messageId, chatId, userId})
            end
        end
    end

    rect rgb(255, 240, 240)
        Note over C,R: LEAVE_CHAT Event

        C->>S: emit('LEAVE_CHAT', {chatId})

        S->>DB: Chat.exists({_id: chatId, participants: userId})

        alt Is Participant
            DB-->>S: true

            S->>S: socket.leave('chat::' + chatId)
            S->>P: removeUserRoom(userId, chatId)
            S->>P: getLastActive(userId)
            P-->>S: lastActive timestamp

            S->>R: io.to('chat::' + chatId).emit('USER_OFFLINE')
            R-->>R: {userId, chatId, lastActive}
        end
    end
`;
  }

  /**
   * Presence Tracking Flow
   */
  generatePresenceFlow() {
    return `sequenceDiagram
    autonumber
    participant C as 📱 Client
    participant S as 🔌 Socket.IO
    participant P as 👤 PresenceHelper
    participant Cache as 📦 NodeCache

    Note over C,Cache: 👤 Presence Tracking System

    rect rgb(240, 255, 240)
        Note over C,Cache: User Goes Online

        C->>S: connect (with JWT)
        S->>P: setOnline(userId)
        P->>Cache: onlineSet.add(userId)

        S->>P: incrConnCount(userId)
        P->>Cache: connCount[userId]++
        Note right of Cache: Supports multiple sessions

        S->>P: updateLastActive(userId)
        P->>Cache: lastActive[userId] = Date.now()
    end

    rect rgb(240, 248, 255)
        Note over C,Cache: Check Online Status

        S->>P: isOnline(userId)
        P->>Cache: onlineSet.has(userId)
        Cache-->>P: true/false
        P-->>S: boolean

        S->>P: getLastActive(userId)
        P->>Cache: lastActive[userId]
        Cache-->>P: timestamp
        P-->>S: number | undefined
    end

    rect rgb(255, 248, 240)
        Note over C,Cache: Room Tracking

        S->>P: addUserRoom(userId, chatId)
        P->>Cache: userRooms[userId].add(chatId)

        S->>P: getUserRooms(userId)
        P->>Cache: userRooms[userId]
        Cache-->>P: Set<chatId>
        P-->>S: string[]

        S->>P: removeUserRoom(userId, chatId)
        P->>Cache: userRooms[userId].delete(chatId)
    end

    rect rgb(255, 240, 240)
        Note over C,Cache: Connection Count (Multi-Session)

        S->>P: getConnCount(userId)
        P->>Cache: connCount[userId]
        Cache-->>P: number
        P-->>S: count

        Note right of Cache: User can have multiple devices
    end
`;
  }

  /**
   * Disconnect Flow
   */
  generateDisconnectFlow() {
    return `sequenceDiagram
    autonumber
    participant C as 📱 Client
    participant S as 🔌 Socket.IO
    participant P as 👤 Presence
    participant R as 📢 Chat Rooms

    Note over C,R: 🔌 Disconnect Flow

    C->>S: disconnect (connection lost/closed)

    S->>P: updateLastActive(userId)
    Note right of P: Record last seen time

    S->>P: decrConnCount(userId)
    P-->>S: remaining sessions count

    alt Multiple Sessions Active (remaining > 0)
        Note over S: User still online on other device
        Note right of S: No offline broadcast
    else Last Session (remaining = 0)
        S->>P: setOffline(userId)

        S->>P: getUserRooms(userId)
        P-->>S: [chatId1, chatId2, ...]

        loop For each chat room
            S->>R: io.to('chat::' + chatId).emit('USER_OFFLINE')
            R-->>R: {userId, chatId, lastActive}
        end

        S->>P: clearUserRooms(userId)
        Note right of P: Clean up room tracking
    end
`;
  }

  /**
   * Full Flow - All Events Combined
   */
  generateFullFlow() {
    return `sequenceDiagram
    autonumber
    participant C as 📱 Client
    participant S as 🔌 Socket.IO
    participant A as 🔐 Auth
    participant DB as 🗄️ MongoDB
    participant P as 👤 Presence
    participant R as 📢 Room
    participant O as 👥 Others

    Note over C,O: 📋 Complete Socket.IO Event Flow

    %% ===== CONNECTION =====
    rect rgb(230, 255, 230)
        Note over C,O: 🔗 Phase 1: Connection
        C->>S: connect({auth: {token}})
        S->>A: verifyToken(token)
        A-->>S: ✅ {id: userId}
        S->>P: setOnline(userId)
        S->>P: incrConnCount(userId)
        S->>S: socket.join('user::userId')
    end

    %% ===== JOIN CHAT =====
    rect rgb(230, 240, 255)
        Note over C,O: 🚪 Phase 2: Join Chat Room
        C->>S: emit('JOIN_CHAT', {chatId})
        S->>DB: Chat.exists({participants: userId})
        DB-->>S: ✅ true
        S->>S: socket.join('chat::chatId')
        S->>P: addUserRoom(userId, chatId)
        S->>R: emit('USER_ONLINE', {userId, chatId})
        R-->>O: User joined notification
    end

    %% ===== SEND MESSAGE =====
    rect rgb(255, 250, 230)
        Note over C,O: 💬 Phase 3: Send Message
        C->>S: POST /api/v1/message
        S->>DB: Message.create({...})
        DB-->>S: message saved
        S->>R: emit('MESSAGE_SENT', {message})
        R-->>O: New message notification
    end

    %% ===== TYPING =====
    rect rgb(240, 230, 255)
        Note over C,O: ⌨️ Phase 4: Typing
        C->>S: emit('TYPING_START', {chatId})
        S->>R: emit('TYPING_START', {userId})
        R-->>O: Shows typing indicator
        C->>S: emit('TYPING_STOP', {chatId})
        S->>R: emit('TYPING_STOP', {userId})
    end

    %% ===== DELIVERY/READ =====
    rect rgb(230, 255, 240)
        Note over C,O: ✅ Phase 5: Delivery & Read
        O->>S: emit('DELIVERED_ACK', {messageId})
        S->>DB: Update deliveredTo[]
        S->>R: emit('MESSAGE_DELIVERED')
        R-->>C: ✓✓ (grey)
        O->>S: emit('READ_ACK', {messageId})
        S->>DB: Update readBy[]
        S->>R: emit('MESSAGE_READ')
        R-->>C: ✓✓ (blue)
    end

    %% ===== LEAVE & DISCONNECT =====
    rect rgb(255, 230, 230)
        Note over C,O: 🔌 Phase 6: Leave & Disconnect
        C->>S: emit('LEAVE_CHAT', {chatId})
        S->>S: socket.leave('chat::chatId')
        S->>R: emit('USER_OFFLINE', {userId})
        R-->>O: User left notification
        C->>S: disconnect
        S->>P: decrConnCount(userId)
        S->>P: setOffline(userId)
    end
`;
  }

  // ==========================================
  // HTML Generation
  // ==========================================

  /**
   * Generate HTML file with interactive diagram
   * @param {string} mermaidCode - Mermaid diagram code
   * @param {Object} flowInfo - Flow metadata
   * @param {Object[]} allFlows - All available flows for navigation
   * @returns {string} HTML content
   */
  generateHTML(mermaidCode, flowInfo, allFlows = []) {
    const escapedCode = this.escapeHTML(mermaidCode);

    return `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${flowInfo.name} - Socket.IO Flow Diagram</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #1a1a2e;
            color: #eee;
            min-height: 100vh;
        }

        .layout {
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar */
        .sidebar {
            width: 280px;
            background: #16213e;
            border-right: 1px solid #0f3460;
            padding: 20px;
            display: flex;
            flex-direction: column;
        }

        .sidebar-header {
            margin-bottom: 20px;
        }

        .sidebar-title {
            font-size: 18px;
            font-weight: 600;
            color: #e94560;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .sidebar-subtitle {
            font-size: 12px;
            color: #888;
            margin-top: 5px;
        }

        .nav-list {
            list-style: none;
            flex: 1;
        }

        .nav-item {
            margin-bottom: 4px;
        }

        .nav-link {
            display: block;
            padding: 12px 15px;
            color: #ccc;
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.2s;
            font-size: 14px;
        }

        .nav-link:hover {
            background: #0f3460;
            color: #fff;
        }

        .nav-link.active {
            background: #e94560;
            color: #fff;
        }

        /* Main Content */
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        /* Header */
        .header {
            background: #16213e;
            padding: 15px 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #0f3460;
        }

        .header-title {
            font-size: 20px;
            font-weight: 600;
        }

        .header-desc {
            font-size: 13px;
            color: #888;
            margin-top: 3px;
        }

        .header-actions {
            display: flex;
            gap: 10px;
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .btn-primary {
            background: #e94560;
            color: white;
        }

        .btn-primary:hover {
            background: #d63850;
        }

        .btn-secondary {
            background: #0f3460;
            color: #ccc;
        }

        .btn-secondary:hover {
            background: #1a4a7a;
            color: #fff;
        }

        /* Zoom Controls */
        .zoom-controls {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #0f3460;
            padding: 6px 12px;
            border-radius: 6px;
        }

        .zoom-btn {
            width: 28px;
            height: 28px;
            border: none;
            border-radius: 4px;
            background: #16213e;
            color: #ccc;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .zoom-btn:hover {
            background: #1a4a7a;
            color: #fff;
        }

        .zoom-level {
            font-size: 12px;
            color: #888;
            min-width: 45px;
            text-align: center;
        }

        /* Legend */
        .legend {
            background: #16213e;
            padding: 12px 25px;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            border-bottom: 1px solid #0f3460;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }

        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 3px;
        }

        /* Diagram Container */
        .diagram-wrapper {
            flex: 1;
            overflow: auto;
            padding: 20px;
        }

        .diagram-container {
            min-width: max-content;
            transform-origin: top left;
            transition: transform 0.2s;
        }

        .mermaid {
            background: #fff;
            border-radius: 12px;
            padding: 30px;
            display: inline-block;
            min-width: 100%;
        }

        /* Code Panel */
        .code-panel {
            display: none;
            background: #0d1117;
            border-top: 1px solid #0f3460;
            max-height: 300px;
            overflow: auto;
        }

        .code-panel.active {
            display: block;
        }

        .code-panel pre {
            margin: 0;
            padding: 20px;
            font-family: 'Fira Code', monospace;
            font-size: 13px;
            line-height: 1.5;
            color: #c9d1d9;
        }

        /* Toast */
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s;
            z-index: 1000;
        }

        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }
    </style>
</head>
<body>
    <div class="layout">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-title">
                    🔌 Socket.IO Flows
                </div>
                <div class="sidebar-subtitle">Event Flow Diagrams</div>
            </div>
            <ul class="nav-list">
                ${allFlows
                  .map(
                    flow => `
                <li class="nav-item">
                    <a href="${flow.filename}.html" class="nav-link ${flow.id === flowInfo.id ? 'active' : ''}">
                        ${flow.name}
                    </a>
                </li>
                `
                  )
                  .join('')}
            </ul>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Header -->
            <header class="header">
                <div>
                    <div class="header-title">${flowInfo.name}</div>
                    <div class="header-desc">${flowInfo.description}</div>
                </div>
                <div class="header-actions">
                    <div class="zoom-controls">
                        <button class="zoom-btn" onclick="zoomOut()" title="Zoom Out">−</button>
                        <span class="zoom-level" id="zoomLevel">100%</span>
                        <button class="zoom-btn" onclick="zoomIn()" title="Zoom In">+</button>
                        <button class="zoom-btn" onclick="resetZoom()" title="Reset">↺</button>
                    </div>
                    <button class="btn btn-secondary" onclick="toggleCode()">
                        📝 Code
                    </button>
                    <button class="btn btn-secondary" onclick="copyCode()">
                        📋 Copy
                    </button>
                    <a href="https://mermaid.live/edit" target="_blank" class="btn btn-primary">
                        🔗 Mermaid Live
                    </a>
                </div>
            </header>

            <!-- Legend -->
            <div class="legend">
                <div class="legend-item">
                    <span class="legend-color" style="background: #3498db;"></span>
                    <span>📱 Client</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #2ecc71;"></span>
                    <span>🔌 Socket.IO</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #e74c3c;"></span>
                    <span>🔐 Auth</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #f39c12;"></span>
                    <span>🗄️ MongoDB</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #9b59b6;"></span>
                    <span>👤 Presence</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: #1abc9c;"></span>
                    <span>📢 Room</span>
                </div>
            </div>

            <!-- Diagram -->
            <div class="diagram-wrapper" id="diagramWrapper">
                <div class="diagram-container" id="diagramContainer">
                    <div class="mermaid">
${mermaidCode}
                    </div>
                </div>
            </div>

            <!-- Code Panel -->
            <div class="code-panel" id="codePanel">
                <pre id="mermaidCode">${escapedCode}</pre>
            </div>
        </main>
    </div>

    <div class="toast" id="toast">Copied to clipboard!</div>

    <script>
        // Initialize Mermaid
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            sequence: {
                diagramMarginX: 50,
                diagramMarginY: 30,
                actorMargin: 80,
                width: 180,
                height: 50,
                boxMargin: 10,
                boxTextMargin: 5,
                noteMargin: 10,
                messageMargin: 35,
                mirrorActors: false,
                bottomMarginAdj: 10,
                useMaxWidth: false,
            }
        });

        // Zoom functionality
        let currentZoom = 1;
        const zoomStep = 0.1;
        const minZoom = 0.3;
        const maxZoom = 3;

        function updateZoom() {
            const container = document.getElementById('diagramContainer');
            container.style.transform = \`scale(\${currentZoom})\`;
            document.getElementById('zoomLevel').textContent = Math.round(currentZoom * 100) + '%';
        }

        function zoomIn() {
            if (currentZoom < maxZoom) {
                currentZoom = Math.min(currentZoom + zoomStep, maxZoom);
                updateZoom();
            }
        }

        function zoomOut() {
            if (currentZoom > minZoom) {
                currentZoom = Math.max(currentZoom - zoomStep, minZoom);
                updateZoom();
            }
        }

        function resetZoom() {
            currentZoom = 1;
            updateZoom();
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    zoomIn();
                } else if (e.key === '-') {
                    e.preventDefault();
                    zoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    resetZoom();
                }
            }
        });

        // Mouse wheel zoom
        document.getElementById('diagramWrapper').addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    zoomIn();
                } else {
                    zoomOut();
                }
            }
        });

        // Toggle code panel
        function toggleCode() {
            const panel = document.getElementById('codePanel');
            panel.classList.toggle('active');
        }

        // Copy code
        function copyCode() {
            const code = document.getElementById('mermaidCode').textContent;
            navigator.clipboard.writeText(code).then(() => {
                showToast('Copied to clipboard!');
            });
        }

        // Show toast
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }

        // Mouse drag to scroll
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

        const wrapper = document.getElementById('diagramWrapper');

        wrapper.addEventListener('mousedown', (e) => {
            if (e.target.closest('.mermaid')) {
                isDragging = true;
                wrapper.style.cursor = 'grabbing';
                startX = e.pageX - wrapper.offsetLeft;
                startY = e.pageY - wrapper.offsetTop;
                scrollLeft = wrapper.scrollLeft;
                scrollTop = wrapper.scrollTop;
            }
        });

        wrapper.addEventListener('mouseleave', () => {
            isDragging = false;
            wrapper.style.cursor = 'default';
        });

        wrapper.addEventListener('mouseup', () => {
            isDragging = false;
            wrapper.style.cursor = 'default';
        });

        wrapper.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - wrapper.offsetLeft;
            const y = e.pageY - wrapper.offsetTop;
            const walkX = (x - startX) * 1.5;
            const walkY = (y - startY) * 1.5;
            wrapper.scrollLeft = scrollLeft - walkX;
            wrapper.scrollTop = scrollTop - walkY;
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate index HTML with all flows
   * @param {Object[]} allFlows - All flows with their diagrams
   * @returns {string} HTML content
   */
  generateIndexHTML(allFlows) {
    const flowCards = allFlows
      .map(
        flow => `
        <a href="${flow.filename}.html" class="flow-card">
            <div class="flow-icon">${flow.name.split(' ')[0]}</div>
            <div class="flow-info">
                <div class="flow-title">${flow.name}</div>
                <div class="flow-desc">${flow.description}</div>
            </div>
        </a>
    `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Socket.IO Event Flow Diagrams</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #eee;
            min-height: 100vh;
            padding: 40px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 50px;
        }

        .header h1 {
            font-size: 36px;
            color: #e94560;
            margin-bottom: 10px;
        }

        .header p {
            color: #888;
            font-size: 16px;
        }

        .flows-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }

        .flow-card {
            background: #16213e;
            border-radius: 12px;
            padding: 25px;
            display: flex;
            gap: 20px;
            text-decoration: none;
            color: inherit;
            transition: all 0.3s;
            border: 1px solid transparent;
        }

        .flow-card:hover {
            border-color: #e94560;
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(233, 69, 96, 0.2);
        }

        .flow-icon {
            font-size: 32px;
            min-width: 50px;
            text-align: center;
        }

        .flow-info {
            flex: 1;
        }

        .flow-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #fff;
        }

        .flow-desc {
            font-size: 13px;
            color: #888;
            line-height: 1.5;
        }

        .events-table {
            margin-top: 50px;
            background: #16213e;
            border-radius: 12px;
            overflow: hidden;
        }

        .events-table h2 {
            padding: 20px 25px;
            background: #0f3460;
            font-size: 18px;
        }

        .events-table table {
            width: 100%;
            border-collapse: collapse;
        }

        .events-table th,
        .events-table td {
            padding: 12px 25px;
            text-align: left;
            border-bottom: 1px solid #0f3460;
        }

        .events-table th {
            background: #1a2744;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            color: #888;
        }

        .events-table td {
            font-size: 14px;
        }

        .events-table code {
            background: #0f3460;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Fira Code', monospace;
            font-size: 12px;
            color: #e94560;
        }

        .direction-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }

        .direction-in {
            background: #27ae60;
            color: white;
        }

        .direction-out {
            background: #3498db;
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔌 Socket.IO Event Flow Diagrams</h1>
            <p>Real-time messaging system এর complete event flow visualization</p>
        </div>

        <div class="flows-grid">
            ${flowCards}
        </div>

        <div class="events-table">
            <h2>📋 Socket Events Reference</h2>
            <table>
                <thead>
                    <tr>
                        <th>Event Name</th>
                        <th>Direction</th>
                        <th>Payload</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>JOIN_CHAT</code></td>
                        <td><span class="direction-badge direction-in">Client → Server</span></td>
                        <td><code>{ chatId: string }</code></td>
                    </tr>
                    <tr>
                        <td><code>LEAVE_CHAT</code></td>
                        <td><span class="direction-badge direction-in">Client → Server</span></td>
                        <td><code>{ chatId: string }</code></td>
                    </tr>
                    <tr>
                        <td><code>TYPING_START</code></td>
                        <td><span class="direction-badge direction-in">Client → Server</span></td>
                        <td><code>{ chatId: string }</code></td>
                    </tr>
                    <tr>
                        <td><code>TYPING_STOP</code></td>
                        <td><span class="direction-badge direction-in">Client → Server</span></td>
                        <td><code>{ chatId: string }</code></td>
                    </tr>
                    <tr>
                        <td><code>DELIVERED_ACK</code></td>
                        <td><span class="direction-badge direction-in">Client → Server</span></td>
                        <td><code>{ messageId: string }</code></td>
                    </tr>
                    <tr>
                        <td><code>READ_ACK</code></td>
                        <td><span class="direction-badge direction-in">Client → Server</span></td>
                        <td><code>{ messageId: string }</code></td>
                    </tr>
                    <tr>
                        <td><code>USER_ONLINE</code></td>
                        <td><span class="direction-badge direction-out">Server → Room</span></td>
                        <td><code>{ userId, chatId, lastActive }</code></td>
                    </tr>
                    <tr>
                        <td><code>USER_OFFLINE</code></td>
                        <td><span class="direction-badge direction-out">Server → Room</span></td>
                        <td><code>{ userId, chatId, lastActive }</code></td>
                    </tr>
                    <tr>
                        <td><code>MESSAGE_SENT</code></td>
                        <td><span class="direction-badge direction-out">Server → Room</span></td>
                        <td><code>{ message: IMessage }</code></td>
                    </tr>
                    <tr>
                        <td><code>MESSAGE_DELIVERED</code></td>
                        <td><span class="direction-badge direction-out">Server → Room</span></td>
                        <td><code>{ messageId, chatId, userId }</code></td>
                    </tr>
                    <tr>
                        <td><code>MESSAGE_READ</code></td>
                        <td><span class="direction-badge direction-out">Server → Room</span></td>
                        <td><code>{ messageId, chatId, userId }</code></td>
                    </tr>
                    <tr>
                        <td><code>ACK_ERROR</code></td>
                        <td><span class="direction-badge direction-out">Server → Client</span></td>
                        <td><code>{ message, chatId?, messageId? }</code></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = SequenceGenerator;
