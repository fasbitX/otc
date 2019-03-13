import mongoose from 'mongoose';

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
 
const CardModel = new Schema({
    number: 'String',
    expiry: 'String',
    holder: 'String',
    type: 'String',
    user: { type: ObjectId, ref: 'user' },
    createdTs: { type: Date, default: Date.now }
});

export const Card = mongoose.model('card', CardModel);