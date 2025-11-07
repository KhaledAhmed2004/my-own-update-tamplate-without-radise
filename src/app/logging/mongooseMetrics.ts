import mongoose, { Schema } from 'mongoose';
import { recordDbQuery } from './requestContext';
import { trace, SpanStatusCode } from '@opentelemetry/api';

function getModelName(self: any): string | undefined {
  return (
    self?.model?.modelName ||
    self?.constructor?.modelName ||
    self?._model?.modelName ||
    self?.modelName ||
    undefined
  );
}

const preStart = (op: string) =>
  function (this: any, next: (err?: any) => void) {
    this.__metricsStart = Date.now();
    this.__metricsOp = op;
    try {
      const tracer = trace.getTracer('app');
      const model = getModelName(this) || 'UnknownModel';
      const span = tracer.startSpan(`🗄️  Database: ${model}.${op}`);
      this.__otelSpan = span;
    } catch {}
    next();
  };

const postEnd = (op: string) =>
  async function (this: any, _res: any, next: (err?: any) => void) {
    const start = this.__metricsStart || Date.now();
    const dur = Date.now() - start;
    const model = getModelName(this);
    // Capture aggregate pipeline summary when applicable
    let pipeline: string | undefined;
    if (op === 'aggregate' && typeof this?.pipeline === 'function') {
      try {
        const pl = this.pipeline();
        if (Array.isArray(pl)) pipeline = summarizePipeline(pl);
      } catch {}
    }
    // Derive nReturned for common ops from the result
    let nReturned: number | undefined;
    try {
      if (op === 'find' && Array.isArray(_res)) {
        nReturned = _res.length;
      } else if (op === 'findOne') {
        nReturned = _res ? 1 : 0;
      } else if (op === 'countDocuments' && typeof _res === 'number') {
        nReturned = _res;
      } else if (op === 'aggregate' && Array.isArray(_res)) {
        nReturned = _res.length;
      } else if (op === 'save') {
        nReturned = 1;
      }
    } catch {}
    // Try explain('executionStats') via native driver for accurate metrics
    let docsExamined: number | undefined;
    let indexUsed: string | undefined;
    let executionStage: string | undefined;
    try {
      const coll = this?.model?.collection;
      const filter = (typeof (this as any).getFilter === 'function' ? (this as any).getFilter() : (this as any)._conditions) || {};
      let exp: any;
      if (coll) {
        if (op === 'find') {
          exp = await coll.find(filter as any).explain('executionStats');
        } else if (op === 'findOne') {
          exp = await coll.find(filter as any).limit(1).explain('executionStats');
        } else if (op === 'countDocuments') {
          // For count, use a find explain to observe scan behavior
          exp = await coll.find(filter as any).explain('executionStats');
        } else if (op === 'aggregate' && typeof this?.pipeline === 'function') {
          const pl = this.pipeline();
          exp = await coll.aggregate(pl as any).explain('executionStats');
        } else if (op === 'updateOne' || op === 'updateMany' || op === 'deleteOne' || op === 'deleteMany' || op === 'findOneAndUpdate') {
          // Use find explain for write filters to infer index usage
          exp = await coll.find(filter as any).limit(op === 'updateMany' || op === 'deleteMany' ? 0 : 1).explain('executionStats');
        }
      }
      if (exp) {
        const stats = extractExplainStats(exp);
        docsExamined = stats.docsExamined;
        indexUsed = stats.indexUsed;
        executionStage = stats.executionStage;
        if (nReturned === undefined && typeof stats.nReturned === 'number') {
          nReturned = stats.nReturned;
        }
      }
    } catch {}
    // Index suggestion (basic): if COLLSCAN or docsExamined >> nReturned
    let suggestion: string | undefined;
    try {
      const conds = (this as any)._conditions || (typeof (this as any).getFilter === 'function' ? (this as any).getFilter() : undefined);
      const keys = conds && typeof conds === 'object' ? Object.keys(conds) : [];
      const idxFields = keys.slice(0, 3).map(k => `${k}: 1`).join(', ');
      const efficiency = nReturned && docsExamined ? `${docsExamined}:${nReturned}` : undefined;
      if (!indexUsed || indexUsed === 'NO_INDEX' || (docsExamined && nReturned && docsExamined > nReturned * 50)) {
        suggestion = idxFields ? `Create compound index on { ${idxFields} }` : undefined;
      }
      // Attach attributes to OTel span
      if (this.__otelSpan) {
        try {
          this.__otelSpan.setAttribute('db.model', model || 'unknown');
          this.__otelSpan.setAttribute('db.operation', op);
          if (pipeline) this.__otelSpan.setAttribute('db.pipeline', pipeline);
          if (typeof nReturned === 'number') this.__otelSpan.setAttribute('db.n_returned', nReturned);
          if (typeof docsExamined === 'number') this.__otelSpan.setAttribute('db.docs_examined', docsExamined);
          if (indexUsed) this.__otelSpan.setAttribute('db.index_used', indexUsed);
          if (executionStage) this.__otelSpan.setAttribute('db.execution_stage', executionStage);
          if (efficiency) this.__otelSpan.setAttribute('db.scan_efficiency', efficiency);
          if (suggestion) this.__otelSpan.setAttribute('db.index_suggestion', suggestion);
          this.__otelSpan.end();
        } catch {}
      }
    } catch {}

    recordDbQuery(dur, { model, operation: op, cacheHit: false, pipeline, nReturned, docsExamined, indexUsed, executionStage, suggestion });
    next();
  };

