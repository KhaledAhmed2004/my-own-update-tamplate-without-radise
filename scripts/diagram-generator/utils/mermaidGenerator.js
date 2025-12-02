/**
 * Mermaid Generator Utility
 *
 * সমস্ত trace করা information থেকে Mermaid sequence diagram code generate করে
 */

const config = require('../config');

class MermaidGenerator {
  constructor(detailLevel = 'standard') {
    this.detailLevel = detailLevel;
    this.config = config;
    this.participants = new Set();
    this.interactions = [];
    this.notes = [];
    this.participantCounter = {};
  }

  /**
   * Generate Combined REST + Socket.IO Flow Diagram
   *
   * REST call থেকে Socket.IO emit পর্যন্ত complete flow দেখায়
   *
   * @param {Object} endpointMapping - RestSocketMapper থেকে পাওয়া endpoint mapping
   * @returns {string} Mermaid diagram code
   */
  generateCombinedDiagram(endpointMapping) {
    this.reset();

    let diagram = 'sequenceDiagram\n';
    diagram += '    autonumber\n\n';

    // Define participants with emojis
    const participants = [
      { id: 'Client', label: '📱 Client' },
      { id: 'Route', label: '🛤️ Route' },
      { id: 'Controller', label: '🎮 Controller' },
      { id: 'Service', label: '⚙️ Service' },
      { id: 'Database', label: '🗄️ Database' },
      { id: 'SocketIO', label: '🔌 Socket.IO' },
      { id: 'ConnectedClients', label: '👥 Connected Clients' },
    ];

    // Add participants
    participants.forEach(p => {
      diagram += `    participant ${p.id} as ${p.label}\n`;
    });
    diagram += '\n';

    // Title note
    diagram += `    Note over Client,ConnectedClients: 🔗 ${endpointMapping.method} ${endpointMapping.path} → Socket.IO Flow\n\n`;

    // 1. Client → Route (HTTP Request)
    diagram += `    Client->>+Route: ${endpointMapping.method} ${endpointMapping.path}\n`;

    // 2. Middleware chain (if any)
    const middlewares = endpointMapping.middlewareChain?.filter(
      m => m.name !== 'controller'
    );
    if (middlewares && middlewares.length > 0) {
      diagram += `    Note right of Route: Middleware Chain\n`;
      middlewares.forEach(m => {
        if (m.name === 'auth') {
          diagram += `    Route->>Route: 🔐 auth(${m.args || ''})\n`;
        } else if (m.name === 'validateRequest') {
          diagram += `    Route->>Route: ✅ validateRequest(${m.args || ''})\n`;
        } else if (m.name === 'fileHandler') {
          diagram += `    Route->>Route: 📁 fileHandler()\n`;
        }
      });
    }

    // 3. Route → Controller
    if (endpointMapping.controller) {
      const controllerCall = `${endpointMapping.controller.name}.${endpointMapping.controller.method}()`;
      diagram += `    Route->>+Controller: ${controllerCall}\n`;

      // 4. Controller → Service
      if (endpointMapping.service) {
        const serviceCall = `${endpointMapping.service.name}.${endpointMapping.service.method}()`;
        diagram += `    Controller->>+Service: ${serviceCall}\n`;

        // 5. Service → Database (model operations)
        if (endpointMapping.modelOperations && endpointMapping.modelOperations.length > 0) {
          const ops = endpointMapping.modelOperations.slice(0, 3); // Limit to 3 for readability
          ops.forEach(op => {
            diagram += `    Service->>+Database: ${op.model}.${op.operation}()\n`;
            diagram += `    Database-->>-Service: result\n`;
          });

          if (endpointMapping.modelOperations.length > 3) {
            diagram += `    Note right of Database: +${endpointMapping.modelOperations.length - 3} more queries\n`;
          }
        }

        // 6. Socket.IO events (THE KEY PART!)
        if (endpointMapping.socketEvents && endpointMapping.socketEvents.length > 0) {
          diagram += `\n    Note over Service,ConnectedClients: 🔌 Real-time Socket.IO Events\n\n`;

          endpointMapping.socketEvents.forEach(event => {
            // Service → SocketIO
            diagram += `    Service->>SocketIO: emit('${event.event}')\n`;

            // Show target based on event type
            if (event.type === 'room-emit' && event.room) {
              diagram += `    Note right of SocketIO: Room: ${event.room}\n`;
              diagram += `    SocketIO-->>ConnectedClients: ${event.event} → room\n`;
            } else if (event.type === 'user-emit' && event.target) {
              diagram += `    Note right of SocketIO: Target: ${event.target}\n`;
              diagram += `    SocketIO-->>ConnectedClients: ${event.event} → user\n`;
            } else {
              diagram += `    SocketIO-->>ConnectedClients: ${event.event} (broadcast)\n`;
            }
          });
        }

        // 7. Service returns to Controller
        diagram += `\n    Service-->>-Controller: result\n`;
      }

      // 8. Controller returns to Route
      diagram += `    Controller-->>-Route: response\n`;
    }

    // 9. Route returns to Client
    diagram += `    Route-->>-Client: HTTP Response\n`;

    return diagram;
  }

