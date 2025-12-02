/**
 * Socket.IO Diagram Generator Configuration
 *
 * এই file-এ সব configuration options আছে Socket.IO flow diagram generation এর জন্য
 */

const path = require('path');

module.exports = {
  // ==========================================
  // Path Configuration
  // ==========================================
  paths: {
    // Source files
    socketHelper: path.resolve(__dirname, '../../src/helpers/socketHelper.ts'),
    presenceHelper: path.resolve(__dirname, '../../src/app/helpers/presenceHelper.ts'),
    unreadHelper: path.resolve(__dirname, '../../src/app/helpers/unreadHelper.ts'),
    messageService: path.resolve(__dirname, '../../src/app/modules/message/message.service.ts'),

    // Output directories
    outputDir: path.resolve(__dirname, 'output'),
    diagramsDir: path.resolve(__dirname, 'output/diagrams'),
    htmlDir: path.resolve(__dirname, 'output/html'),
  },

  // ==========================================
  // Participants Configuration
  // ==========================================
  participants: {
    client: {
      id: 'C',
      label: '📱 Client',
      color: '#3498db',
      description: 'Mobile/Web Client',
    },
    socket: {
      id: 'S',
      label: '🔌 Socket.IO',
      color: '#2ecc71',
      description: 'Socket.IO Server',
    },
    auth: {
      id: 'A',
      label: '🔐 JWT Auth',
      color: '#e74c3c',
      description: 'JWT Authentication',
    },
    presence: {
      id: 'P',
      label: '👤 Presence',
      color: '#9b59b6',
      description: 'Presence Helper',
    },
    db: {
      id: 'DB',
      label: '🗄️ MongoDB',
      color: '#f39c12',
      description: 'Database Operations',
    },
    room: {
      id: 'R',
      label: '📢 Room',
      color: '#1abc9c',
      description: 'Chat Room Broadcast',
    },
    throttle: {
      id: 'T',
      label: '⏱️ Throttle',
      color: '#95a5a6',
      description: 'Rate Limiter (5s)',
    },
    receiver: {
      id: 'Recv',
      label: '📱 Receiver',
      color: '#3498db',
      description: 'Message Receiver',
    },
    sender: {
      id: 'Send',
      label: '📱 Sender',
      color: '#2980b9',
      description: 'Message Sender',
    },
    others: {
      id: 'O',
      label: '👥 Others',
      color: '#7f8c8d',
      description: 'Other Clients',
    },
  },

  // ==========================================
  // Available Flows
  // ==========================================
  flows: [
    {
      id: 'connection',
      name: '🔗 Connection & Auth Flow',
      description: 'Socket connection এবং JWT authentication',
      filename: 'connection-flow',
    },
    {
      id: 'send-message',
      name: '💬 Send Message Flow',
      description: 'Message পাঠানো এবং broadcast',
      filename: 'send-message-flow',
    },
    {
      id: 'typing',
      name: '⌨️ Typing Indicators Flow',
      description: 'Typing start/stop events',
      filename: 'typing-flow',
    },
    {
      id: 'delivery-status',
      name: '✅ Delivery/Read Status Flow',
      description: 'Message delivery এবং read acknowledgements',
      filename: 'delivery-status-flow',
    },
    {
      id: 'room-management',
      name: '🚪 Room Management Flow',
      description: 'Chat room join/leave',
      filename: 'room-management-flow',
    },
    {
      id: 'presence',
      name: '👤 Presence Tracking Flow',
      description: 'Online/offline status tracking',
      filename: 'presence-flow',
    },
    {
      id: 'disconnect',
      name: '🔌 Disconnect Flow',
      description: 'Socket disconnect handling',
      filename: 'disconnect-flow',
    },
    {
      id: 'full-flow',
      name: '📋 All Events (Full Diagram)',
      description: 'সব events একসাথে',
      filename: 'full-socket-flow',
    },
  ],

  // ==========================================
  // Detail Levels
  // ==========================================
  detailLevels: {
    overview: {
      name: 'Overview',
      description: 'শুধু main steps (প্রেজেন্টেশনের জন্য)',
      maxSteps: 10,
      showNotes: false,
      showAlternatives: false,
    },
    standard: {
      name: 'Standard',
      description: 'Standard detail (Recommended)',
      maxSteps: 30,
      showNotes: true,
      showAlternatives: true,
    },
    detailed: {
      name: 'Detailed',
      description: 'সব কিছু সহ (Debugging এর জন্য)',
      maxSteps: 100,
      showNotes: true,
      showAlternatives: true,
      showErrorHandling: true,
    },
  },

  // ==========================================
  // Socket Events Reference
  // ==========================================
  events: {
    // Client → Server
    clientToServer: [
      { name: 'JOIN_CHAT', payload: '{ chatId: string }' },
      { name: 'LEAVE_CHAT', payload: '{ chatId: string }' },
      { name: 'TYPING_START', payload: '{ chatId: string }' },
      { name: 'TYPING_STOP', payload: '{ chatId: string }' },
      { name: 'DELIVERED_ACK', payload: '{ messageId: string }' },
      { name: 'READ_ACK', payload: '{ messageId: string }' },
    ],

    // Server → Client/Room
    serverToClient: [
      { name: 'USER_ONLINE', payload: '{ userId, chatId, lastActive }' },
      { name: 'USER_OFFLINE', payload: '{ userId, chatId, lastActive }' },
      { name: 'MESSAGE_SENT', payload: '{ message: IMessage }' },
      { name: 'MESSAGE_DELIVERED', payload: '{ messageId, chatId, userId }' },
      { name: 'MESSAGE_READ', payload: '{ messageId, chatId, userId }' },
      { name: 'TYPING_START', payload: '{ userId, chatId }' },
      { name: 'TYPING_STOP', payload: '{ userId, chatId }' },
      { name: 'ACK_ERROR', payload: '{ message, chatId?, messageId? }' },
    ],
  },

  // ==========================================
  // Room Naming Convention
  // ==========================================
  rooms: {
    userRoom: 'user::{userId}',
    chatRoom: 'chat::{chatId}',
  },

  // ==========================================
  // Styling Configuration
  // ==========================================
  styling: {
    // Mermaid theme
    theme: 'default',

    // Arrow styles
    arrows: {
      sync: '->>',       // Synchronous call
      async: '-->>',     // Async response
      broadcast: '-)',   // Broadcast to room
    },

    // Colors for HTML
    colors: {
      success: '#27ae60',
      error: '#e74c3c',
      warning: '#f39c12',
      info: '#3498db',
    },
  },

  // ==========================================
  // Bangla Labels
  // ==========================================
  banglaLabels: {
    flows: {
      connection: 'সংযোগ প্রবাহ',
      sendMessage: 'বার্তা পাঠানো',
      typing: 'টাইপিং',
      deliveryStatus: 'ডেলিভারি স্ট্যাটাস',
      roomManagement: 'রুম ব্যবস্থাপনা',
      presence: 'উপস্থিতি',
      disconnect: 'সংযোগ বিচ্ছিন্ন',
    },

    participants: {
      client: 'ক্লায়েন্ট',
      server: 'সার্ভার',
      database: 'ডাটাবেস',
      room: 'রুম',
    },

    actions: {
      connect: 'সংযোগ',
      disconnect: 'সংযোগ বিচ্ছিন্ন',
      send: 'পাঠানো',
      receive: 'গ্রহণ',
      broadcast: 'সম্প্রচার',
      validate: 'যাচাই',
    },
  },

  // ==========================================
  // CLI Configuration
  // ==========================================
  cli: {
    // Default to interactive mode
    interactive: true,

    // Show verbose output
    verbose: true,

    // Show progress indicators
    showProgress: true,

    // Use colors in output
    colors: true,

    // Auto-open browser after generation
    autoOpen: false,
  },
};