// Create a compact, human-readable summary of an aggregation pipeline
function summarizePipeline(pipeline: any[]): string {
  const parts: string[] = [];
  for (const stage of pipeline) {
    const key = stage && typeof stage === 'object' ? Object.keys(stage)[0] : undefined;
    if (!key) continue;
    const val = (stage as any)[key];
    switch (key) {
      case '$match': {
        const conds = val && typeof val === 'object' ? Object.keys(val) : [];
        const firstKey = conds[0];
        let display = `$match`;
        if (firstKey) {
          const v = val[firstKey];
          const repr = typeof v === 'object' ? JSON.stringify(v) : String(v);
          display = `$match(${firstKey}=${repr})`;
        }
        parts.push(display);
        break;
      }
      case '$group': {
        const idVal = val?._id !== undefined ? val._id : undefined;
        const idRepr = idVal !== undefined ? String(idVal) : undefined;
        parts.push(idRepr ? `$group(_id='${idRepr}')` : `$group`);
        break;
      }
      case '$sort': {
        const keys = val && typeof val === 'object' ? Object.keys(val) : [];
        parts.push(keys.length ? `$sort(${keys.join(',')})` : `$sort`);
        break;
      }
      case '$project': {
        const keys = val && typeof val === 'object' ? Object.keys(val) : [];
        parts.push(keys.length ? `$project(${keys.length} fields)` : `$project`);
        break;
      }
      case '$lookup': {
        const from = val?.from ? String(val.from) : undefined;
        parts.push(from ? `$lookup(from='${from}')` : `$lookup`);
        break;
      }
      default:
        parts.push(key);
    }
  }
  return parts.join(' → ');
}

// Extract docs examined, nReturned, index name, and execution stage from MongoDB explain output
function extractExplainStats(exp: any): {
  docsExamined?: number;
  nReturned?: number;
  indexUsed?: string;
  executionStage?: string;
} {
  if (!exp || typeof exp !== 'object') return {};
  const es = exp.executionStats || {};
  const qp = exp.queryPlanner || {};
  // Prefer top-level totals, but fall back to nested executionStages chain
  const deepDocs = es.executionStages?.docsExamined
    ?? es.executionStages?.totalDocsExamined
    ?? es.executionStages?.inputStage?.docsExamined
    ?? es.executionStages?.inputStage?.inputStage?.docsExamined;
  const totalDocsExamined = es.totalDocsExamined ?? es.docsExamined ?? deepDocs;
  const nReturned = es.nReturned;
  const winning = qp.winningPlan || {};
  const stage = winning.stage || winning.inputStage?.stage || winning.inputStage?.inputStage?.stage || es.executionStages?.stage || es.executionStages?.inputStage?.stage;
  const input = winning.inputStage || {};
  const indexName = input.indexName || input.inputStage?.indexName || winning.indexName || es.executionStages?.indexName || es.executionStages?.inputStage?.indexName;
  let executionStage = typeof stage === 'string' ? stage : undefined;
  let indexUsed: string | undefined = undefined;
  if (executionStage && executionStage.toUpperCase().includes('COLLSCAN')) {
    indexUsed = 'NO_INDEX';
    executionStage = 'COLLSCAN (Full Collection Scan)';
  } else if (executionStage && executionStage.toUpperCase().includes('IXSCAN')) {
    indexUsed = indexName ? String(indexName) : 'INDEX';
    executionStage = 'IXSCAN (Indexed Scan)';
  } else if (indexName) {
    indexUsed = String(indexName);
  }
  return {
    docsExamined: typeof totalDocsExamined === 'number' ? totalDocsExamined : undefined,
    nReturned: typeof nReturned === 'number' ? nReturned : undefined,
    indexUsed,
    executionStage,
  };
}

