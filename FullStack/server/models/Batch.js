import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
    batchId: { type: String, required: true, unique: true },
    runAt: { type: Date, required: true },
    accountsProcessed: { type: Number, default: 0 },
    batchSize: { type: Number, default: 5000 },
    status: {
        type: String,
        enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
        default: 'PENDING',
    },
    nextScheduledRun: { type: Date },
    errorMessage: { type: String },
}, {
    timestamps: true,
    collection: 'batches',
});

batchSchema.index({ runAt: -1 });
batchSchema.index({ status: 1 });

const Batch = mongoose.model('Batch', batchSchema);
export default Batch;
