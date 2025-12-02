/**
 * ERD Generator
 *
 * Mermaid ERD syntax generate করে এবং HTML preview তৈরি করে
 */

const config = require('../config');

class ERDGenerator {
  constructor(detailLevel = 'standard') {
    this.detailLevel = detailLevel;
    this.levelConfig = config.detailLevels[detailLevel] || config.detailLevels.standard;
    this.entities = new Map();
    this.relationships = [];
    this.allModels = {};
  }

  /**
   * Generate Mermaid ERD code from parsed schemas
   * @param {Object[]} schemas - Array of parsed schema objects
   * @returns {string} Mermaid ERD code
   */
  generate(schemas) {
    this.entities.clear();
    this.relationships = [];

    // Process each schema
    for (const schema of schemas) {
      this.processSchema(schema);
    }

    // Build Mermaid code
    return this.buildMermaidCode();
  }

  /**
   * Process a single schema
   * @param {Object} schema - Parsed schema object
   */
  processSchema(schema) {
    const entityName = schema.modelName.toUpperCase();

    // Build entity definition
    const entity = {
      name: entityName,
      displayName: schema.modelName,
      fields: [],
      embeddedDocs: [],
    };

    // Add fields
    for (const field of schema.fields) {
      if (this.levelConfig.showFields) {
        entity.fields.push(this.formatField(field));
      }

      // Track relationships
      if (field.reference) {
        this.relationships.push({
          from: entityName,
          to: field.reference.toUpperCase(),
          field: field.name,
          type: field.isArray ? 'oneToMany' : 'manyToOne',
          label: field.name,
          cardinality: field.cardinality || 'N:1',
          isPolymorphic: false,
        });
      }

      // Track polymorphic relationships
      if (field.isPolymorphic && field.polymorphicTargets) {
        for (const target of field.polymorphicTargets) {
          this.relationships.push({
            from: entityName,
            to: target.toUpperCase(),
            field: field.name,
            type: 'manyToOne',
            label: field.name,
            cardinality: field.cardinality || 'N:1',
            isPolymorphic: true,
          });
        }
      }

      // Track embedded documents
      if (field.isEmbedded && field.embeddedFields && this.levelConfig.showEmbedded) {
        entity.embeddedDocs.push({
          name: field.name,
          isArray: field.isArray,
          fields: field.embeddedFields,
        });
      }
    }

    this.entities.set(entityName, entity);
  }

  /**
   * Format a field for Mermaid ERD
   * @param {Object} field - Field object
   * @returns {Object} Formatted field
   */
  formatField(field) {
    let type = field.type;
    let key = '';
    let comment = '';

    // Primary key
    if (field.isPrimaryKey) {
      key = 'PK';
    }
    // Foreign key
    else if (field.reference) {
      key = 'FK';
    }
    // Unique key
    else if (field.isUnique) {
      key = 'UK';
    }

    // Build comment
    const commentParts = [];

    if (field.isRequired && !field.isPrimaryKey) {
      commentParts.push('required');
    }

    if (field.isIndexed && !field.isUnique) {
      commentParts.push('indexed');
    }

    if (field.enumValues && field.enumValues.length > 0) {
      const enumDisplay = field.enumValues.slice(0, 3).join(', ');
      commentParts.push(`enum: ${enumDisplay}${field.enumValues.length > 3 ? '...' : ''}`);
    }

    if (field.reference) {
      commentParts.push(`ref: ${field.reference}`);
    }

    // Show polymorphic indicator
    if (field.isPolymorphic) {
      const targets = field.polymorphicTargets || [];
      commentParts.push(`polymorphic: ${targets.join('|') || 'dynamic'}`);
    }

    if (field.isEmbedded) {
      commentParts.push(field.isArray ? 'embedded[]' : 'embedded');
    }

    if (field.defaultValue && this.detailLevel === 'detailed') {
      commentParts.push(`default: ${field.defaultValue}`);
    }

    if (commentParts.length > 0) {
      comment = commentParts.join(', ');
    }

    return {
      name: field.name,
      type,
      key,
      comment,
      isEmbedded: field.isEmbedded,
    };
  }