export function registerMongooseMetricsPlugin() {
  const plugin = (schema: Schema) => {
    // Query operations
    schema.pre('find', preStart('find'));
    schema.post('find', postEnd('find'));
    schema.pre('findOne', preStart('findOne'));
    schema.post('findOne', postEnd('findOne'));
    schema.pre('countDocuments', preStart('countDocuments'));
    schema.post('countDocuments', postEnd('countDocuments'));
    schema.pre('estimatedDocumentCount', preStart('estimatedDocumentCount'));
    schema.post('estimatedDocumentCount', postEnd('estimatedDocumentCount'));
    schema.pre('findOneAndUpdate', preStart('findOneAndUpdate'));
    schema.post('findOneAndUpdate', postEnd('findOneAndUpdate'));
    schema.pre('updateOne', preStart('updateOne'));
    schema.post('updateOne', postEnd('updateOne'));
    schema.pre('updateMany', preStart('updateMany'));
    schema.post('updateMany', postEnd('updateMany'));
    schema.pre('deleteOne', preStart('deleteOne'));
    schema.post('deleteOne', postEnd('deleteOne'));
    schema.pre('deleteMany', preStart('deleteMany'));
    schema.post('deleteMany', postEnd('deleteMany'));

    // Error handlers for query ops (record even if failed)
    schema.post('updateOne', function (this: any, err: any, _res: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'updateOne', cacheHit: false });
        if (this.__otelSpan) {
          try {
            this.__otelSpan.recordException(err);
            this.__otelSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err?.message || err) });
            this.__otelSpan.end();
          } catch {}
        }
      }
      next(err);
    });
    schema.post('updateMany', function (this: any, err: any, _res: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'updateMany', cacheHit: false });
        if (this.__otelSpan) {
          try {
            this.__otelSpan.recordException(err);
            this.__otelSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err?.message || err) });
            this.__otelSpan.end();
          } catch {}
        }
      }
      next(err);
    });
    schema.post('findOneAndUpdate', function (this: any, err: any, _res: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'findOneAndUpdate', cacheHit: false });
        if (this.__otelSpan) {
          try {
            this.__otelSpan.recordException(err);
            this.__otelSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err?.message || err) });
            this.__otelSpan.end();
          } catch {}
        }
      }
      next(err);
    });
    schema.post('deleteOne', function (this: any, err: any, _res: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'deleteOne', cacheHit: false });
        if (this.__otelSpan) {
          try {
            this.__otelSpan.recordException(err);
            this.__otelSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err?.message || err) });
            this.__otelSpan.end();
          } catch {}
        }
      }
      next(err);
    });
    schema.post('deleteMany', function (this: any, err: any, _res: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'deleteMany', cacheHit: false });
        if (this.__otelSpan) {
          try {
            this.__otelSpan.recordException(err);
            this.__otelSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err?.message || err) });
            this.__otelSpan.end();
          } catch {}
        }
      }
      next(err);
    });

    // Aggregation
    schema.pre('aggregate', preStart('aggregate'));
    schema.post('aggregate', postEnd('aggregate'));
    schema.post('aggregate', function (this: any, err: any, _res: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        let pipeline: string | undefined;
        try {
          const pl = typeof this?.pipeline === 'function' ? this.pipeline() : undefined;
          if (Array.isArray(pl)) pipeline = summarizePipeline(pl);
        } catch {}
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'aggregate', cacheHit: false, pipeline });
      }
      next(err);
    });

    // Document operations (covers create/save)
    schema.pre('save', preStart('save'));
    schema.post('save', function (this: any, _doc: any, next: (err?: any) => void) {
      const start = this.__metricsStart || Date.now();
      const dur = Date.now() - start;
      const model = getModelName(this);
      recordDbQuery(dur, { model, operation: 'save', cacheHit: false });
      next();
    });
    schema.post('save', function (this: any, err: any, _doc: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'save', cacheHit: false });
      }
      next(err);
    });
  };

  mongoose.plugin(plugin);
}

// Auto-register on import
registerMongooseMetricsPlugin();