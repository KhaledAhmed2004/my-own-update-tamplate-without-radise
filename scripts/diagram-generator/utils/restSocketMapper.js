/**
 * REST → Socket.IO Mapper Utility
 *
 * REST API endpoints থেকে Socket.IO events পর্যন্ত complete flow trace করে
 * Auto-detection করে কোন REST call কোন Socket event emit করে
 *
 * Flow: Route → Controller → Service → Socket.IO emit
 */

const fs = require('fs');
const path = require('path');
const RouteAnalyzer = require('./routeAnalyzer');
const ControllerTracer = require('./controllerTracer');
const ServiceTracer = require('./serviceTracer');

class RestSocketMapper {
  constructor() {
    this.routeAnalyzer = new RouteAnalyzer();
    this.controllerTracer = new ControllerTracer();
    this.serviceTracer = new ServiceTracer();
  }

  /**
   * একটি module এর সব REST → Socket mappings বের করে
   *
   * @param {string} moduleName - Module name (e.g., 'message', 'chat')
   * @returns {Object} Module mapping with REST endpoints and their Socket events
   */
  buildModuleMapping(moduleName) {
    const moduleAnalysis = this.routeAnalyzer.analyzeModule(moduleName);
    const structure = this.routeAnalyzer.analyzeModuleStructure(moduleName);

    if (moduleAnalysis.error || !moduleAnalysis.routes) {
      return {
        moduleName,
        error: moduleAnalysis.error || 'No routes found',
        endpoints: [],
      };
    }

    const endpoints = [];

    for (const route of moduleAnalysis.routes) {
      const endpointMapping = this.traceEndpoint(
        route,
        structure.controllerFile,
        structure.serviceFile
      );

      if (endpointMapping.socketEvents.length > 0) {
        endpoints.push(endpointMapping);
      }
    }

    return {
      moduleName,
      routeFile: moduleAnalysis.routeFile,
      controllerFile: structure.controllerFile,
      serviceFile: structure.serviceFile,
      endpoints,
      totalEndpoints: moduleAnalysis.routes.length,
      endpointsWithSocket: endpoints.length,
    };
  }

  /**
   * Single endpoint trace করে REST → Controller → Service → Socket
   *
   * @param {Object} route - Route info from RouteAnalyzer
   * @param {string} controllerFile - Controller file path
   * @param {string} serviceFile - Service file path
   * @returns {Object} Complete endpoint mapping
   */
  traceEndpoint(route, controllerFile, serviceFile) {
    const mapping = {
      method: route.method,
      path: route.path,
      lineNumber: route.lineNumber,
      middlewareChain: route.middlewareChain || [],
      controller: null,
      service: null,
      socketEvents: [],
      flow: [],
    };

    // Find controller method from middleware chain
    const controllerMiddleware = route.middlewareChain?.find(
      m => m.name === 'controller'
    );

    if (!controllerMiddleware) {
      return mapping;
    }

    mapping.controller = {
      name: controllerMiddleware.controller,
      method: controllerMiddleware.method,
    };

    // Add to flow
    mapping.flow.push({
      type: 'controller',
      name: `${controllerMiddleware.controller}.${controllerMiddleware.method}`,
    });

    // Trace controller
    if (controllerFile) {
      const controllerTrace = this.controllerTracer.traceMethod(
        controllerFile,
        controllerMiddleware.method
      );

      if (controllerTrace && controllerTrace.serviceCalls.length > 0) {
        const serviceCall = controllerTrace.serviceCalls[0];
        mapping.service = {
          name: serviceCall.serviceName,
          method: serviceCall.methodName,
        };

        // Add to flow
        mapping.flow.push({
          type: 'service',
          name: `${serviceCall.serviceName}.${serviceCall.methodName}`,
        });

        // Trace service for Socket.IO events
        if (serviceFile) {
          const serviceTrace = this.serviceTracer.traceMethod(
            serviceFile,
            serviceCall.methodName
          );

          if (serviceTrace && serviceTrace.socketEvents) {
            mapping.socketEvents = serviceTrace.socketEvents;

            // Add socket events to flow
            serviceTrace.socketEvents.forEach(event => {
              mapping.flow.push({
                type: 'socket',
                event: event.event,
                emitType: event.type,
                room: event.room || null,
                target: event.target || null,
              });
            });
          }

          // Also capture model operations for diagram
          if (serviceTrace && serviceTrace.modelOperations) {
            mapping.modelOperations = serviceTrace.modelOperations;
          }

          // Capture helper calls
          if (serviceTrace && serviceTrace.helperCalls) {
            mapping.helperCalls = serviceTrace.helperCalls;
          }
        }
      }
    }

    return mapping;
  }

