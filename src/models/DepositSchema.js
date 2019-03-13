import mongoose from 'mongoose';

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const saltRounds = 10;
 
const depositModel = new Schema({
    user: { type: ObjectId, ref: 'user' },
    currency: { type: String, enum: ['usd', 'xlm'] },
    amount: String,
    cardNumber: String,
    fee: String,
    transactionID: String,
    type :  String,
    createdTs: { type: Date, default: Date.now },
});

export const Deposit = mongoose.model('deposit', depositModel);