  /**
   * Build Mermaid ERD code
   * @returns {string} Mermaid ERD code
   */
  buildMermaidCode() {
    let code = 'erDiagram\n';

    // Add entities
    for (const [name, entity] of this.entities) {
      code += this.buildEntityBlock(entity);
    }

    // Add relationships
    code += '\n    %% Relationships\n';
    for (const rel of this.relationships) {
      code += this.buildRelationship(rel);
    }

    return code;
  }

  /**
   * Build entity block
   * @param {Object} entity - Entity object
   * @returns {string} Mermaid entity block
   */
  buildEntityBlock(entity) {
    let block = `\n    ${entity.name} {\n`;

    for (const field of entity.fields) {
      // Skip embedded fields in main listing (they're shown separately)
      if (field.isEmbedded && this.levelConfig.showEmbedded) {
        block += `        ${field.type} ${field.name}`;
        if (field.key) {
          block += ` ${field.key}`;
        }
        block += ` "${field.comment || 'nested'}"\n`;
      } else {
        block += `        ${field.type} ${field.name}`;
        if (field.key) {
          block += ` ${field.key}`;
        }
        if (field.comment) {
          block += ` "${field.comment}"`;
        }
        block += '\n';
      }
    }

    block += '    }\n';

    // Add embedded document entities if detailed mode
    if (this.levelConfig.showEmbedded) {
      for (const embedded of entity.embeddedDocs) {
        block += this.buildEmbeddedEntity(entity.name, embedded);
      }
    }

    return block;
  }

  /**
   * Build embedded document entity
   * @param {string} parentName - Parent entity name
   * @param {Object} embedded - Embedded document object
   * @returns {string} Mermaid entity block for embedded doc
   */
  buildEmbeddedEntity(parentName, embedded) {
    const embeddedName = `${parentName}_${embedded.name.toUpperCase()}`;
    let block = `\n    ${embeddedName} {\n`;

    for (const field of embedded.fields) {
      block += `        ${field.type} ${field.name}`;
      if (field.constraints && field.constraints.length > 0) {
        block += ` "${field.constraints.join(', ')}"`;
      }
      block += '\n';
    }

    block += '    }\n';

    // Add relationship from parent to embedded
    const relType = embedded.isArray ? '||--o{' : '||--||';
    block += `    ${parentName} ${relType} ${embeddedName} : "embeds"\n`;

    return block;
  }

  /**
   * Build relationship line
   * @param {Object} rel - Relationship object
   * @returns {string} Mermaid relationship line
   */
  buildRelationship(rel) {
    // Skip if target entity doesn't exist
    if (!this.entities.has(rel.to)) {
      return `    %% ${rel.from} -> ${rel.to} (${rel.label}) - target not found\n`;
    }

    // Get appropriate arrow based on cardinality
    const relSymbol = this.getCardinalityArrow(rel.cardinality, rel.isPolymorphic);

    // Build label with cardinality info
    let label = rel.label;
    if (rel.cardinality) {
      label = `${rel.label} (${rel.cardinality})`;
    }
    if (rel.isPolymorphic) {
      label = `${rel.label} (poly)`;
    }

    return `    ${rel.from} ${relSymbol} ${rel.to} : "${label}"\n`;
  }

  /**
   * Get arrow symbol based on cardinality
   * @param {string} cardinality - Cardinality type (1:1, N:1, M:N)
   * @param {boolean} isPolymorphic - Whether this is a polymorphic reference
   * @returns {string} Mermaid arrow symbol
   */
  getCardinalityArrow(cardinality, isPolymorphic = false) {
    // Use dotted lines for polymorphic relationships
    if (isPolymorphic) {
      switch (cardinality) {
        case '1:1':
          return '||..||';
        case 'M:N':
          return '}o..o{';
        case 'N:1':
        default:
          return '}o..||';
      }
    }

    // Solid lines for regular relationships
    switch (cardinality) {
      case '1:1':
        return '||--||';
      case 'M:N':
        return '}o--o{';
      case 'N:1':
      default:
        return '}o--||';
    }
  }