  /**
   * সমস্ত modules থেকে REST → Socket mapping বের করে
   *
   * @returns {Array} All module mappings
   */
  buildFullMapping() {
    const modules = this.routeAnalyzer.getAllModules();
    const mappings = [];

    for (const moduleName of modules) {
      const moduleMapping = this.buildModuleMapping(moduleName);
      if (moduleMapping.endpointsWithSocket > 0) {
        mappings.push(moduleMapping);
      }
    }

    return {
      totalModules: modules.length,
      modulesWithSocket: mappings.length,
      mappings,
      summary: this.generateSummary(mappings),
    };
  }

  /**
   * Summary generate করে
   */
  generateSummary(mappings) {
    const summary = {
      totalEndpointsWithSocket: 0,
      eventTypes: {
        'room-emit': 0,
        'user-emit': 0,
        broadcast: 0,
      },
      uniqueEvents: new Set(),
      uniqueRooms: new Set(),
    };

    for (const moduleMapping of mappings) {
      summary.totalEndpointsWithSocket += moduleMapping.endpointsWithSocket;

      for (const endpoint of moduleMapping.endpoints) {
        for (const event of endpoint.socketEvents) {
          summary.eventTypes[event.type] =
            (summary.eventTypes[event.type] || 0) + 1;
          summary.uniqueEvents.add(event.event);

          if (event.room) {
            summary.uniqueRooms.add(event.room);
          }
        }
      }
    }

    // Convert Sets to arrays for JSON serialization
    summary.uniqueEvents = [...summary.uniqueEvents];
    summary.uniqueRooms = [...summary.uniqueRooms];

    return summary;
  }

  /**
   * Specific endpoint খুঁজে বের করে by method and path
   *
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} urlPath - URL path
   * @returns {Object|null} Endpoint mapping
   */
  findEndpointMapping(method, urlPath) {
    const moduleName = this.routeAnalyzer.guessModuleFromPath(urlPath);
    if (!moduleName) return null;

    const moduleMapping = this.buildModuleMapping(moduleName);
    return (
      moduleMapping.endpoints.find(
        e =>
          e.method.toUpperCase() === method.toUpperCase() && e.path === urlPath
      ) || null
    );
  }

  /**
   * Socket event থেকে reverse lookup - কোন REST endpoints এই event emit করে
   *
   * @param {string} eventName - Socket.IO event name
   * @returns {Array} List of endpoints that emit this event
   */
  findEndpointsByEvent(eventName) {
    const fullMapping = this.buildFullMapping();
    const results = [];

    for (const moduleMapping of fullMapping.mappings) {
      for (const endpoint of moduleMapping.endpoints) {
        const hasEvent = endpoint.socketEvents.some(
          e => e.event === eventName
        );
        if (hasEvent) {
          results.push({
            module: moduleMapping.moduleName,
            method: endpoint.method,
            path: endpoint.path,
            controller: endpoint.controller,
            service: endpoint.service,
          });
        }
      }
    }

    return results;
  }

  /**
   * Print CLI-friendly mapping summary
   */
  printMappingSummary() {
    const fullMapping = this.buildFullMapping();

    console.log('\n📊 REST → Socket.IO Mapping Summary');
    console.log('═'.repeat(60));

    for (const moduleMapping of fullMapping.mappings) {
      console.log(`\n📦 Module: ${moduleMapping.moduleName}`);
      console.log(`   Endpoints with Socket: ${moduleMapping.endpointsWithSocket}/${moduleMapping.totalEndpoints}`);

      for (const endpoint of moduleMapping.endpoints) {
        console.log(`\n   🌐 ${endpoint.method} ${endpoint.path}`);
        console.log(`      → ${endpoint.controller?.name}.${endpoint.controller?.method}()`);
        console.log(`      → ${endpoint.service?.name}.${endpoint.service?.method}()`);

        for (const event of endpoint.socketEvents) {
          const targetInfo = event.room
            ? `to room: ${event.room}`
            : event.target
              ? `to user: ${event.target}`
              : 'broadcast';
          console.log(`      🔌 emit('${event.event}') [${event.type}] ${targetInfo}`);
        }
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('Summary:');
    console.log(`  Total endpoints with Socket.IO: ${fullMapping.summary.totalEndpointsWithSocket}`);
    console.log(`  Unique events: ${fullMapping.summary.uniqueEvents.join(', ')}`);
    console.log(`  Event types: room-emit(${fullMapping.summary.eventTypes['room-emit']}), user-emit(${fullMapping.summary.eventTypes['user-emit']}), broadcast(${fullMapping.summary.eventTypes['broadcast']})`);

    return fullMapping;
  }
}

module.exports = RestSocketMapper;