  /**
   * Generate Combined Diagram HTML with full styling
   *
   * @param {string} mermaidCode - Mermaid diagram code
   * @param {Object} endpointMapping - Endpoint mapping data
   * @param {Object} navigation - Optional navigation data
   * @returns {string} HTML content
   */
  generateCombinedHTML(mermaidCode, endpointMapping, navigation = null) {
    const title = `${endpointMapping.method} ${endpointMapping.path} → Socket.IO`;
    const mermaidLiveUrl = this.generateMermaidLiveUrl(mermaidCode);

    // Build socket events info section
    let socketEventsHTML = '';
    if (endpointMapping.socketEvents && endpointMapping.socketEvents.length > 0) {
      socketEventsHTML = `
        <div class="socket-events-section">
          <h3>🔌 Socket.IO Events Emitted</h3>
          <table class="events-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Type</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              ${endpointMapping.socketEvents
                .map(
                  e => `
                <tr>
                  <td><code>${e.event}</code></td>
                  <td><span class="event-type ${e.type}">${e.type}</span></td>
                  <td>${e.room || e.target || 'broadcast'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Build flow trace section
    let flowTraceHTML = '';
    if (endpointMapping.flow && endpointMapping.flow.length > 0) {
      flowTraceHTML = `
        <div class="flow-trace-section">
          <h3>📍 Execution Flow</h3>
          <div class="flow-items">
            ${endpointMapping.flow
              .map((step, idx) => {
                let icon = '📌';
                let className = '';
                if (step.type === 'controller') {
                  icon = '🎮';
                  className = 'controller';
                } else if (step.type === 'service') {
                  icon = '⚙️';
                  className = 'service';
                } else if (step.type === 'socket') {
                  icon = '🔌';
                  className = 'socket';
                }

                const content =
                  step.type === 'socket'
                    ? `emit('${step.event}')`
                    : step.name;

                return `
                  <div class="flow-item ${className}">
                    <span class="flow-number">${idx + 1}</span>
                    <span class="flow-icon">${icon}</span>
                    <span class="flow-content">${content}</span>
                  </div>
                  ${idx < endpointMapping.flow.length - 1 ? '<div class="flow-arrow">↓</div>' : ''}
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Combined Flow Diagram</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
            margin-top: 0;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        .method-badge {
            font-size: 14px;
            font-weight: 700;
            padding: 6px 14px;
            border-radius: 6px;
            text-transform: uppercase;
        }
        .method-get { background: #28a745; color: white; }
        .method-post { background: #007bff; color: white; }
        .method-put { background: #ffc107; color: #333; }
        .method-patch { background: #17a2b8; color: white; }
        .method-delete { background: #dc3545; color: white; }

        .socket-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 20px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 25px;
        }
        .info-card {
            background: #f8f9fa;
            padding: 15px 20px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .info-card h4 {
            margin: 0 0 10px 0;
            color: #555;
            font-size: 14px;
        }
        .info-card p {
            margin: 0;
            font-size: 15px;
            color: #333;
        }

        .socket-events-section, .flow-trace-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .socket-events-section h3, .flow-trace-section h3 {
            margin-top: 0;
            color: #333;
        }
        .events-table {
            width: 100%;
            border-collapse: collapse;
        }
        .events-table th, .events-table td {
            padding: 10px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .events-table th {
            background: #667eea;
            color: white;
        }
        .events-table code {
            background: #e9ecef;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'Consolas', monospace;
        }
        .event-type {
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .event-type.room-emit { background: #d4edda; color: #155724; }
        .event-type.user-emit { background: #cce5ff; color: #004085; }
        .event-type.broadcast { background: #fff3cd; color: #856404; }

        .flow-items {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
        }
        .flow-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .flow-item.socket {
            background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
            border: 1px solid #667eea;
        }
        .flow-number {
            background: #667eea;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
        }
        .flow-arrow {
            color: #667eea;
            font-size: 18px;
            margin-left: 40px;
        }

        .mermaid {
            margin-top: 25px;
            padding: 25px;
            background: #fafafa;
            border-radius: 10px;
            border: 1px solid #eee;
            overflow-x: auto;
        }
        .actions {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            font-weight: 500;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .btn-success {
            background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
            color: white;
        }
        .btn-secondary {
            background: linear-gradient(135deg, #6c757d 0%, #545b62 100%);
            color: white;
        }
        .code-section {
            margin-top: 30px;
            display: none;
        }
        .code-section.show { display: block; }
        .code-block {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Consolas', monospace;
            font-size: 13px;
            line-height: 1.5;
            white-space: pre;
        }
        .copied-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            display: none;
            animation: fadeIn 0.3s;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
            z-index: 1000;
        }
        .copied-toast.show { display: block; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>
            <span class="method-badge method-${endpointMapping.method.toLowerCase()}">${endpointMapping.method}</span>
            <span>${endpointMapping.path}</span>
            <span class="socket-badge">🔌 + Socket.IO</span>
        </h1>

        <div class="info-grid">
            <div class="info-card">
                <h4>🎮 Controller</h4>
                <p>${endpointMapping.controller ? `${endpointMapping.controller.name}.${endpointMapping.controller.method}()` : 'N/A'}</p>
            </div>
            <div class="info-card">
                <h4>⚙️ Service</h4>
                <p>${endpointMapping.service ? `${endpointMapping.service.name}.${endpointMapping.service.method}()` : 'N/A'}</p>
            </div>
            <div class="info-card">
                <h4>🔌 Socket Events</h4>
                <p>${endpointMapping.socketEvents?.length || 0} event(s) emitted</p>
            </div>
            <div class="info-card">
                <h4>📅 Generated</h4>
                <p>${new Date().toLocaleString()}</p>
            </div>
        </div>

        ${socketEventsHTML}
        ${flowTraceHTML}

        <div class="actions">
            <a href="${mermaidLiveUrl}" target="_blank" class="btn btn-primary">
                🌐 Mermaid Live Editor
            </a>
            <button onclick="copyCode()" class="btn btn-success">
                📋 Copy Code
            </button>
            <button onclick="toggleCode()" class="btn btn-secondary">
                👁️ Show/Hide Code
            </button>
        </div>

        <div class="mermaid">
${mermaidCode}
        </div>

        <div class="code-section" id="codeSection">
            <h3>📝 Mermaid Code</h3>
            <div class="code-block" id="mermaidCode">${this.escapeHtml(mermaidCode)}</div>
        </div>
    </div>

    <div class="copied-toast" id="toast">✅ Code copied to clipboard!</div>

    <script>
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            sequence: {
                diagramMarginX: 50,
                diagramMarginY: 10,
                actorMargin: 50,
                width: 150,
                height: 65,
                boxMargin: 10,
                boxTextMargin: 5,
                noteMargin: 10,
                messageMargin: 35,
                mirrorActors: true,
                useMaxWidth: true
            }
        });

        const rawMermaidCode = \`${mermaidCode.replace(/`/g, '\\`')}\`;

        function copyCode() {
            navigator.clipboard.writeText(rawMermaidCode).then(() => {
                const toast = document.getElementById('toast');
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            });
        }

        function toggleCode() {
            const section = document.getElementById('codeSection');
            section.classList.toggle('show');
        }
    </script>
</body>
</html>`;
  }

  /**
   * Main method: Generate complete Mermaid diagram
   *
   * @param {Object} flowData - Complete flow data
   * @returns {string} Mermaid diagram code
   */
  generate(flowData) {
    this.reset();

    // Header
    let diagram = 'sequenceDiagram\n';

    // Add autonumber if timing is enabled
    if (this.config.detail.showTiming) {
      diagram += '    autonumber\n';
    }

    // Build interactions
    this.buildInteractions(flowData);

    // Add participants
    const participants = Array.from(this.participants);
    participants.forEach(p => {
      diagram += `    participant ${p}\n`;
    });

    diagram += '\n';

    // Add interactions
    this.interactions.forEach(interaction => {
      diagram += interaction + '\n';
    });

    return diagram;
  }

  /**
   * Reset generator state
   */
  reset() {
    this.participants = new Set();
    this.interactions = [];
    this.notes = [];
    this.participantCounter = {};
  }

  /**
   * Build complete interaction flow
   */
  buildInteractions(flowData) {
    const { route, endpoint, controller, service, module } = flowData;

    // 1. Client to Route
    this.addParticipant('Client');
    this.addParticipant('Route');
    this.addInteraction(
      'Client',
      'Route',
      `${endpoint.method} ${endpoint.path}`,
      'request'
    );

    // 2. Middleware chain
    if (endpoint.middlewareChain && this.config.detail.showMiddleware) {
      this.buildMiddlewareChain(endpoint.middlewareChain);
    }

    // 3. Controller
    if (controller) {
      this.buildControllerFlow(controller, endpoint);
    }

    // 4. Service
    if (service) {
      this.buildServiceFlow(service, controller);
    }

    // 5. Response back
    this.buildResponseFlow(controller);
  }

  /**
   * Build middleware chain interactions
   */
  buildMiddlewareChain(middlewareChain) {
    middlewareChain.forEach(middleware => {
      if (middleware.name === 'controller') return; // Skip controller, handle separately

      const middlewareName = this.getMiddlewareDisplayName(middleware.name);
      this.addParticipant(middlewareName);

      this.addInteraction('Route', middlewareName, 'Validate', 'activate');

      // Add note based on middleware type
      if (this.config.detail.banglaComments) {
        const note = this.getBanglaNote(middleware.name);
        if (note) {
          this.addNote(middlewareName, note);
        }
      }

      // Show middleware details
      if (middleware.name === 'auth' && middleware.args) {
        this.addNote(middlewareName, `Roles: ${middleware.args}`);
      }

      if (middleware.name === 'validateRequest' && middleware.args) {
        this.addNote(middlewareName, `Schema: ${middleware.args}`);
      }

      this.addInteraction(middlewareName, 'Route', 'Valid ✓', 'deactivate');
    });
  }

  /**
   * Build controller flow
   */
  buildControllerFlow(controller, endpoint) {
    const controllerName = 'Controller';
    this.addParticipant(controllerName);

    const controllerMethod = endpoint.middlewareChain.find(
      m => m.name === 'controller'
    );

    if (controllerMethod) {
      const methodName = `${controllerMethod.controller}.${controllerMethod.method}`;
      this.addInteraction('Route', controllerName, methodName, 'activate');

      // Show request data extraction
      if (
        controller.requestData &&
        this.config.detail.showPayload &&
        controller.requestData.fromBody.length > 0
      ) {
        const bodyFields = controller.requestData.fromBody.join(', ');
        this.addNote(
          controllerName,
          `📥 Extract from req.body: {${bodyFields}}`
        );
      }
    }
  }

  /**
   * Build service flow
   */
  buildServiceFlow(service, controller) {
    const serviceName = 'Service';
    this.addParticipant(serviceName);

    // Controller calls service
    if (controller && controller.serviceCalls.length > 0) {
      const firstCall = controller.serviceCalls[0];
      const callName = `${firstCall.serviceName}.${firstCall.methodName}()`;

      this.addInteraction('Controller', serviceName, callName, 'activate');

      // Service operations
      if (service.modelOperations && service.modelOperations.length > 0) {
        this.buildModelOperations(service.modelOperations);
      }

      // Helper calls
      if (
        service.helperCalls &&
        service.helperCalls.length > 0 &&
        this.config.analysis.includeHelpers
      ) {
        this.buildHelperCalls(service.helperCalls);
      }

      // Socket.IO events
      if (
        service.socketEvents &&
        service.socketEvents.length > 0 &&
        this.config.analysis.includeSocketIO
      ) {
        this.buildSocketEvents(service.socketEvents);
      }

      // External APIs
      if (
        service.externalAPICalls &&
        service.externalAPICalls.length > 0 &&
        this.config.analysis.includeExternalAPIs
      ) {
        this.buildExternalAPICalls(service.externalAPICalls);
      }

      // Service returns to controller
      this.addInteraction(serviceName, 'Controller', 'result', 'deactivate');
    }
  }

  /**
   * Build model (database) operations
   */
  buildModelOperations(operations) {
    const dbName = 'Database';
    this.addParticipant(dbName);

    operations.forEach((op, index) => {
      if (index >= 3 && this.detailLevel === 'overview') return; // Limit in overview

      const query = `${op.model}.${op.operation}(${op.query || '...'})`;
      this.addInteraction('Service', dbName, query, 'activate');

      if (this.config.detail.banglaComments) {
        this.addNote(dbName, this.config.banglaComments.databaseQuery);
      }

      this.addInteraction(dbName, 'Service', 'result', 'deactivate');
    });
  }

  /**
   * Build helper function calls
   */
  buildHelperCalls(helperCalls) {
    helperCalls.forEach(helper => {
      const helperName = `Helper_${helper.helper}`;
      this.addParticipant(helperName);

      this.addInteraction('Service', helperName, `${helper.helper}()`, 'sync');
      this.addInteraction(helperName, 'Service', 'result', 'return');
    });
  }

  /**
   * Build Socket.IO events
   */
  buildSocketEvents(events) {
    const socketName = 'SocketIO';
    this.addParticipant(socketName);

    events.forEach(event => {
      this.addInteraction(
        'Service',
        socketName,
        `emit('${event.event}')`,
        'sync'
      );

      if (this.config.detail.banglaComments) {
        this.addNote(socketName, this.config.banglaComments.socketEmit);
      }

      // Socket to clients
      this.addParticipant('ConnectedClients');
      this.addInteraction(
        socketName,
        'ConnectedClients',
        event.event,
        'async'
      );
    });
  }

  /**
   * Build external API calls
   */
  buildExternalAPICalls(apiCalls) {
    apiCalls.forEach(api => {
      const apiName = api.api.replace(/\s+/g, '_');
      this.addParticipant(apiName);

      this.addInteraction(
        'Service',
        apiName,
        `${api.method}()`,
        'activate'
      );

      if (this.config.detail.banglaComments) {
        this.addNote(apiName, this.config.banglaComments.externalAPI);
      }

      this.addInteraction(apiName, 'Service', 'response', 'deactivate');
    });
  }

  /**
   * Build response flow back to client
   */
  buildResponseFlow(controller) {
    // Only add Controller interactions if Controller participant was declared
    const hasController = this.participants.has('Controller');

    if (hasController && controller && controller.responseData) {
      const { statusCode, message } = controller.responseData;

      let responseText = statusCode ? `${statusCode}` : '200 OK';
      if (message && this.config.detail.showPayload) {
        responseText += ` - ${message}`;
      }

      this.addInteraction('Controller', 'Route', responseText, 'deactivate');
      this.addInteraction('Route', 'Client', 'Response', 'return');

      if (this.config.detail.showPayload && message) {
        this.addNote('Client', `✅ ${message}`);
      }
    } else if (hasController) {
      this.addInteraction('Controller', 'Route', 'Response', 'deactivate');
      this.addInteraction('Route', 'Client', 'Success', 'return');
    } else {
      // No controller traced - just return from Route to Client
      this.addInteraction('Route', 'Client', '200 OK', 'return');
    }
  }

  /**
   * Add participant
   */
  addParticipant(name) {
    this.participants.add(name);
  }

  /**
   * Add interaction between participants
   */
  addInteraction(from, to, message, type = 'sync') {
    const arrow = this.getArrow(type);
    const indent = '    ';

    this.interactions.push(`${indent}${from}${arrow}${to}: ${message}`);
  }

  /**
   * Add note
   */
  addNote(participant, text) {
    const indent = '    ';
    // Escape special characters
    const escapedText = text.replace(/:/g, '&#58;').replace(/\n/g, '<br/>');
    this.interactions.push(
      `${indent}Note over ${participant}: ${escapedText}`
    );
  }

  /**
   * Get arrow type
   */
  getArrow(type) {
    const arrows = {
      sync: '->>',
      async: '-->>',
      return: '-->>',
      activate: '->>+',
      deactivate: '->>-',
      request: '->>+',
    };

    return arrows[type] || '->';
  }

  /**
   * Get middleware display name
   */
  getMiddlewareDisplayName(middlewareName) {
    const names = {
      auth: 'Auth_Middleware',
      validateRequest: 'Validation',
      fileHandler: 'FileHandler',
      rateLimit: 'RateLimit',
    };

    return names[middlewareName] || middlewareName;
  }

  /**
   * Get Bangla note for middleware
   */
  getBanglaNote(middlewareName) {
    const notes = {
      auth: this.config.banglaComments.authentication,
      validateRequest: this.config.banglaComments.validation,
    };

    return notes[middlewareName] || null;
  }

  /**
   * Generate HTML preview with sidebar navigation
   * @param {string} mermaidCode - The mermaid diagram code
   * @param {string} title - The diagram title (e.g., "POST /login")
   * @param {Object} navigation - Navigation data with allRoutes and currentRoute
   */
  generateHTML(mermaidCode, title, navigation = null) {
    // Create Mermaid Live Editor URL
    const mermaidLiveUrl = this.generateMermaidLiveUrl(mermaidCode);

    // Build sidebar HTML if navigation data is provided
    const sidebarHTML = navigation ? this.buildSidebarHTML(navigation) : '';
    const hasSidebar = navigation && navigation.allRoutes && Object.keys(navigation.allRoutes).length > 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Sequence Diagram</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f0f2f5;
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar Styles */
        .sidebar {
            width: 280px;
            background: #1a1a2e;
            color: #eee;
            padding: 0;
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            overflow-y: auto;
            z-index: 100;
            transition: transform 0.3s ease;
        }
        .sidebar-header {
            background: #16213e;
            padding: 20px;
            border-bottom: 1px solid #0f3460;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .sidebar-header h2 {
            margin: 0;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .sidebar-content {
            padding: 15px;
        }

        /* Module Section */
        .module-section {
            margin-bottom: 15px;
        }
        .module-header {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            background: #16213e;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            user-select: none;
        }
        .module-header:hover {
            background: #0f3460;
        }
        .module-header.active {
            background: #0f3460;
            border-left: 3px solid #e94560;
        }
        .module-icon {
            margin-right: 10px;
            transition: transform 0.2s;
        }
        .module-header.collapsed .module-icon {
            transform: rotate(-90deg);
        }
        .module-name {
            flex: 1;
            font-weight: 600;
            font-size: 14px;
        }
        .module-count {
            background: #e94560;
            color: white;
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 10px;
        }

        /* Route List */
        .route-list {
            margin-top: 5px;
            padding-left: 10px;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        .route-list.collapsed {
            max-height: 0 !important;
        }
        .route-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border-radius: 6px;
            margin: 3px 0;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            color: #ccc;
            font-size: 13px;
        }
        .route-item:hover {
            background: rgba(233, 69, 96, 0.1);
            color: #fff;
        }
        .route-item.current {
            background: #e94560;
            color: white;
        }
        .route-item.current .method-badge {
            background: white;
            color: #e94560;
        }

        /* Method Badges */
        .method-badge {
            font-size: 10px;
            font-weight: 700;
            padding: 3px 6px;
            border-radius: 4px;
            margin-right: 8px;
            min-width: 50px;
            text-align: center;
            text-transform: uppercase;
        }
        .method-get { background: #28a745; color: white; }
        .method-post { background: #007bff; color: white; }
        .method-put { background: #ffc107; color: #333; }
        .method-patch { background: #17a2b8; color: white; }
        .method-delete { background: #dc3545; color: white; }

        .route-path {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Toggle Button for Mobile */
        .sidebar-toggle {
            display: none;
            position: fixed;
            left: 10px;
            top: 10px;
            z-index: 200;
            background: #1a1a2e;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 18px;
        }

        /* Main Content */
        .main-content {
            flex: 1;
            margin-left: ${hasSidebar ? '280px' : '0'};
            padding: 20px;
            transition: margin-left 0.3s ease;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #007bff;
            padding-bottom: 15px;
            margin-top: 0;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        h1 .method-badge {
            font-size: 14px;
            padding: 6px 12px;
        }
        .mermaid {
            margin-top: 25px;
            padding: 25px;
            background: #fafafa;
            border-radius: 10px;
            border: 1px solid #eee;
            overflow-x: auto;
        }
        .info {
            background: linear-gradient(135deg, #e7f3ff 0%, #f0f7ff 100%);
            padding: 15px 20px;
            border-left: 4px solid #007bff;
            border-radius: 0 8px 8px 0;
            margin-bottom: 20px;
        }
        .info p {
            margin: 5px 0;
            font-size: 14px;
        }
        .actions {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            font-weight: 500;
        }
        .btn-primary {
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        }
        .btn-success {
            background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
            color: white;
        }
        .btn-success:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }
        .btn-secondary {
            background: linear-gradient(135deg, #6c757d 0%, #545b62 100%);
            color: white;
        }
        .btn-secondary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
        }
        .code-section {
            margin-top: 30px;
            display: none;
        }
        .code-section.show {
            display: block;
        }
        .code-section h3 {
            margin-bottom: 10px;
            color: #333;
        }
        .code-block {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
            line-height: 1.5;
            white-space: pre;
        }
        .copied-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            display: none;
            animation: fadeIn 0.3s;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
            z-index: 1000;
        }
        .copied-toast.show {
            display: block;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* No Sidebar State */
        .no-sidebar .main-content {
            margin-left: 0;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
            }
            .sidebar.open {
                transform: translateX(0);
            }
            .sidebar-toggle {
                display: block;
            }
            .main-content {
                margin-left: 0 !important;
            }
        }
    </style>
</head>
<body class="${hasSidebar ? '' : 'no-sidebar'}">
    ${hasSidebar ? '<button class="sidebar-toggle" onclick="toggleSidebar()">☰</button>' : ''}

    ${sidebarHTML}

    <div class="main-content">
        <div class="container">
            <h1>📊 ${title}</h1>

            <div class="info">
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Detail Level:</strong> ${this.detailLevel}</p>
            </div>

            <div class="actions">
                <a href="${mermaidLiveUrl}" target="_blank" class="btn btn-primary">
                    🌐 Mermaid Live Editor
                </a>
                <button onclick="copyCode()" class="btn btn-success">
                    📋 Copy Code
                </button>
                <button onclick="toggleCode()" class="btn btn-secondary">
                    👁️ Show/Hide Code
                </button>
            </div>

            <div class="mermaid">
${mermaidCode}
            </div>

            <div class="code-section" id="codeSection">
                <h3>📝 Mermaid Code</h3>
                <div class="code-block" id="mermaidCode">${this.escapeHtml(mermaidCode)}</div>
            </div>
        </div>
    </div>

    <div class="copied-toast" id="toast">✅ Code copied to clipboard!</div>

    <script>
        // Initialize Mermaid
        mermaid.initialize({
            startOnLoad: true,
            theme: '${this.config.mermaid.theme}',
            sequence: ${JSON.stringify(this.config.mermaid.sequence)}
        });

        // Raw Mermaid code for copying
        const rawMermaidCode = \`${mermaidCode.replace(/`/g, '\\`')}\`;

        // Copy code to clipboard
        function copyCode() {
            navigator.clipboard.writeText(rawMermaidCode).then(() => {
                const toast = document.getElementById('toast');
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            });
        }

        // Toggle code visibility
        function toggleCode() {
            const section = document.getElementById('codeSection');
            section.classList.toggle('show');
        }

        // Toggle module section
        function toggleModule(moduleName) {
            const header = document.querySelector(\`[data-module="\${moduleName}"]\`);
            const routeList = document.getElementById(\`routes-\${moduleName}\`);

            if (header && routeList) {
                header.classList.toggle('collapsed');
                routeList.classList.toggle('collapsed');
            }
        }

        // Toggle sidebar (mobile)
        function toggleSidebar() {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        }

        // Expand current module on load
        document.addEventListener('DOMContentLoaded', function() {
            const currentRoute = document.querySelector('.route-item.current');
            if (currentRoute) {
                const moduleSection = currentRoute.closest('.module-section');
                if (moduleSection) {
                    const header = moduleSection.querySelector('.module-header');
                    const routeList = moduleSection.querySelector('.route-list');
                    if (header && routeList) {
                        header.classList.remove('collapsed');
                        routeList.classList.remove('collapsed');
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }

  /**
   * Build sidebar HTML from navigation data
   */
  buildSidebarHTML(navigation) {
    const { allRoutes, currentRoute, currentModule } = navigation;

    if (!allRoutes || Object.keys(allRoutes).length === 0) {
      return '';
    }

    let html = `
    <nav class="sidebar">
        <div class="sidebar-header">
            <h2>📁 API Routes</h2>
        </div>
        <div class="sidebar-content">`;

    // Sort modules alphabetically
    const sortedModules = Object.keys(allRoutes).sort();

    for (const moduleName of sortedModules) {
      const routes = allRoutes[moduleName];
      const isCurrentModule = moduleName === currentModule;
      const isCollapsed = !isCurrentModule;

      html += `
            <div class="module-section">
                <div class="module-header ${isCollapsed ? 'collapsed' : ''} ${isCurrentModule ? 'active' : ''}"
                     data-module="${moduleName}"
                     onclick="toggleModule('${moduleName}')">
                    <span class="module-icon">▼</span>
                    <span class="module-name">${moduleName}</span>
                    <span class="module-count">${routes.length}</span>
                </div>
                <div class="route-list ${isCollapsed ? 'collapsed' : ''}"
                     id="routes-${moduleName}"
                     style="max-height: ${isCollapsed ? '0' : routes.length * 40 + 'px'}">`;

      for (const route of routes) {
        const isCurrent = currentRoute &&
                          route.method === currentRoute.method &&
                          route.path === currentRoute.path;
        const methodClass = `method-${route.method.toLowerCase()}`;

        html += `
                    <a href="${route.htmlFile}" class="route-item ${isCurrent ? 'current' : ''}">
                        <span class="method-badge ${methodClass}">${route.method}</span>
                        <span class="route-path">${route.path}</span>
                    </a>`;
      }

      html += `
                </div>
            </div>`;
    }

    html += `
        </div>
    </nav>`;

    return html;
  }

  /**
   * Generate Mermaid Live Editor URL
   * mermaid.live uses base64 encoded JSON state
   */
  generateMermaidLiveUrl(mermaidCode) {
    try {
      const state = {
        code: mermaidCode,
        mermaid: { theme: 'default' },
        autoSync: true,
        updateDiagram: true,
      };

      // Base64 encode the state
      const jsonState = JSON.stringify(state);
      const base64State = Buffer.from(jsonState).toString('base64');

      // URL-safe base64
      const urlSafeBase64 = base64State
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      return `https://mermaid.live/edit#base64:${urlSafeBase64}`;
    } catch (error) {
      // Fallback to simple URL if encoding fails
      return 'https://mermaid.live/edit';
    }
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = MermaidGenerator;
