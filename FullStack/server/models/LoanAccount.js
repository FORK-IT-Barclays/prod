import mongoose from 'mongoose';

const interventionSchema = new mongoose.Schema({
    date: { type: String },
    type: { type: String },
    outcome: { type: String },
}, { _id: false });

const loanAccountSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },          // e.g. "VEC-9021"
    loanAccountId: { type: String, required: true, unique: true }, // e.g. "LA-9021"
    name: { type: String, required: true },
    accountType: { type: String, default: 'loan' },
    risk: { type: Number, required: true },
    riskChange: { type: String },
    velocity: { type: Number },
    accel: { type: Number },
    balance: { type: String },
    signals: { type: Map, of: Number },
    diagnosis: { type: String },
    tier: { type: String, enum: ['Tier 1', 'Tier 2', 'Tier 3'] },
    lastPayment: { type: String },
    openedDate: { type: String },
    history: [Number],
    interventions: [interventionSchema],
    lastProcessedBatchId: { type: String },
}, {
    timestamps: true,
    collection: 'loan_accounts',
});

// Indexes for fast queries
loanAccountSchema.index({ tier: 1 });
loanAccountSchema.index({ risk: -1 });
loanAccountSchema.index({ diagnosis: 1 });
loanAccountSchema.index({ name: 'text' });

const LoanAccount = mongoose.model('LoanAccount', loanAccountSchema);
export default LoanAccount;
