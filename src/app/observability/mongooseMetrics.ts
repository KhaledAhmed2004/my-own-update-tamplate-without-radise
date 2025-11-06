import mongoose, { Schema } from 'mongoose';
import { recordDbQuery } from '../middlewares/requestContext';

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
    next();
  };

const postEnd = (op: string) =>
  function (this: any, _res: any, next: (err?: any) => void) {
    const start = this.__metricsStart || Date.now();
    const dur = Date.now() - start;
    const model = getModelName(this);
    recordDbQuery(dur, { model, operation: op, cacheHit: false });
    next();
  };

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
      }
      next(err);
    });
    schema.post('updateMany', function (this: any, err: any, _res: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'updateMany', cacheHit: false });
      }
      next(err);
    });
    schema.post('findOneAndUpdate', function (this: any, err: any, _res: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'findOneAndUpdate', cacheHit: false });
      }
      next(err);
    });
    schema.post('deleteOne', function (this: any, err: any, _res: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'deleteOne', cacheHit: false });
      }
      next(err);
    });
    schema.post('deleteMany', function (this: any, err: any, _res: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'deleteMany', cacheHit: false });
      }
      next(err);
    });

    // Aggregation
    schema.pre('aggregate', preStart('aggregate'));
    schema.post('aggregate', postEnd('aggregate'));
    schema.post('aggregate', function (this: any, err: any, _res: any, next: (err?: any) => void) {
      if (err) {
        const start = this.__metricsStart || Date.now();
        recordDbQuery(Date.now() - start, { model: getModelName(this), operation: 'aggregate', cacheHit: false });
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