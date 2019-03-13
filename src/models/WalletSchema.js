import mongoose from 'mongoose';

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
 
const WalletModel = new Schema({
    user_id: { type: ObjectId, ref: 'user' },
    coin_name: String,
    balance: String,
    createdTs: { type: Date, default: Date.now }
});

export const Wallet = mongoose.model('wallet', WalletModel);