  /**
   * Get Mermaid relationship symbol
   * @param {string} type - Relationship type
   * @returns {string} Mermaid symbol
   */
  getRelationshipSymbol(type) {
    const symbols = {
      oneToOne: '||--||',
      oneToMany: '||--o{',
      manyToOne: '}o--||',
      manyToMany: '}o--o{',
    };

    return symbols[type] || '||--||';
  }

  /**
   * Generate HTML preview
   * @param {string} mermaidCode - Mermaid ERD code
   * @param {string} title - Diagram title
   * @param {Object} navigation - Navigation data for sidebar
   * @returns {string} HTML content
   */
  generateHTML(mermaidCode, title, navigation = null) {
    const mermaidLiveUrl = this.generateMermaidLiveUrl(mermaidCode);
    const sidebarHTML = navigation ? this.buildSidebarHTML(navigation) : '';
    const hasSidebar = navigation && navigation.allModels && Object.keys(navigation.allModels).length > 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Schema Diagram</title>
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
            background: #1e3a5f;
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
            background: #152a45;
            padding: 20px;
            border-bottom: 1px solid #0d1f33;
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

        /* Model List */
        .model-item {
            display: flex;
            align-items: center;
            padding: 12px 15px;
            border-radius: 8px;
            margin: 5px 0;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            color: #ccc;
            font-size: 14px;
            background: rgba(255,255,255,0.05);
        }
        .model-item:hover {
            background: rgba(52, 152, 219, 0.2);
            color: #fff;
        }
        .model-item.current {
            background: #3498db;
            color: white;
        }
        .model-icon {
            margin-right: 10px;
            font-size: 18px;
        }
        .model-name {
            flex: 1;
            font-weight: 500;
        }
        .model-fields {
            background: rgba(255,255,255,0.1);
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 11px;
        }

        /* Section Divider */
        .sidebar-section {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .sidebar-section-title {
            font-size: 12px;
            text-transform: uppercase;
            color: #8e9eaf;
            margin-bottom: 10px;
            padding-left: 5px;
        }

        /* Full ERD Link */
        .full-erd-link {
            display: flex;
            align-items: center;
            padding: 15px;
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            border-radius: 8px;
            color: white;
            text-decoration: none;
            font-weight: 600;
            margin-top: 10px;
            transition: all 0.2s;
        }
        .full-erd-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4);
        }

