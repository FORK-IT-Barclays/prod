import mongoose from 'mongoose';

const transactionRecordSchema = new mongoose.Schema({
  transaction_date: String, // DD/MM/YYYY
  description: String,
  transaction_type: String,
  credit_amount: Number,
  debit_amount: Number,
  balance: Number,
}, { _id: false });

const transactionCollectionSchema = new mongoose.Schema({
  account_id: { type: String, unique: true, required: true },
  transactions: [transactionRecordSchema],
  updated_at: String
}, {
  collection: 'transactions'
});

export const Transaction = mongoose.model('Transaction', transactionCollectionSchema, 'transactions');
