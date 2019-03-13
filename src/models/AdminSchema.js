import mongoose from 'mongoose';

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const saltRounds = 10;
 
const AdminModel = new Schema({
  mobile_number: String,
  email: String,
  password: String,
  createdTs: { type: Date, default: Date.now },
  stellarAddress: String,
  stellarSeed: String,
  stripeKey: String,
  stripeKeyPk: String,
  sellRate: String,
  sellTransactionFee: String,
  buyRate: String,
  buyTransactionFee: String,
  sendTransactionFee: String,
  depositFee: String,
  termsAndConditions: String
});


export const Admin = mongoose.model('admin', AdminModel);