        /* Toggle Button for Mobile */
        .sidebar-toggle {
            display: none;
            position: fixed;
            left: 10px;
            top: 10px;
            z-index: 200;
            background: #1e3a5f;
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
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 15px;
            margin-top: 0;
            display: flex;
            align-items: center;
            gap: 12px;
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
            background: linear-gradient(135deg, #e8f6ff 0%, #f0f9ff 100%);
            padding: 15px 20px;
            border-left: 4px solid #3498db;
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
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        }
        .btn-success {
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            color: white;
        }
        .btn-success:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
        }
        .btn-secondary {
            background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
            color: white;
        }
        .btn-secondary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(149, 165, 166, 0.3);
        }
        .code-section {
            margin-top: 30px;
            display: none;
        }
        .code-section.show {
            display: block;
        }
        .code-section h3 {
            margin-bottom: 15px;
            color: #2c3e50;
        }
        .code-block {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 13px;
            line-height: 1.5;
            white-space: pre;
        }
        .copied-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            display: none;
            animation: fadeIn 0.3s;
            box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
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

        /* Legend */
        .legend {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
        }
        .legend-badge {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        .legend-pk { background: #f1c40f; color: #333; }
        .legend-fk { background: #3498db; color: white; }
        .legend-uk { background: #2ecc71; color: white; }
        .legend-embedded { background: #e74c3c; color: white; }
        .legend-poly { background: #9b59b6; color: white; }
        .legend-cardinality { background: #34495e; color: white; }

        /* Zoom Controls */
        .zoom-controls {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #2c3e50;
            padding: 8px 12px;
            border-radius: 8px;
            margin-left: auto;
        }
        .zoom-btn {
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 6px;
            background: #3498db;
            color: white;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .zoom-btn:hover {
            background: #2980b9;
            transform: scale(1.1);
        }
        .zoom-btn:active {
            transform: scale(0.95);
        }
        .zoom-level {
            color: white;
            font-size: 13px;
            min-width: 50px;
            text-align: center;
            font-weight: 600;
        }
        .zoom-btn-reset {
            background: #95a5a6;
            font-size: 12px;
            width: auto;
            padding: 0 10px;
        }
        .zoom-btn-reset:hover {
            background: #7f8c8d;
        }

        /* Diagram Container with Zoom */
        .diagram-wrapper {
            overflow: auto;
            border: 1px solid #eee;
            border-radius: 10px;
            margin-top: 25px;
            background: #fafafa;
            max-height: 70vh;
            position: relative;
            cursor: grab;
        }
        .diagram-wrapper:active {
            cursor: grabbing;
        }
        .diagram-container {
            padding: 25px;
            transform-origin: top left;
            transition: transform 0.2s ease;
            min-width: fit-content;
            min-height: fit-content;
        }
        .diagram-container .mermaid {
            margin-top: 0;
            padding: 0;
            background: transparent;
            border: none;
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

                <div class="zoom-controls">
                    <button class="zoom-btn" onclick="zoomOut()" title="Zoom Out">−</button>
                    <span class="zoom-level" id="zoomLevel">100%</span>
                    <button class="zoom-btn" onclick="zoomIn()" title="Zoom In">+</button>
                    <button class="zoom-btn zoom-btn-reset" onclick="resetZoom()" title="Reset Zoom">Reset</button>
                </div>
            </div>

            <div class="legend">
                <div class="legend-item">
                    <span class="legend-badge legend-pk">PK</span>
                    <span>Primary Key</span>
                </div>
                <div class="legend-item">
                    <span class="legend-badge legend-fk">FK</span>
                    <span>Foreign Key (Reference)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-badge legend-uk">UK</span>
                    <span>Unique Key</span>
                </div>
                <div class="legend-item">
                    <span class="legend-badge legend-embedded">embedded</span>
                    <span>Nested Document</span>
                </div>
                <div class="legend-item">
                    <span class="legend-badge legend-poly">poly</span>
                    <span>Polymorphic Reference</span>
                </div>
                <div class="legend-item">
                    <span class="legend-badge legend-cardinality">N:1</span>
                    <span>Cardinality (1:1, N:1, M:N)</span>
                </div>
            </div>

            <div class="diagram-wrapper" id="diagramWrapper">
                <div class="diagram-container" id="diagramContainer">
                    <div class="mermaid">
${mermaidCode}
                    </div>
                </div>
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
            theme: 'default',
            er: {
                diagramPadding: 20,
                layoutDirection: 'TB',
                minEntityWidth: 100,
                minEntityHeight: 75,
                entityPadding: 15,
                useMaxWidth: true
            },
            securityLevel: 'loose'
        });

        // Copy code to clipboard
        async function copyCode() {
            const code = document.getElementById('mermaidCode').textContent;
            try {
                await navigator.clipboard.writeText(code);
                const toast = document.getElementById('toast');
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                // Fallback
                const textarea = document.createElement('textarea');
                textarea.value = code;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                const toast = document.getElementById('toast');
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            }
        }

        // Toggle code visibility
        function toggleCode() {
            const section = document.getElementById('codeSection');
            section.classList.toggle('show');
        }

        // Toggle sidebar (mobile)
        function toggleSidebar() {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        }

        // Zoom functionality
        let currentZoom = 100;
        const minZoom = 25;
        const maxZoom = 200;
        const zoomStep = 25;

        function updateZoom() {
            const container = document.getElementById('diagramContainer');
            const zoomLabel = document.getElementById('zoomLevel');

            container.style.transform = \`scale(\${currentZoom / 100})\`;
            zoomLabel.textContent = currentZoom + '%';
        }

        function zoomIn() {
            if (currentZoom < maxZoom) {
                currentZoom += zoomStep;
                updateZoom();
            }
        }

        function zoomOut() {
            if (currentZoom > minZoom) {
                currentZoom -= zoomStep;
                updateZoom();
            }
        }

        function resetZoom() {
            currentZoom = 100;
            updateZoom();
        }

        // Mouse wheel zoom support
        document.getElementById('diagramWrapper').addEventListener('wheel', function(e) {
            if (e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    zoomIn();
                } else {
                    zoomOut();
                }
            }
        });

        // Keyboard shortcuts for zoom
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey) {
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

        // Mouse drag to scroll
        const wrapper = document.getElementById('diagramWrapper');
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

        wrapper.addEventListener('mousedown', function(e) {
            isDragging = true;
            startX = e.pageX - wrapper.offsetLeft;
            startY = e.pageY - wrapper.offsetTop;
            scrollLeft = wrapper.scrollLeft;
            scrollTop = wrapper.scrollTop;
        });

        wrapper.addEventListener('mouseleave', function() {
            isDragging = false;
        });

        wrapper.addEventListener('mouseup', function() {
            isDragging = false;
        });

        wrapper.addEventListener('mousemove', function(e) {
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
   * Build sidebar HTML
   * @param {Object} navigation - Navigation data
   * @returns {string} Sidebar HTML
   */
  buildSidebarHTML(navigation) {
    const { allModels, currentModel, isFullDiagram } = navigation;

    if (!allModels || Object.keys(allModels).length === 0) {
      return '';
    }

    let html = `
    <nav class="sidebar">
        <div class="sidebar-header">
            <h2>📦 MongoDB Schemas</h2>
        </div>
        <div class="sidebar-content">
            <div class="sidebar-section-title">Collections</div>`;

    // Add model links
    for (const [modelName, modelInfo] of Object.entries(allModels)) {
      const isCurrent = !isFullDiagram && currentModel === modelName;

      html += `
            <a href="${modelInfo.htmlFile}" class="model-item ${isCurrent ? 'current' : ''}">
                <span class="model-icon">📄</span>
                <span class="model-name">${modelName}</span>
                <span class="model-fields">${modelInfo.fieldCount} fields</span>
            </a>`;
    }

    // Add full ERD link
    html += `
            <div class="sidebar-section">
                <div class="sidebar-section-title">Overview</div>
                <a href="full-erd.html" class="full-erd-link ${isFullDiagram ? 'current' : ''}">
                    <span class="model-icon">🗺️</span>
                    <span>Full Database ERD</span>
                </a>
            </div>
        </div>
    </nav>`;

    return html;
  }

  /**
   * Generate Mermaid Live Editor URL
   * @param {string} mermaidCode - Mermaid code
   * @returns {string} URL
   */
  generateMermaidLiveUrl(mermaidCode) {
    try {
      const state = {
        code: mermaidCode,
        mermaid: { theme: 'default' },
        autoSync: true,
        updateDiagram: true,
      };

      const json = JSON.stringify(state);
      const base64 = Buffer.from(json).toString('base64');
      const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      return `https://mermaid.live/edit#pako:${urlSafe}`;
    } catch (error) {
      return 'https://mermaid.live/';
    }
  }

  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = ERDGenerator;
