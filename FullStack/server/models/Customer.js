import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  annual_inc: Number,
  loan_amnt: Number,
  term_months: Number,
  dti: Number,
  open_acc: Number,
  total_acc: Number,
  revol_bal: Number,
  revol_util: Number,
  delinq_2yrs: Number,
  pub_rec: Number,
  inq_last_6mths: Number,
  installment: Number,
}, { _id: false });

const predictionSchema = new mongoose.Schema({
  calculated_at: String, // Stored as ISO string
  status: String,
  final_risk_score: Number,
  historian_score: Number,
  behavioral_score: Number,
}, { _id: false });

const customerSchema = new mongoose.Schema({
  account_id: { type: String, unique: true, required: true },
  profile: profileSchema,
  latest_prediction: predictionSchema,
  risk_history: [predictionSchema],
  updated_at: String
}, {
  collection: 'customers'
});

export const Customer = mongoose.model('Customer', customerSchema, 'customers');
