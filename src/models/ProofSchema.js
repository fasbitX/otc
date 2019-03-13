import mongoose from 'mongoose';

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
 
const ProofModel = new Schema({
    addressProof: String,
    idProof: String,
    photoProof: String,  
    user: { type: ObjectId, ref: 'user' },
    createdTs: { type: Date, default: Date.now }
});

export const Proof = mongoose.model('proof', ProofModel);