import mongoose from 'mongoose';

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const saltRounds = 10;
 
const UserModel = new Schema({
  firstName: String,
  lastName: String,
  email: String,
  dob: String,
  code: String,
  mobile_number: String,
  password: String,
  postal: Number,
  address: String,
  image: String,
  proofs: { type: ObjectId, ref: 'proof' },
  stellarAddress: String,
  stellarSeed: String,
  otp: String,
  createdTs: { type: Date, default: Date.now }
});


export const User = mongoose.model('user', UserModel);