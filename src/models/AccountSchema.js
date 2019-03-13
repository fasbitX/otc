import mongoose from 'mongoose';

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
 
const AccountModel = new Schema({
    firstName: String,
    lastName: String,
    line1: String,
    line2: String,
    state: String,
    city: String,
    mobile_number: String,
    ssn: String,
    day: String,
    month: String,
    year: String,
    verificationFile: String,
    postalCode: String,
    accountNumber: String,
    accountHolder: String,
    routingNumber: String,
    phoneNumber: String,
    user: { type: ObjectId, ref: 'user' },
    createdTs: { type: Date, default: Date.now }
});

export const Account = mongoose.model('account', AccountModel);